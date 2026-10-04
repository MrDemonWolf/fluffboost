import type { ChildProcess } from "node:child_process";

/** Keep PID 1 alive until shard workers have finished their SIGTERM cleanup. */
export async function stopShardProcess(child: ChildProcess, timeoutMs = 22_000): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {return;}
  await new Promise<void>((resolve) => {
    const finished = () => {
      clearTimeout(timer);
      child.removeListener("exit", finished);
      resolve();
    };
    child.once("exit", finished);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      // Await the resulting exit rather than treating the signal as completion.
    }, timeoutMs);
    child.kill("SIGTERM");
  });
}
