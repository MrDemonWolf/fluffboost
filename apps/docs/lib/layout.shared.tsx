import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { site } from "@/lib/site";
import { Wordmark } from "@/components/brand";

// Shared nav/branding for every layout (home, docs, developers).
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Wordmark />,
      transparentMode: "top",
    },
    links: [
      { text: "Guide", url: "/docs", active: "nested-url" },
      { text: "Developers", url: "/developers", active: "nested-url" },
      {
        text: "Add to Discord",
        url: site.inviteUrl,
        external: true,
      },
    ],
    githubUrl: site.githubUrl,
  };
}
