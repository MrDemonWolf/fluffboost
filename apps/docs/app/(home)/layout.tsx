import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { HomeContainer, SkipLink } from "./_components/layout-a11y";

// Pages under this layout render their own <main id="main-content"> so the
// site header and footer stay outside it as banner/contentinfo landmarks.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink href="#main-content" />
      <HomeLayout {...baseOptions()} slots={{ container: HomeContainer }}>
        {children}
      </HomeLayout>
    </>
  );
}
