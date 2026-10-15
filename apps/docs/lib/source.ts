/**
 * Fumadocs page loaders for the two docs trees declared in source.config.ts.
 * `baseUrl` is the route prefix only; Next adds the deploy base path on top.
 */
import { user, developer } from "@/.source/server";
import { loader } from "fumadocs-core/source";

export const userSource = loader({
  baseUrl: "/docs",
  source: user.toFumadocsSource(),
});

export const devSource = loader({
  baseUrl: "/developers",
  source: developer.toFumadocsSource(),
});
