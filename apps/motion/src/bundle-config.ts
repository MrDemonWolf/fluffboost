import type { WebpackOverrideFn } from "@remotion/bundler";

// Shared by Studio (remotion.config.ts) and scripts/render.ts, because the Node
// bundle() API ignores the config file. Not imported by the composition code.

/** Lets source files keep ESM `.js` import specifiers for `.ts`/`.tsx` modules. */
export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: { ...config.resolve, extensionAlias: { ".js": [".js", ".ts", ".tsx"] } },
});

/** Public dir relative to the repository root: only the images the compositions load. */
export const brandPublicDir = "assets/brand/motion-sources";
