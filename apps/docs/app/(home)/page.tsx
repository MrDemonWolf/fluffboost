import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { site } from "@/lib/site";
import { BrandAvatar, PawMark } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import banner from "../../../../banner.jpg";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.description,
  alternates: { canonical: site.origin + "/" },
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
    body: "A thoughtful quote delivered to the channel you choose. The free daily schedule gives your community a gentle morning lift.",
  },
  {
    icon: "globe",
    title: "Every server, its own rhythm",
    body: "Premium lets you pick a time and timezone, plus daily, weekly, or monthly delivery. Make the ritual fit your community.",
  },
  {
    icon: "chat",
    title: "Community-written",
    body: "Suggest a quote with /suggestion. The FluffBoost team reviews submissions for a shared library that can encourage every server.",
  },
  {
    icon: "sparkle",
    title: "A boost on demand",
    body: "Need encouragement between daily posts? Run /quote for an instant pick from the motivation library.",
  },
  {
    icon: "shield",
    title: "One channel. Simple setup.",
    body: "Server administrators choose the delivery channel with /setup channel. The guide walks you through permissions and scheduling.",
  },
  {
    icon: "heart",
    title: "Open source, open paws",
    body: "Read the code, report a bug, or contribute an improvement. FluffBoost is built in the open by MrDemonWolf, Inc.",
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
    body: "Enjoy daily quotes at 8:00 AM America/Chicago. Try /quote now, or unlock custom timing with Premium.",
  },
];

const faqs = [
  {
    q: "Is FluffBoost free?",
    a: "The daily 8:00 AM America/Chicago quote, /quote, and quote suggestions are free. Premium adds custom delivery frequency, time, and timezone.",
  },
  {
    q: "Do I need to host anything?",
    a: "No. Just invite the hosted bot and run /setup channel. Developers who want to self-host will find everything in the Developers docs.",
  },
  {
    q: "Where do the quotes come from?",
    a: "A starter library and community suggestions reviewed by the FluffBoost team. Approved suggestions can be delivered to any server using the bot.",
  },
  {
    q: "What permissions does it need?",
    a: "FluffBoost needs View Channel, Send Messages, and Embed Links in your chosen text channel. Setup commands require Administrator. It does not monitor conversations; suggestion submitters may receive a review-result DM.",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  // HomeLayout already provides the <main> landmark, so this is a plain wrapper.
  return (
    <div className="flex-1">
      <Hero />
      <Ribbon />
      <Features />
      <Steps />
      <Premium />
      <Community />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
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
            className="fb-rise mt-6 text-balance font-display text-[clamp(2.6rem,6vw,4.4rem)] font-semibold leading-[1.03] tracking-tight text-ink"
            style={{ ["--d" as string]: "80ms" }}
          >
            Your daily dose of{" "}
            <span className="relative text-honey-ink">
              furry motivation
              <Underline />
            </span>
            .
          </h1>

          <p
            className="fb-rise mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-soft"
            style={{ ["--d" as string]: "160ms" }}
          >
            Make a little room for encouragement. FluffBoost brings uplifting
            quotes to your Discord community, with a free daily boost and
            optional Premium scheduling that fits your server's rhythm.
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
            Free daily quotes · Optional Premium · No separate account
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
      <div className="absolute -left-6 -top-6 hidden size-16 -rotate-6 place-items-center rounded-2xl bg-berry/12 text-berry-ink sm:grid">
        <PawMark className="size-8" />
      </div>

      <article className="fb-shadow relative rounded-3xl border border-line bg-card p-5">
        <Image
          src={banner}
          alt="FluffBoost's golden-eyed wolf greeting a warm sunrise"
          priority
          className="mb-5 h-auto w-full rounded-2xl"
        />
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <BrandAvatar className="size-10" />
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
            — Example quote
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
      className="relative flex overflow-hidden border-y border-line bg-paper-2 py-3.5"
      aria-hidden="true"
    >
      <div className="flex shrink-0 items-center gap-4 pr-4">
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
            <p className="mt-2 text-base leading-relaxed text-ink-soft">
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
      lede="A server administrator can get started with one channel and one command."
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
            <p className="mt-2 text-base leading-relaxed text-ink-soft">
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
      title="A daily boost, or a rhythm of your own"
      lede="Start with the free daily quote. Premium adds custom scheduling for one server, with purchase and billing handled inside Discord."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <PlanCard
          name="Free"
          highlight={false}
          points={[
            "Daily quote at 8:00 AM (America/Chicago)",
            "Instant motivation with /quote",
            "Suggestions reviewed by the FluffBoost team",
            "Choose your server's delivery channel",
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
          cta={{ label: "Activate Premium", href: "/docs/premium" }}
        />
      </div>
    </Section>
  );
}

function Community() {
  return (
    <Section eyebrow="Community" title="A little kindness can travel a long way" tinted>
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <p className="text-lg leading-relaxed text-ink-soft">
          Anyone can suggest a quote with{" "}
          <code className="rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-sm text-honey-ink">
            /suggestion
          </code>
          . The FluffBoost team reviews each submission. Approved quotes join
          the shared library and may brighten someone else's server, too.
          Submit only quotes you're comfortable sharing publicly.
        </p>
        <div className="fb-shadow rounded-3xl border border-line bg-card p-6">
          <p className="mb-4 text-sm font-semibold text-ink-soft">Example suggestions</p>
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
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
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
          <h2 className="mx-auto mt-6 max-w-2xl text-balance font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight text-ink">
            Give your server a little more warmth tomorrow morning.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
            Add FluffBoost, choose a channel, and let the next daily boost
            arrive at 8:00 AM America/Chicago.
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
          <h2 className="mt-3 text-balance font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-tight text-ink">
            {title}
          </h2>
          {lede ? (
            <p className="mt-3 text-pretty text-lg leading-relaxed text-ink-soft">
              {lede}
            </p>
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
          <li key={p} className="flex items-start gap-3 text-base text-ink">
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
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper-2/50 p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-honey/20 font-mono text-xs font-bold text-honey-ink">
        {name.slice(0, 2)}
      </span>
      <p className="min-w-0 flex-1 basis-40 text-sm text-ink">
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
