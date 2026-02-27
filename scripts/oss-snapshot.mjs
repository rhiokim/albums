import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const args = { sbomPath: "", outDir: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!value) continue;
    if (key === "--sbom") args.sbomPath = value;
    if (key === "--out") args.outDir = value;
  }
  if (!args.sbomPath || !args.outDir) {
    throw new Error(
      "Usage: node scripts/oss-snapshot.mjs --sbom <sbom.cdx.json> --out <outDir>",
    );
  }
  return args;
}

async function run(cmd, args, opts = {}) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { ...opts, encoding: "utf8" });
    return (stdout ?? "").trim();
  } catch {
    return "";
  }
}

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[\",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function npmPurlFromNameVersion(name, version) {
  if (!name || !version) return "";
  // purl for npm uses %40 for scope
  const normalizedName = name.startsWith("@") ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${normalizedName}@${version}`;
}

function toIsoZ(input) {
  if (!input) return "";
  // github.run_started_at is already ISO; normalize to Z if needed
  if (input.endsWith("Z")) return input;
  return input;
}

function collectDeclaredDeps(packageJsonObjects) {
  const runtime = new Set();
  const dev = new Set();
  for (const pkg of packageJsonObjects) {
    const deps = pkg?.dependencies ?? {};
    const optional = pkg?.optionalDependencies ?? {};
    const peer = pkg?.peerDependencies ?? {};
    const devDeps = pkg?.devDependencies ?? {};
    for (const name of Object.keys(deps)) runtime.add(name);
    for (const name of Object.keys(optional)) runtime.add(name);
    for (const name of Object.keys(peer)) runtime.add(name);
    for (const name of Object.keys(devDeps)) dev.add(name);
  }
  // runtime wins
  for (const name of runtime) dev.delete(name);
  return { runtime, dev };
}

function findBomRef(component) {
  return component?.["bom-ref"] || component?.bomRef || component?.purl || "";
}

function buildAdjacency(sbom) {
  const adj = new Map();
  const deps = Array.isArray(sbom?.dependencies) ? sbom.dependencies : [];
  for (const d of deps) {
    const from = d?.ref;
    const toList = Array.isArray(d?.dependsOn) ? d.dependsOn : [];
    if (!from) continue;
    adj.set(from, toList.filter(Boolean));
  }
  return adj;
}

function bfsScopes({ directRuntimeRefs, directDevRefs, adjacency }) {
  const scopeByRef = new Map(); // ref -> runtime|dev
  const queue = [];

  for (const ref of directRuntimeRefs) {
    if (!ref) continue;
    scopeByRef.set(ref, "runtime");
    queue.push(ref);
  }
  for (const ref of directDevRefs) {
    if (!ref) continue;
    if (!scopeByRef.has(ref)) {
      scopeByRef.set(ref, "dev");
      queue.push(ref);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    const currentScope = scopeByRef.get(current);
    const next = adjacency.get(current) || [];
    for (const child of next) {
      const prev = scopeByRef.get(child);
      if (!prev) {
        scopeByRef.set(child, currentScope);
        queue.push(child);
        continue;
      }
      if (prev === "dev" && currentScope === "runtime") {
        scopeByRef.set(child, "runtime");
        queue.push(child);
      }
    }
  }

  return scopeByRef;
}

function pickRootRef(sbom) {
  const meta = sbom?.metadata;
  const comp = meta?.component;
  const ref = findBomRef(comp);
  return ref || "";
}

function normalizeComponents(sbom) {
  const components = Array.isArray(sbom?.components) ? sbom.components : [];
  const byRef = new Map(); // ref -> component
  const byName = new Map(); // name -> [ref]
  for (const c of components) {
    const ref = findBomRef(c);
    if (!ref) continue;
    byRef.set(ref, c);
    const name = c?.name || "";
    if (!name) continue;
    const list = byName.get(name) || [];
    list.push(ref);
    byName.set(name, list);
  }
  return { byRef, byName, components };
}

async function main() {
  const { sbomPath, outDir } = parseArgs(process.argv);
  await mkdir(outDir, { recursive: true });

  const sbomBuffer = await readFile(sbomPath);
  const sbomSha256 = sha256Hex(sbomBuffer);
  await writeFile(path.join(outDir, "sbom_digest_v01.txt"), `${sbomSha256}\n`, "utf8");

  const sbom = JSON.parse(sbomBuffer.toString("utf8"));

  const repoFullName = process.env.GITHUB_REPOSITORY || (await run("git", ["remote", "get-url", "origin"]));
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const repoUrl =
    process.env.GITHUB_REPOSITORY && process.env.GITHUB_SERVER_URL
      ? `${serverUrl}/${process.env.GITHUB_REPOSITORY}`
      : await run("git", ["remote", "get-url", "origin"]);

  const commitSha = process.env.GITHUB_SHA || (await run("git", ["rev-parse", "HEAD"]));
  const commitTimestamp = (await run("git", ["show", "-s", "--format=%cI", commitSha])) || "";
  const capturedAt = toIsoZ(process.env.CAPTURED_AT) || new Date().toISOString();
  const snapshotId = `${repoUrl}@${commitSha}`;

  // Load tracked package.json files (supports mono-repo without scanning node_modules)
  const trackedFiles = (await run("git", ["ls-files"])).split("\n").filter(Boolean);
  const packageJsonPaths = trackedFiles.filter((p) => p === "package.json" || p.endsWith("/package.json"));
  const packageJsonObjects = [];
  for (const p of packageJsonPaths) {
    try {
      const text = await readFile(p, "utf8");
      packageJsonObjects.push(JSON.parse(text));
    } catch {
      // ignore
    }
  }
  const declared = collectDeclaredDeps(packageJsonObjects);

  const adjacency = buildAdjacency(sbom);
  const { byRef, byName, components } = normalizeComponents(sbom);
  const rootRef = pickRootRef(sbom);

  // Determine direct deps using rootRef->dependsOn if available, else best-effort by name matching.
  const directRefsFromRoot = rootRef ? adjacency.get(rootRef) || [] : [];
  const directRuntimeRefs = new Set();
  const directDevRefs = new Set();

  if (directRefsFromRoot.length > 0) {
    for (const ref of directRefsFromRoot) {
      const c = byRef.get(ref);
      const name = c?.name || "";
      if (declared.runtime.has(name)) directRuntimeRefs.add(ref);
      else if (declared.dev.has(name)) directDevRefs.add(ref);
      else directRuntimeRefs.add(ref); // default: treat as runtime when unknown
    }
  } else {
    for (const name of declared.runtime) {
      const refs = byName.get(name) || [];
      if (refs[0]) directRuntimeRefs.add(refs[0]);
    }
    for (const name of declared.dev) {
      const refs = byName.get(name) || [];
      if (refs[0] && !directRuntimeRefs.has(refs[0])) directDevRefs.add(refs[0]);
    }
  }

  const scopeByRef = bfsScopes({
    directRuntimeRefs,
    directDevRefs,
    adjacency,
  });

  // Inventory CSV
  const inventoryRows = [];
  for (const c of components) {
    const ref = findBomRef(c);
    const name = c?.name || "";
    const version = c?.version || "";
    if (!name || !version) continue;

    const purl = c?.purl || npmPurlFromNameVersion(name, version);
    if (!purl) continue;

    const directness =
      directRuntimeRefs.has(ref) || directDevRefs.has(ref) || declared.runtime.has(name) || declared.dev.has(name)
        ? "direct"
        : "indirect";

    const scope = scopeByRef.get(ref) || (declared.dev.has(name) ? "dev" : "runtime");

    inventoryRows.push({ purl, name, version, scope, directness });
  }

  inventoryRows.sort((a, b) => a.purl.localeCompare(b.purl));
  const inventoryCsvLines = [
    ["purl", "name", "version", "scope", "directness"].join(","),
    ...inventoryRows.map((r) =>
      [r.purl, r.name, r.version, r.scope, r.directness].map(escapeCsv).join(","),
    ),
  ];
  await writeFile(path.join(outDir, "dependency_inventory_purl_v01.csv"), inventoryCsvLines.join("\n") + "\n", "utf8");

  // Graph JSON
  const nodeByRef = new Map();
  for (const c of components) {
    const ref = findBomRef(c);
    if (!ref) continue;
    const name = c?.name || "";
    const version = c?.version || "";
    if (!name || !version) continue;
    const purl = c?.purl || npmPurlFromNameVersion(name, version);
    if (!purl) continue;
    nodeByRef.set(ref, {
      id: ref,
      name,
      version,
      purl,
      scope: scopeByRef.get(ref) || (declared.dev.has(name) ? "dev" : "runtime"),
      directness: directRuntimeRefs.has(ref) || directDevRefs.has(ref) ? "direct" : "indirect",
    });
  }

  const edges = [];
  for (const [from, toList] of adjacency.entries()) {
    for (const to of toList) {
      if (!nodeByRef.has(from) || !nodeByRef.has(to)) continue;
      edges.push({ from, to });
    }
  }

  const rootNodeId = rootRef && nodeByRef.has(rootRef) ? rootRef : "root";
  const rootNode =
    rootNodeId === "root"
      ? { id: "root", name: repoFullName, version: "", purl: "", scope: "runtime", directness: "direct" }
      : nodeByRef.get(rootNodeId);

  const rootEdges = [];
  for (const ref of [...directRuntimeRefs, ...directDevRefs]) {
    if (!ref || !nodeByRef.has(ref)) continue;
    rootEdges.push({ from: rootNodeId, to: ref });
  }

  const graph = {
    snapshot_id: snapshotId,
    generated_at: capturedAt,
    nodes: [rootNode, ...nodeByRef.values()],
    edges: [...rootEdges, ...edges],
  };
  await writeFile(path.join(outDir, "dependency_graph_v01.json"), JSON.stringify(graph, null, 2) + "\n", "utf8");

  // Toolchain + runner + run metadata
  const pnpmVersion = await run("pnpm", ["--version"]);
  const syftVersionRaw = await run("syft", ["version"]);

  const toolchain = {
    node: process.version.replace(/^v/, ""),
    pnpm: pnpmVersion,
    syft: syftVersionRaw,
  };
  await writeFile(path.join(outDir, "toolchain_versions_v01.json"), JSON.stringify(toolchain, null, 2) + "\n", "utf8");

  const runnerFingerprint = {
    os: process.env.RUNNER_OS || process.platform,
    arch: process.env.RUNNER_ARCH || process.arch,
    image: process.env.ImageOS || "",
  };
  await writeFile(
    path.join(outDir, "runner_fingerprint_v01.json"),
    JSON.stringify(runnerFingerprint, null, 2) + "\n",
    "utf8",
  );

  const runMetadata = {
    provider: "github-actions",
    workflow: process.env.GITHUB_WORKFLOW || "",
    run_id: process.env.GITHUB_RUN_ID || "",
    run_number: process.env.GITHUB_RUN_NUMBER || "",
    run_attempt: process.env.GITHUB_RUN_ATTEMPT || "",
    ref_name: process.env.GITHUB_REF_NAME || "",
    repository: process.env.GITHUB_REPOSITORY || "",
    actor: process.env.GITHUB_ACTOR || "",
    event_name: process.env.GITHUB_EVENT_NAME || "",
    server_url: process.env.GITHUB_SERVER_URL || "",
    commit_sha: commitSha,
    started_at: capturedAt,
  };
  await writeFile(path.join(outDir, "run_metadata_v01.json"), JSON.stringify(runMetadata, null, 2) + "\n", "utf8");

  const artifacts = [
    { artifact_id: "R1A-002", name: "run_metadata", format: "json", privacy: "low", uri_path: "run_metadata_v01.json" },
    {
      artifact_id: "R1A-003",
      name: "toolchain_versions",
      format: "json",
      privacy: "none",
      uri_path: "toolchain_versions_v01.json",
    },
    {
      artifact_id: "R1A-004",
      name: "runner_fingerprint",
      format: "json",
      privacy: "none",
      uri_path: "runner_fingerprint_v01.json",
    },
    {
      artifact_id: "R1A-005",
      name: "dependency_inventory_purl",
      format: "csv",
      privacy: "none",
      uri_path: "dependency_inventory_purl_v01.csv",
    },
    {
      artifact_id: "R1A-006",
      name: "dependency_graph",
      format: "json",
      privacy: "none",
      uri_path: "dependency_graph_v01.json",
    },
    {
      artifact_id: "R1A-007",
      name: "sbom_document",
      format: "json",
      privacy: "review-needed",
      digest_sha256: sbomSha256,
      uri_path: path.basename(sbomPath),
    },
    {
      artifact_id: "R1A-008",
      name: "sbom_digest",
      format: "text",
      privacy: "none",
      uri_path: "sbom_digest_v01.txt",
    },
  ];

  const snapshotRecord = {
    snapshot_id: snapshotId,
    repo_url: repoUrl,
    repo_full_name: process.env.GITHUB_REPOSITORY || repoFullName,
    commit_sha: commitSha,
    commit_timestamp: commitTimestamp,
    captured_at: capturedAt,
    ci: {
      provider: "github-actions",
      workflow_id: process.env.GITHUB_WORKFLOW || "",
      run_id: process.env.GITHUB_RUN_ID || "",
      started_at: capturedAt,
      conclusion: "",
    },
    toolchain_versions: toolchain,
    runner_fingerprint: runnerFingerprint,
    artifacts,
  };

  await writeFile(path.join(outDir, "snapshot_record_v01.json"), JSON.stringify(snapshotRecord, null, 2) + "\n", "utf8");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
