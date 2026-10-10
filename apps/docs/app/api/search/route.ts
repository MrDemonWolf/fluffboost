import type { StructuredData } from "fumadocs-core/mdx-plugins";
import { createSearchAPI } from "fumadocs-core/search/server";
import { userSource, devSource } from "@/lib/source";

// One static index across BOTH docs trees (Guide + Developers).
// structuredData is lazy in fumadocs-mdx, so resolve it per page.
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
