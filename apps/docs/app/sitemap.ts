import type { MetadataRoute } from "next";
import { devSource, userSource } from "@/lib/source";
import { site } from "@/lib/site";

// Written to out/sitemap.xml by the static export. GitHub Pages ignores a
// robots.txt below the user-site root, so submit this URL in Search Console.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = [...userSource.getPages(), ...devSource.getPages()].map((page) => page.url);
  // site.origin already includes the base path and page.url excludes it; the
  // trailing slash matches next.config.mjs's trailingSlash and the canonical URLs.
  return ["/", "/privacy", "/terms", ...docs].map((path) => ({
    url: `${site.origin}${path.endsWith("/") ? path : `${path}/`}`,
  }));
}
