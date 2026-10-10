import { resolve, sep } from "node:path";

// Serve exactly the static export GitHub Pages receives. There is deliberately
// no SPA fallback: a broken exported route must produce a 404 in the E2E suite.
const output = resolve(import.meta.dir, "../out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.PORT ?? "4173"),
  async fetch(request) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
      return new Response("Not found", { status: 404 });
    }

    const route = pathname.slice(basePath.length) || "/";
    const path = resolve(output, `.${route.endsWith("/") ? `${route}index.html` : route}`);
    const candidates = route.endsWith("/") ? [path] : [resolve(path, "index.html"), path];
    for (const candidate of candidates) {
      if (!candidate.startsWith(`${output}${sep}`)) continue;
      const file = Bun.file(candidate);
      if (await file.exists()) return new Response(file);
    }
    return new Response("Not found", { status: 404 });
  },
});
