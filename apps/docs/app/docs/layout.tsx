import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsDrawerA11y, SkipLink } from "@/app/(home)/_components/layout-a11y";
import { baseOptions } from "@/lib/layout.shared";
import { userSource } from "@/lib/source";

// "Guide" — docs for server owners and community members.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink href="#nd-page" />
      <DocsLayout {...baseOptions()} tree={userSource.getPageTree()}>
        <DocsDrawerA11y />
        {children}
      </DocsLayout>
    </>
  );
}
