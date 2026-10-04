import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

export function LegalPage({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-20">
        <Link href="/" className="text-honey-ink underline underline-offset-4">Back to FluffBoost</Link>
        <p className="mt-8 font-mono text-sm uppercase tracking-widest text-honey-ink">Last updated October 3, 2026</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">{description}</p>
        <div className="prose mt-10 max-w-none text-base leading-relaxed prose-headings:font-display prose-headings:text-ink prose-h2:text-2xl prose-h2:font-semibold prose-p:text-ink-soft prose-li:text-ink-soft prose-a:text-honey-ink prose-a:underline prose-a:underline-offset-4">{children}</div>
      </article>
      <SiteFooter />
    </>
  );
}
