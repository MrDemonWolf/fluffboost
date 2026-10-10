import Link from "next/link";
import type { Metadata } from "next";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { HomeContainer, SkipLink } from "@/app/(home)/_components/layout-a11y";
import { SiteFooter } from "@/components/site-footer";
import { baseOptions } from "@/lib/layout.shared";
import { site } from "@/lib/site";

// The static export writes this as out/404.html, which GitHub Pages serves for
// every missing /fluffboost/* path. It sits outside (home), so it brings its own
// site chrome. Next adds the noindex robots tag to not-found pages itself.
export const metadata: Metadata = {
  title: "Page not found",
  description: "This FluffBoost page could not be found.",
  // The root "./" canonical and og:url would point at the internal /_not-found route.
  alternates: { canonical: null },
  openGraph: { siteName: site.name, type: "website" },
};

const destinations = [
  { label: "FluffBoost home", href: "/" },
  { label: "Guide", href: "/docs" },
  { label: "Developers", href: "/developers" },
];

export default function NotFound() {
  return (
    <>
      <SkipLink href="#main-content" />
      <HomeLayout {...baseOptions()} slots={{ container: HomeContainer }}>
        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
            <p className="font-mono text-sm uppercase tracking-widest text-honey-ink">404</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Page not found</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              This link may be out of date or mistyped. Try one of these pages, or use search to find a topic.
            </p>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base">
              {destinations.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-semibold text-honey-ink underline underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </main>
        <SiteFooter />
      </HomeLayout>
    </>
  );
}
