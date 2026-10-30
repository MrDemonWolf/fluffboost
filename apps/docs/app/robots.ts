import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Written to out/robots.txt. The custom domain serves the site at its root, so
// crawlers read this file and find the sitemap through it.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.origin}/sitemap.xml`,
  };
}
