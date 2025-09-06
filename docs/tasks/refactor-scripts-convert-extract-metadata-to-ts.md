## Refactor: Convert `scripts/extract-metadata.js` to TypeScript

### Plan:

1.  **Rename file**: Rename `scripts/extract-metadata.js` to `scripts/extract-metadata.ts`.
2.  **Add type annotations**: Add appropriate TypeScript type annotations to variables, function parameters, and return types within the `extract-metadata.ts` file.
3.  **Install type definitions**: Install `@types/jsmediatags` if available. If not, create a custom declaration file (`.d.ts`) for `jsmediatags`.
4.  **Compile and test**: Ensure the TypeScript code compiles without errors and the script continues to function correctly by running a test extraction.