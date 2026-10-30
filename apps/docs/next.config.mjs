/** Next.js config: a fully static export (`out/`) for GitHub Pages, with MDX via fumadocs-mdx. */
import { createMDX } from "fumadocs-mdx/next";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// The custom domain (public/CNAME) and local development serve the site at its
// root. NEXT_PUBLIC_BASE_PATH remains available for previewing a subpath.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  basePath: basePath || undefined,
  // The image optimizer needs a server; a static export serves the files as-is.
  images: { unoptimized: true },
  reactStrictMode: true,
  // Emit /route/index.html so GitHub Pages serves each route at its directory URL.
  trailingSlash: true,
  // Pin tracing to the monorepo root so Next doesn't latch onto a parent
  // checkout's lockfile (this repo is often used inside a git worktree).
  outputFileTracingRoot: join(here, "..", ".."),
};

const withMDX = createMDX();

export default withMDX(config);
