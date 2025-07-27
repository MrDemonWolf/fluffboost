import consola from "consola";

export function shardDisconnectEvent() {
  consola.error({
    message: `[Discord] Shard disconnected`,
    badge: true,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
}
