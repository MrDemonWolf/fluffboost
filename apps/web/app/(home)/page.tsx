import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PawMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
};

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

const ribbon = [
  "Spreading paw-sitivity 🐾",
  "You showed up today — that counts",
  "Small steps, warm hearts",
  "Rest is productive too",
  "Your server, a little brighter",
  "Be the reason someone smiles",
];

const features = [
  {
    icon: "clock",
    title: "Scheduled, not spammy",
    body: "One thoughtful quote delivered to the channel you choose, on the cadence you set. It shows up, then gets out of the way.",
  },
  {
    icon: "globe",
    title: "Every server, its own rhythm",
    body: "Pick the exact time and timezone that fits your community. Delivery is reliable across shards, even after a restart.",
  },
  {
    icon: "chat",
    title: "Community-written",
    body: "Members suggest quotes with /suggestion; admins approve the good ones. The library grows in your server's own voice.",
  },
  {
    icon: "sparkle",
    title: "A bot with presence",
    body: "FluffBoost rotates through friendly status activities on an interval you control, so it always feels alive.",
  },
  {
    icon: "shield",
    title: "Admin controls that make sense",
    body: "Manage quotes, activities, and the suggestion queue from clear slash commands — no clunky dashboard to babysit.",
  },
  {
    icon: "heart",
    title: "Built to keep running",
    body: "A sharded architecture with a health-check endpoint means it stays up and delivers, quietly, day after day.",
  },
];

const steps = [
  {
    n: "01",
    title: "Add FluffBoost",
    body: "Invite the bot to your server with a couple of clicks. No account, no setup wizard.",
  },
  {
    n: "02",
    title: "Pick a channel",
    body: "Run /setup channel to tell FluffBoost where the daily motivation should land.",
  },
  {
    n: "03",
    title: "Enjoy the boost",
    body: "That's it. A warm quote arrives on schedule — tweak the timing anytime with /setup schedule.",
  },
];

const faqs = [
  {
    q: "Is FluffBoost free?",
    a: "Yes. The daily 8:00 AM quote and every core command are free, forever. Premium only adds custom scheduling — frequency, time, and timezone.",
  },
  {
    q: "Do I need to host anything?",
    a: "No. Just invite the hosted bot and run /setup channel. Developers who want to self-host will find everything in the Developers docs.",
  },
  {
    q: "Where do the quotes come from?",
    a: "A curated starter library plus quotes your own members suggest with /suggestion and your admins approve.",
  },
  {
    q: "What permissions does it need?",
    a: "Just enough to post in the channel you choose. FluffBoost never reads message history or DMs your members.",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <main className="flex-1">
      <Hero />
      <Ribbon />
      <Features />
      <Steps />
      <Premium />
      <Community />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="fb-dawn relative overflow-hidden">
      <div className="fb-grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div>
          <p
            className="fb-rise inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3.5 py-1.5 text-sm font-semibold text-honey-ink backdrop-blur"
            style={{ ["--d" as string]: "0ms" }}
          >
            <PawMark className="size-4" />
            A friendlier daily ritual for Discord
          </p>

          <h1
            className="fb-rise mt-6 font-display text-[clamp(2.6rem,6vw,4.4rem)] font-semibold leading-[1.03] tracking-tight text-ink"
            style={{ ["--d" as string]: "80ms" }}
          >
            Your daily dose of{" "}
            <span className="relative whitespace-nowrap text-honey-ink">
              furry motivation
              <Underline />
            </span>
            .
          </h1>

          <p
            className="fb-rise mt-6 max-w-xl text-lg leading-relaxed text-ink-soft"
            style={{ ["--d" as string]: "160ms" }}
          >
            FluffBoost drops one warm, uplifting quote into your server every
            day — on your schedule, in your timezone, written partly by your own
            community. Cozy, quiet, and genuinely kind.
          </p>

          <div
            className="fb-rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ ["--d" as string]: "240ms" }}
          >
            <a href={site.inviteUrl} className={btnPrimary} rel="noreferrer">
              <PawMark className="size-5" />
              Add to Discord
            </a>
            <Link href="/docs" className={btnGhost}>
              Read the guide
              <Arrow />
            </Link>
          </div>

          <p
            className="fb-rise mt-6 text-sm text-ink-soft"
            style={{ ["--d" as string]: "320ms" }}
          >
            Free forever · Set up in under a minute · No account required
          </p>
        </div>

        <div
          className="fb-rise relative"
          style={{ ["--d" as string]: "220ms" }}
        >
          <QuoteCard />
        </div>
      </div>
    </section>
  );
}

