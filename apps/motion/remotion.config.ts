/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs
 * (scripts/render.ts imports the same shared settings).
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { resolve } from "node:path";
import { brandPublicDir, webpackOverride } from "./src/bundle-config.js";

// The CLI runs this file from apps/motion; the public dir is relative to the repository root.
Config.setPublicDir(resolve(process.cwd(), "../..", brandPublicDir));
Config.overrideWebpackConfig(webpackOverride);
Config.setOverwriteOutput(true);
