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
