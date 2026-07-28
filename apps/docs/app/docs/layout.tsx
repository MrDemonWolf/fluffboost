import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { userSource } from "@/lib/source";

// "Guide" — docs for server owners and community members.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...baseOptions()} tree={userSource.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
