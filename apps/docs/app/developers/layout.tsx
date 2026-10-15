/** Docs shell (sidebar, nav, search) for every /developers page. */
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsDrawerA11y, SkipLink } from "@/app/(home)/_components/layout-a11y";
import { baseOptions } from "@/lib/layout.shared";
import { devSource } from "@/lib/source";

// "Developers" — self-hosting, architecture, and contribution docs.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* #nd-page is the <main> rendered by DocsMain (components/documentation-page.tsx). */}
      <SkipLink href="#nd-page" />
      <DocsLayout {...baseOptions()} tree={devSource.getPageTree()}>
        <DocsDrawerA11y />
        {children}
      </DocsLayout>
    </>
  );
}
