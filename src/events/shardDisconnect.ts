import consola from "consola";

export async function shardDisconnectEvent() {
  consola.error({
    message: `Shard disconnected`,
    badge: true,
  });
  process.exit(1);
}
