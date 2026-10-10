import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assets, bannerSeconds, fps, GIF_BYTE_BUDGET, gifFps, gifScale, iconSeconds } from "../src/assets.js";

const outputDir = resolve(import.meta.dirname, "../../../assets/brand/animated");
const mediaCommand = (command: "ffmpeg" | "ffprobe", args: string[]) => {
  const result = spawnSync(command, args, { maxBuffer: 2 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr?.toString());
  return result.stdout;
};
type Manifest = {
  bannerDurationSeconds: number; iconDurationSeconds: number; videoFps: number; gifFps: number;
  files: Record<string, { bytes: number; sha256: string }>;
};
const manifest: Manifest = JSON.parse(await readFile(resolve(outputDir, "manifest.json"), "utf8"));
// The encoded files are checked against src/assets.ts below; these catch a stale manifest header.
assert.equal(manifest.bannerDurationSeconds, bannerSeconds, "manifest banner duration");
assert.equal(manifest.iconDurationSeconds, iconSeconds, "manifest icon duration");
assert.equal(manifest.videoFps, fps, "manifest video fps");
assert.equal(manifest.gifFps, gifFps, "manifest GIF fps");

for (const asset of assets) {
  for (const format of ["png", "mp4", "gif"] as const) {
    const name = `${asset.id}.${format}`;
    const path = resolve(outputDir, name);
    const bytes = await readFile(path);
    const record = manifest.files[name];
    assert.ok(record, `${name}: missing manifest record`);
    assert.equal(bytes.length, record.bytes, `${name}: byte count`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256, `${name}: checksum`);
    const info = JSON.parse(mediaCommand("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]).toString());
    assert.equal(info.streams.length, 1, `${name}: unexpected audio or extra stream`);
    const stream = info.streams[0];
    const scale = format === "gif" ? gifScale(asset) : 1;
    assert.equal(stream.width, asset.width * scale, `${name}: width`);
    assert.equal(stream.height, asset.height * scale, `${name}: height`);
    if (format === "png") { continue; }
    const duration = asset.banner ? bannerSeconds : iconSeconds;
    const frameCount = duration * gifFps;
    assert.ok(Math.abs(Number(info.format.duration) - duration) < 0.02, `${name}: duration`);
    if (format === "mp4") { continue; }
    assert.ok(bytes.length < GIF_BYTE_BUDGET, `${name}: upload budget`);
    const loop = bytes.indexOf("NETSCAPE2.0");
    assert.ok(loop >= 0, `${name}: missing loop extension`);
    assert.equal(bytes.readUInt16LE(loop + 13), 0, `${name}: must loop forever`);
    const hashes = mediaCommand("ffmpeg", ["-v", "error", "-i", path, "-vf", "scale=64:64", "-f", "framemd5", "-"])
      .toString().split("\n").filter((line) => /^\d+,/.test(line)).map((line) => line.split(",").at(-1)?.trim());
    assert.equal(hashes.length, frameCount, `${name}: frame count`);
    assert.ok(new Set(hashes).size > frameCount * 0.8, `${name}: GIF is effectively static`);
    const pixels = mediaCommand("ffmpeg", ["-v", "error", "-i", path, "-vf", `select='eq(n,0)+eq(n,${frameCount / 4})+eq(n,${frameCount - 1})',scale=64:64`, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    const frameSize = 64 * 64 * 3;
    assert.equal(pixels.length, frameSize * 3);
    const delta = (offset: number) => {
      let difference = 0;
      for (let index = 0; index < frameSize; index++) {
        difference += Math.abs(pixels[index]! - pixels[index + offset]!);
      }
      return difference / frameSize;
    };
    const motion = delta(frameSize);
    const seam = delta(frameSize * 2);
    assert.ok(motion > 0.25, `${name}: motion is too faint`);
    if (asset.banner) {
      // Track the actual cream cloud pixels in the encoded sky, rather than
      // accepting a GIF that merely pulses brightness over a stationary scene.
      const cloudCenter = (offset: number) => {
        let count = 0;
        let totalX = 0;
        for (let y = 5; y < 26; y++) {
          for (let x = 0; x < 64; x++) {
            const index = offset + (y * 64 + x) * 3;
            if (pixels[index]! > 248 && pixels[index + 1]! > 240 && pixels[index + 2]! > 224) {
              totalX += x;
              count++;
            }
          }
        }
        assert.ok(count > 20, `${name}: missing visible clouds`);
        return totalX / count;
      };
      assert.ok(Math.abs(cloudCenter(frameSize) - cloudCenter(0)) > 10, `${name}: clouds are not translating`);
    }
    assert.ok(seam < motion, `${name}: abrupt loop boundary`);
    process.stdout.write(`Verified ${name}: ${frameCount} moving frames, motion ${motion.toFixed(2)}, loop ${seam.toFixed(2)}\n`);
  }
}
const siteCopy = await readFile(resolve(import.meta.dirname, "../../docs/public/brand/fluffboost-production-banner.mp4"));
for (const variant of ["dev", "staging"]) {
  for (const format of ["png", "gif", "mp4"]) {
    assert.equal(manifest.files[`fluffboost-${variant}-banner.${format}`]?.sha256,
      manifest.files[`fluffboost-production-banner.${format}`]?.sha256,
      `${variant} ${format}: all environments must use the approved production banner`);
  }
}
assert.equal(createHash("sha256").update(siteCopy).digest("hex"), manifest.files["fluffboost-production-banner.mp4"]?.sha256, "Website video is stale");
process.stdout.write(`All ${assets.length * 3} exports and the website video verified.\n`);
