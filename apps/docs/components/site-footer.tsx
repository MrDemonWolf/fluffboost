import Link from "next/link";
import { site } from "@/lib/site";
import { PawMark } from "@/components/brand";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Add to Discord", href: site.inviteUrl, external: true },
      { label: "Guide", href: "/docs" },
      { label: "Premium", href: "/docs/premium" },
      { label: "Commands", href: "/docs/commands" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "Overview", href: "/developers" },
      { label: "Self-hosting", href: "/developers/self-hosting" },
      { label: "Deployment", href: "/developers/deployment" },
      { label: "Contributing", href: "/developers/contributing" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Discord server", href: site.discordUrl, external: true },
      { label: "GitHub", href: site.githubUrl, external: true },
      { label: "MrDemonWolf", href: site.companyUrl, external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-line bg-paper-2">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="max-w-xs">
          <span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="grid size-7 place-items-center rounded-full bg-honey text-[#2b1e12]">
              <PawMark className="size-4" />
            </span>
            FluffBoost
          </span>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            A warm little bot that nudges your Discord server toward a better
            day — one quote at a time.
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              {col.heading}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-ink-soft sm:flex-row">
          <p>
            Made with love by{" "}
            <a
              href={site.companyUrl}
              className="font-semibold text-honey-ink underline-offset-2 hover:underline"
            >
              MrDemonWolf, Inc.
            </a>
          </p>
          <p>Licensed under GPL-3.0.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  label,
  href,
  external,
}: {
  label: string;
  href: string;
  external?: boolean;
}) {
  const className =
    "text-sm text-ink-soft underline-offset-2 transition-colors hover:text-honey-ink hover:underline";
  if (external) {
    return (
      <a href={href} className={className} rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