/* A mock of the actual embed FluffBoost posts — marketing that tells the
 * truth about the product. */
function QuoteCard() {
  return (
    <div className="relative mx-auto max-w-md">
      <div className="fb-float absolute -left-6 -top-6 hidden size-16 place-items-center rounded-2xl bg-berry/12 text-berry-ink sm:grid">
        <PawMark className="size-8" />
      </div>

      <article className="fb-shadow relative rounded-3xl border border-line bg-card p-5">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="grid size-10 place-items-center rounded-full bg-honey text-[#2b1e12]">
            <PawMark className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="flex items-center gap-2 font-semibold text-ink">
              FluffBoost
              <span className="rounded bg-pine/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pine">
                Bot
              </span>
            </p>
            <p className="text-xs text-ink-soft">Today · 8:00 AM</p>
          </div>
        </div>

        <div className="fb-ticket mt-4 rounded-2xl bg-paper-2/60 p-5">
          <p className="font-display text-2xl leading-snug text-ink">
            “You don't have to do it all today. Showing up is already brave.”
          </p>
          <p className="mt-3 text-sm font-semibold text-honey-ink">
            — Today's motivation
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
          <span>Delivered to #daily-motivation</span>
          <span className="inline-flex items-center gap-1">
            <PawMark className="size-3.5 text-berry-ink" />
            paw-sitivity
          </span>
        </div>
      </article>
    </div>
  );
}

