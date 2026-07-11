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
          structuredData?: unknown;
          load?: () => Promise<{ structuredData: unknown }>;
        };
        const structuredData =
          data.structuredData ?? (await data.load?.())?.structuredData;

        return {
          title: data.title,
          description: data.description,
          url: page.url,
          id: page.url,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          structuredData: structuredData as any,
        };
      }),
    );
  },
});
