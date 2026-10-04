import { expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { stopShardProcess } from "../../src/utils/shardShutdown.js";

it("waits for a shard's in-flight cleanup to finish after SIGTERM", async () => {
  const child = spawn(process.execPath, ["-e", "process.on('SIGTERM',()=>setTimeout(()=>process.exit(0),120)); console.log('ready'); setInterval(()=>{},1000)"], { stdio: ["ignore", "pipe", "pipe"] });
  await new Promise<void>((resolve, reject) => {
    child.stdout!.once("data", () => resolve());
    child.once("error", reject);
  });
  const started = Date.now();
  try {
    await stopShardProcess(child, 2000);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
    expect(child.exitCode).toBe(0);
  } finally {
    if (child.exitCode === null) {child.kill("SIGKILL");}
  }
});
