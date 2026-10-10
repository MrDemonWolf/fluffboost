"use client";

// Landmark and keyboard fixes layered onto the stock Fumadocs layouts without
// patching fumadocs-ui. These are client components because they are passed
// into Fumadocs' client layouts as slots or rendered inside their providers.

import { useEffect, type ComponentProps } from "react";
import { useDocsPage } from "fumadocs-ui/layouts/docs/page";
import { useSidebar } from "fumadocs-ui/layouts/docs/slots/sidebar";

/** First tab stop on every page; jumps past the header and sidebar navigation. */
export function SkipLink({ href }: { href: `#${string}` }) {
  return (
    <a href={href} className="fb-skip-link">
      Skip to content
    </a>
  );
}

/**
 * HomeLayout's default container is a <main> that also wraps the site header,
 * which leaves those pages without banner/contentinfo landmarks. A plain <div>
 * keeps its id and layout classes; each page renders its own <main>.
 */
export function HomeContainer({ className, children, id, style }: ComponentProps<"main">) {
  return (
    <div
      id={id ?? "nd-home-layout"}
      style={style}
      className={`flex flex-1 flex-col [--fd-layout-width:1400px] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * The stock docs page container renders an <article>, so docs pages have no
 * <main> landmark. Same id, grid area and spacing, rendered as <main>, with a
 * narrower column so body text stays near 75-85 characters per line.
 */
export function DocsMain({ className, children, style }: ComponentProps<"article">) {
  const { full } = useDocsPage();
  return (
    <main
      id="nd-page"
      data-full={full}
      style={style}
      className={`mx-auto flex w-full flex-col gap-4 px-4 py-6 [grid-area:main] md:px-6 md:pt-8 xl:px-8 xl:pt-14 ${
        full ? "max-w-[1168px]" : "max-w-[40rem]"
      } ${className ?? ""}`}
    >
      {children}
    </main>
  );
}

const SIDEBAR_TRIGGER = '#nd-subnav button[aria-label="Open Sidebar"]';
const PAGE_CONTENT = "#nd-page, [data-toc-popover], #nd-toc";

/**
 * fumadocs-ui 16.11's mobile docs drawer ignores Escape, lets Tab wander behind
 * its overlay, and its trigger never reports aria-expanded. Renders nothing.
 */
export function DocsDrawerA11y() {
  const { open, setOpen, mode } = useSidebar();
  const drawerOpen = open && mode === "drawer";

  useEffect(() => {
    const trigger = document.querySelector<HTMLElement>(SIDEBAR_TRIGGER);
    trigger?.setAttribute("aria-expanded", String(drawerOpen));
    if (drawerOpen) trigger?.setAttribute("aria-controls", "nd-sidebar-mobile");
    else trigger?.removeAttribute("aria-controls");
    if (!drawerOpen) return;

    const drawer = document.getElementById("nd-sidebar-mobile");
    const path = window.location.pathname;
    const background = [...document.querySelectorAll<HTMLElement>(PAGE_CONTENT)];
    background.forEach((element) => (element.inert = true));
    // The drawer is still `invisible` on its first frame, so focus it on the next one.
    const frame = requestAnimationFrame(() => {
      drawer?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      background.forEach((element) => (element.inert = false));
      // Hand focus back to the trigger unless the drawer closed by navigating away.
      const active = document.activeElement;
      const focusLost = !active || active === document.body || drawer?.contains(active);
      if (window.location.pathname === path && focusLost) trigger?.focus();
    };
  }, [drawerOpen, setOpen]);

  return null;
}
