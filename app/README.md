# Next.js GitHub Pages Album

This is a modern front-end project scaffolded for deployment to GitHub Pages as a static site.

## Tech Stack

-   [Next.js](https://nextjs.org/) - React framework for production.
-   [React](https://react.dev/) - A JavaScript library for building user interfaces.
-   [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at scale.
-   [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
-   [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built using Radix UI and Tailwind CSS.
-   [Biome](https://biomejs.dev/) - A toolchain for web projects, used for linting and formatting.
-   [Vitest](https://vitest.dev/) - A blazing fast unit-test framework powered by Vite.
-   [Zod](https://zod.dev/) - TypeScript-first schema validation with static type inference.

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

-   `pnpm dev`: Starts the development server.
-   `pnpm build`: Builds the application for production (as a static site).
-   `pnpm start`: Starts a production server (for previewing the static build).
-   `pnpm lint`: Lints the codebase using Biome.
-   `pnpm format`: Formats the codebase using Biome.
-   `pnpm test`: Runs the unit tests using Vitest.

## Deployment

This project is configured to automatically deploy to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by the GitHub Actions workflow defined in `.github/workflows/deploy.yml`.yml`.