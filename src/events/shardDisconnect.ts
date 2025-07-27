import consola from "consola";

export async function shardDisconnectEvent() {
  consola.error({
    message: `Shard disconnected`,
    badge: true,
    timestamp: new Date(),
  });
  process.exit(1);
}
