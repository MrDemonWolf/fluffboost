import { createMDX } from "fumadocs-mdx/next";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// The custom domain (public/CNAME) and local dev serve the site at the root, so
// NEXT_PUBLIC_BASE_PATH is normally empty. Set it (e.g. "/fluffboost") only to
// preview the export under a project subpath.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  basePath: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
  // Pin tracing to the monorepo root so Next doesn't latch onto a parent
  // checkout's lockfile (this repo is often used inside a git worktree).
  outputFileTracingRoot: join(here, "..", ".."),
};

const withMDX = createMDX();

export default withMDX(config);
