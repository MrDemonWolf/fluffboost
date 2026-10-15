/**
 * /api/search — emitted at build time as a static JSON Orama index (no server
 * at runtime on GitHub Pages); components/search-dialog.tsx fetches it.
 */
import type { StructuredData } from "fumadocs-core/mdx-plugins";
import { createSearchAPI } from "fumadocs-core/search/server";
import { userSource, devSource } from "@/lib/source";

// One static index across BOTH docs trees (Guide + Developers).
// revalidate = false makes the route fully static so `output: "export"` can write it.
export const revalidate = false;

export const { staticGET: GET } = createSearchAPI("advanced", {
  language: "english",
  indexes: async () => {
    const pages = [...userSource.getPages(), ...devSource.getPages()];
    return Promise.all(
      pages.map(async (page) => {
        const data = page.data as {
          title: string;
          description?: string;
          structuredData?: StructuredData;
          load?: () => Promise<{ structuredData: StructuredData }>;
        };
        // structuredData is lazy in fumadocs-mdx (async collections), so fall
        // back to load() when it is not already on page.data.
        const structuredData =
          data.structuredData ?? (await data.load?.())?.structuredData;

        return {
          title: data.title,
          description: data.description,
          url: page.url,
          id: page.url,
          structuredData: structuredData as StructuredData,
        };
      }),
    );
  },
});