function Ribbon() {
  const items = [...ribbon, ...ribbon];
  return (
    <div
      className="fb-marquee-track relative flex overflow-hidden border-y border-line bg-paper-2 py-3.5"
      aria-hidden="true"
    >
      <div className="fb-marquee flex shrink-0 items-center gap-4 pr-4">
        {items.map((text, i) => (
          <span key={i} className="flex items-center gap-4 whitespace-nowrap">
            <span className="text-sm font-semibold text-ink-soft">{text}</span>
            <PawMark className="size-3.5 text-honey" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <Section
      eyebrow="What it does"
      title="A small bot that does a few things really well"
      lede="No bloat, no dashboards to babysit — just a dependable daily lift for your community."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-3xl border border-line bg-card p-6 transition-colors hover:border-honey"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-honey/14 text-honey-ink">
              <Icon name={f.icon} />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold text-ink">
              {f.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Steps() {
  return (
    <Section
      eyebrow="Getting started"
      title="From invite to daily boost in three steps"
      lede="Genuinely under a minute. We timed it."
      tinted
    >
      <ol className="grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="relative rounded-3xl border border-line bg-card p-6"
          >
            <span className="font-display text-4xl font-semibold text-honey/40">
              {s.n}
            </span>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink">
              {s.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Premium() {
  return (
    <Section
      eyebrow="Premium (optional)"
      title="Free stays free. Premium just bends time."
      lede="Every core feature is free forever. Premium exists for servers that want the quote to land at a very specific moment."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <PlanCard
          name="Free"
          highlight={false}
          points={[
            "Daily quote at 8:00 AM (America/Chicago)",
            "Community suggestions + admin review",
            "Rotating bot status",
            "Every core slash command",
          ]}
          cta={{ label: "Add to Discord", href: site.inviteUrl, external: true }}
        />
        <PlanCard
          name="Premium"
          highlight
          points={[
            "Everything in Free, plus…",
            "Daily, weekly, or monthly cadence",
            "Custom delivery time (HH:MM)",
            "Any IANA timezone, with autocomplete",
          ]}
          cta={{ label: "See premium docs", href: "/docs/premium" }}
        />
      </div>
    </Section>
  );
}

function Community() {
  return (
    <Section eyebrow="Community" title="The best quotes come from your people" tinted>
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <p className="text-lg leading-relaxed text-ink-soft">
          Anyone can suggest a quote with{" "}
          <code className="rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-sm text-honey-ink">
            /suggestion
          </code>
          . Suggestions land in a review queue where your admins approve or pass
          on each one. Over time your server builds a motivation library that
          sounds like it — inside jokes and all.
        </p>
        <div className="fb-shadow rounded-3xl border border-line bg-card p-6">
          <div className="space-y-3">
            <SuggestionRow name="fox_dev" text="Ship it scared. That's how it ships." status="approved" />
            <SuggestionRow name="mossypaws" text="Hydrate, then decide it's a crisis." status="pending" />
            <SuggestionRow name="riverwolf" text="Naps are a feature, not a bug." status="approved" />
          </div>
        </div>
      </div>
    </Section>
  );
}

function Faq() {
  return (
    <Section eyebrow="Questions" title="The short answers">
      <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
        {faqs.map((f) => (
          <details key={f.q} className="group px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-ink">
              {f.q}
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-honey-ink transition-transform group-open:rotate-45">
                <Plus />
              </span>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <section className="px-6 py-20">
      <div className="fb-dawn fb-shadow relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-card px-8 py-14 text-center">
        <div className="fb-grain pointer-events-none absolute inset-0" />
        <div className="relative">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-honey text-[#2b1e12]">
            <PawMark className="size-7" />
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight text-ink">
            Give your server a little more warmth tomorrow morning.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
            Add FluffBoost now and the first quote can land at 8:00 AM.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={site.inviteUrl} className={btnPrimary} rel="noreferrer">
              <PawMark className="size-5" />
              Add to Discord
            </a>
            <a href={site.discordUrl} className={btnGhost} rel="noreferrer">
              Join the community
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-honey px-6 py-3 font-display text-base font-semibold text-[#2b1e12] fb-shadow transition-[filter,transform] hover:brightness-[1.05] active:translate-y-px";

const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-6 py-3 font-display text-base font-semibold text-ink transition-colors hover:border-honey";

function Section({
  eyebrow,
  title,
  lede,
  tinted,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={tinted ? "bg-paper-2/60" : undefined}>
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-honey-ink">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-tight text-ink">
            {title}
          </h2>
          {lede ? (
            <p className="mt-3 text-lg leading-relaxed text-ink-soft">{lede}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function PlanCard({
  name,
  highlight,
  points,
  cta,
}: {
  name: string;
  highlight: boolean;
  points: string[];
  cta: { label: string; href: string; external?: boolean };
}) {
  return (
    <div
      className={`relative rounded-3xl border p-8 ${
        highlight
          ? "border-honey bg-card fb-shadow"
          : "border-line bg-card"
      }`}
    >
      {highlight ? (
        <span className="absolute right-6 top-6 rounded-full bg-honey px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2b1e12]">
          Optional
        </span>
      ) : null}
      <h3 className="font-display text-2xl font-semibold text-ink">{name}</h3>
      <ul className="mt-6 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-[15px] text-ink">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-pine/15 text-pine">
              <Check />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {cta.external ? (
          <a href={cta.href} className={btnGhost} rel="noreferrer">
            {cta.label}
          </a>
        ) : (
          <Link href={cta.href} className={btnGhost}>
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function SuggestionRow({
  name,
  text,
  status,
}: {
  name: string;
  text: string;
  status: "approved" | "pending";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper-2/50 p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-honey/20 font-mono text-xs font-bold text-honey-ink">
        {name.slice(0, 2)}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-ink">
        <span className="text-ink-soft">@{name}</span> — {text}
      </p>
      {status === "approved" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-pine/15 px-2.5 py-1 text-xs font-semibold text-pine">
          <Check /> Approved
        </span>
      ) : (
        <span className="rounded-full bg-honey/15 px-2.5 py-1 text-xs font-semibold text-honey-ink">
          Pending
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Icons — simple line marks, kept in one place                       */
/* ------------------------------------------------------------------ */

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-9.2-8.4A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 9.2 5.6C19 15.6 12 20 12 20Z" />
        </svg>
      );
    default:
      return null;
  }
}

function Underline() {
  return (
    <svg
      className="absolute -bottom-2 left-0 h-3 w-full text-honey"
      viewBox="0 0 200 12"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M2 8c40-6 120-6 196 0"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12 4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
