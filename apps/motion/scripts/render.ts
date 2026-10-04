import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia, renderStill } from "@remotion/renderer";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assets } from "../src/assets.js";

const root = resolve(import.meta.dirname, "../../..");
const outputDir = resolve(root, "assets/brand/animated");
const requested = process.argv.slice(2);
if (requested.some((id) => !assets.some((asset) => asset.id === id))) {
  throw new Error("Unknown composition. Use an ID from src/assets.ts.");
}
await mkdir(outputDir, { recursive: true });
const serveUrl = await bundle({
  entryPoint: resolve(import.meta.dirname, "../src/index.ts"),
  publicDir: resolve(root, "assets/brand"),
  webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, extensionAlias: { ".js": [".js", ".ts", ".tsx"] } } }),
});
const compositions = await getCompositions(serveUrl);
const selected = compositions.filter((item) => requested.length === 0 || requested.includes(item.id));
const productionBanner = compositions.find((item) => item.id === "fluffboost-production-banner");
if (selected.some((item) => item.id.endsWith("-banner")) && productionBanner) {
  const existingIndex = selected.indexOf(productionBanner);
  if (existingIndex !== -1) selected.splice(existingIndex, 1);
  selected.unshift(productionBanner);
}
const files: Record<string, { bytes: number; sha256: string }> = {};
for (const composition of selected) {
  for (const format of ["png", "mp4", "gif"] as const) {
    const name = `${composition.id}.${format}`;
    const output = resolve(outputDir, name);
    if (composition.id.endsWith("-banner") && composition.id !== "fluffboost-production-banner") {
      await copyFile(resolve(outputDir, `fluffboost-production-banner.${format}`), output);
    } else if (format === "png") {
      await renderStill({ serveUrl, composition, output, imageFormat: "png", frame: 0 });
    } else {
      await renderMedia({ serveUrl, composition, outputLocation: output,
        codec: format === "gif" ? "gif" : "h264", muted: true, concurrency: 2,
        ...(format === "gif" ? { everyNthFrame: 2, scale: composition.width === 1024 ? 0.5 : 1 } : { crf: 20, pixelFormat: "yuv420p" as const }),
      });
    }
    const bytes = await readFile(output);
    if (name === "fluffboost-production-banner.mp4") {
      const siteDir = resolve(root, "apps/docs/public/brand");
      await mkdir(siteDir, { recursive: true });
      await copyFile(output, resolve(siteDir, name));
    }
    if (format === "gif" && bytes.length > 10_000_000) {
      throw new Error(`${name} exceeds the conservative 10 MB upload budget.`);
    }
    files[name] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    process.stdout.write(`Rendered ${name} (${bytes.length} bytes)\n`);
  }
}
const manifestPath = resolve(outputDir, "manifest.json");
let previous: { files?: typeof files } = {};
try { previous = JSON.parse(await readFile(manifestPath, "utf8")); } catch { /* First render. */ }
await writeFile(manifestPath, `${JSON.stringify({
  remotion: "4.0.532", bannerDurationSeconds: 32, iconDurationSeconds: 8, videoFps: 24, gifFps: 12, gifIconSize: 512,
  provenance: "Remotion cloud, sunlight and glint animation over AI-generated ChatGPT artwork; no audio.",
  compositions: assets, files: { ...previous.files, ...files },
}, null, 2)}\n`);
