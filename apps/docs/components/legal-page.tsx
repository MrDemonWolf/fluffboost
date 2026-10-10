import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

// Each document carries its own revision date, so revising one never re-dates the other.
type IsoDate = `${number}-${number}-${number}`;

function formatRevision(date: IsoDate) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LegalPage({ title, description, lastUpdated, children }: {
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD) of this document's latest revision. */
  lastUpdated: IsoDate;
  children: ReactNode;
}) {
  return (
    <>
      <main id="main-content" className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-20">
          <Link href="/" className="text-honey-ink underline underline-offset-4">Back to FluffBoost</Link>
          <p className="mt-8 font-mono text-sm uppercase tracking-widest text-honey-ink">
            Last updated <time dateTime={lastUpdated}>{formatRevision(lastUpdated)}</time>
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{description}</p>
          <div className="prose mt-10 max-w-[62ch] text-base leading-relaxed prose-headings:font-display prose-headings:text-ink prose-h2:text-2xl prose-h2:font-semibold prose-p:text-ink-soft prose-li:text-ink-soft prose-a:text-honey-ink prose-a:underline prose-a:underline-offset-4">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
