import consola from "consola";

export default function worker() {
  consola.success({
    message: `Worker: Launched`,
    badge: true,
  });
}
