import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { devSource } from "@/lib/source";

// "Developers" — self-hosting, architecture, and contribution docs.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...baseOptions()} tree={devSource.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
