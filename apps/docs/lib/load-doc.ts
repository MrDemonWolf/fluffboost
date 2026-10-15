import type { ComponentProps } from "react";
import type { MDXContent } from "mdx/types";
import type { DocsPage } from "fumadocs-ui/page";

// fumadocs-mdx generates its `.source` with `@ts-nocheck`, so the compiled
// body/toc (present on page.data at runtime) don't survive type inference
// through `loader()` — page.data widens to the base PageData. This narrows it
// back to the real runtime shape in one place, keeping the renderers clean.
export type LoadedDoc = {
  body: MDXContent;
  toc: ComponentProps<typeof DocsPage>["toc"];
};

/** Reads the compiled MDX body and table of contents off a docs page's `page.data`. */
export function getDoc(data: unknown): LoadedDoc {
  const d = data as LoadedDoc;
  return { body: d.body, toc: d.toc };
}
