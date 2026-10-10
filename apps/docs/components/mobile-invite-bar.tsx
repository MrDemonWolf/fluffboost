"use client";

import { useEffect, useState } from "react";
import { PawMark } from "@/components/brand";
import { site } from "@/lib/site";

export function MobileInviteBar() {
  const [pastHero, setPastHero] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("home-hero");
    if (!hero) return;

    // Shown only once the hero has scrolled off the top (not while it is still below the fold).
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Stay up while the link holds keyboard focus so focus is never left in an off-screen bar.
  const visible = pastHero || hasFocus;

  return (
    <aside
      aria-label="Add FluffBoost to Discord"
      aria-hidden={!visible}
      // inert removes the hidden bar from the tab order and blurs anything focused in it.
      inert={!visible}
      data-testid="mobile-invite-bar"
      // global.css reserves scroll-padding for the bar while it is visible (WCAG 2.4.11).
      data-mobile-invite-bar=""
      data-visible={visible ? "true" : "false"}
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card/95 px-4 pt-3 shadow-[0_-10px_28px_-22px_rgba(43,30,18,0.45)] backdrop-blur-xl transition-transform duration-200 sm:hidden [@media(max-height:30rem)]:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      // env() insets stay 0 until the root viewport opts into viewport-fit=cover;
      // the 0.75rem floor applies either way.
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold leading-tight text-ink">
          A daily boost for your server
        </p>
        <a
          href={site.inviteUrl}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-honey px-5 font-display text-sm font-semibold text-on-honey shadow-sm transition-[filter,transform] hover:brightness-[1.05] active:translate-y-px"
          rel="noreferrer"
        >
          <PawMark className="size-4" />
          Add to Discord
        </a>
      </div>
    </aside>
  );
}
