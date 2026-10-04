/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { resolve } from "node:path";

Config.setPublicDir(resolve(process.cwd(), "../../assets/brand"));
Config.overrideWebpackConfig((config) => ({ ...config, resolve: { ...config.resolve, extensionAlias: { ".js": [".js", ".ts", ".tsx"] } } }));
Config.setOverwriteOutput(true);
