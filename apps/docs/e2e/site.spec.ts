import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// lib/site.ts `origin`: canonical, og:url and sitemap URLs are absolute on it.
const SITE_ORIGIN = "https://mrdemonwolf.github.io/fluffboost";

/** Every exported page, read from the generated sitemap so new pages are swept automatically. */
async function exportedPages(request: APIRequestContext) {
  const response = await request.get("sitemap.xml");
  expect(response.status(), "sitemap.xml").toBe(200);
  const urls = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
  for (const url of urls) expect(url.startsWith(`${SITE_ORIGIN}/`), url).toBe(true);
  return urls;
}

/** The visible search trigger: "Search ⌘K" on wide layouts, the "Open Search" icon on narrow ones. */
function searchTrigger(page: Page) {
  return page.getByRole("button", { name: /^(Open )?Search/ }).filter({ visible: true }).first();
}

test("the banner plays real video and can be paused", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");
  const video = page.locator("video");
  await expect(page.getByRole("button", { name: "Pause animation" })).toBeVisible();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).videoWidth)).toBe(680);
  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(video).toHaveCount(0);
  await page.getByRole("button", { name: "Play animation" }).click();
  await expect(video).toBeVisible();
});

test("reduced motion shows the poster without autoplay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Play animation" })).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "A warm sunrise over a woodland mountain lake" })).toBeVisible();
});

test("a server owner can reach setup and activate premium from the landing page", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your daily dose of furry motivation.");
  await page.getByRole("link", { name: "Read the guide", exact: true }).click();
  await page.getByRole("link", { name: /set the channel/i }).click();
  await expect(page).toHaveURL(/\/fluffboost\/docs\/setup\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/set up/i);
  await expect(page.locator("body")).toContainText("/setup channel");

  await page.goto("./docs/premium/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Premium");
  await expect(page.locator("body")).toContainText("/premium");
  await expect(page.locator("body")).toContainText("/setup schedule");
});

test("legal pages are reachable from the landing footer and survive a reload", async ({ page }) => {
  for (const [name, route] of [["Privacy Policy", "privacy"], ["Terms of Service", "terms"]] as const) {
    await page.goto("./");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/fluffboost/${route}/?$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    const response = await page.reload();
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  }
});

test("every exported page keeps links and assets inside the base path and has its own metadata", async ({
  page,
  request,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).hostname === "127.0.0.1" && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });

  const pages = await exportedPages(request);
  // Home, Privacy, Terms, the Guide and the Developers docs.
  expect(pages.length).toBeGreaterThanOrEqual(18);
  for (const path of ["/", "/docs/setup/", "/developers/testing/", "/privacy/", "/terms/"]) {
    expect(pages, `sitemap lists ${path}`).toContain(`${SITE_ORIGIN}${path}`);
  }

  const listed = new Set(pages.map((url) => new URL(url).pathname));
  const checked = new Set<string>();
  for (const url of pages) {
    const route = `.${url.slice(SITE_ORIGIN.length)}`;
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main"), `one <main> on ${route}`).toHaveCount(1);

    // Link previews and search engines read these, not <title>.
    const meta = await page.evaluate(() => ({
      title: document.title,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    }));
    expect(meta.ogTitle, `og:title on ${route}`).toBe(meta.title);
    expect(meta.canonical, `canonical on ${route}`).toBe(url);
    expect(meta.ogUrl, `og:url on ${route}`).toBe(url);

    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
    );
    for (const href of hrefs) {
      const link = new URL(href);
      if (link.origin !== "http://127.0.0.1:4173" || checked.has(link.pathname)) continue;
      expect(link.pathname, href).toMatch(/^\/fluffboost(?:\/|$)/);
      checked.add(link.pathname);
      const linkedPage = await request.get(link.pathname);
      expect(linkedPage.status(), `Broken internal link: ${href}`).toBe(200);
      expect(listed.has(link.pathname), `${link.pathname} is linked but missing from sitemap.xml`).toBe(true);
    }
    const overflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows, `Horizontal overflow on ${route}`).toBe(false);
  }
  expect(failures).toEqual([]);
});

test("a missing page gets the branded 404 with a way back", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  const response = await page.goto("./no-such-page/");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found · FluffBoost");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.locator("main")).toHaveCount(1);
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Guide", exact: true })).toHaveAttribute("href", "/fluffboost/docs/");
  await main.getByRole("link", { name: "FluffBoost home" }).click();
  await expect(page).toHaveURL(/\/fluffboost\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your daily dose of furry motivation.");
  expect(failures).toEqual([]);
});

test("static search finds a guide page and returns focus to its trigger", async ({ page, request }) => {
  const index = await request.get("api/search");
  expect(index.status()).toBe(200);
  expect((await index.json()).type).toBe("advanced");

  await page.goto("./docs/setup/");
  const trigger = searchTrigger(page);
  const dialog = page.getByRole("dialog");

  // Closing without choosing a result hands focus back to the opener (WCAG 2.4.3).
  await trigger.click();
  await expect(dialog.getByPlaceholder("Search")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByPlaceholder("Search").fill("schedule");
  await dialog.getByRole("button", { name: /Change when quotes arrive/ }).first().click();
  // The result href carries the base path.
  await expect(page).toHaveURL(/\/fluffboost\/docs\/scheduling\/?(#.*)?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Change when quotes arrive");
});

test("search explains a failed index download and can retry", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The search error state is viewport-independent.");
  let failIndex = true;
  await page.route(
    (url) => url.pathname.endsWith("/api/search"),
    (route) => (failIndex ? route.abort() : route.fallback()),
  );
  await page.goto("./docs/");
  await searchTrigger(page).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Search").fill("premium");
  await expect(dialog.getByRole("alert")).toHaveText("Search is unavailable right now.");

  failIndex = false;
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /Premium/ }).first()).toBeVisible();
});

test("keyboard focus starts at the skip link and stays visible and uncovered", async ({ page }) => {
  for (const route of ["./", "./docs/setup/"]) {
    await page.goto(route);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" }), route).toBeFocused();

    const problems: string[] = [];
    let stops = 0;
    for (let step = 0; step < 120; step += 1) {
      await page.keyboard.press("Tab");
      const result = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body) return { id: "end", problem: null };
        // Focus came back around to an element already checked.
        if (element.hasAttribute("data-e2e-visited")) return { id: "end", problem: null };
        element.setAttribute("data-e2e-visited", "");
        const label = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40);
        const id = `${element.tagName.toLowerCase()} "${label}"`;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return { id, problem: "has no size" };
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
          return { id, problem: "is outside the viewport" };
        }
        // Covered by fixed chrome such as the header or the mobile invite bar (WCAG 2.4.11).
        const hit = document.elementFromPoint(x, y);
        if (!hit || !element.contains(hit)) return { id, problem: `is covered by <${hit?.tagName.toLowerCase()}>` };
        const style = getComputedStyle(element);
        const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
        const ring = outline || style.boxShadow !== "none";
        if (!ring) return { id, problem: "has no visible focus indicator" };
        return { id, problem: null };
      });
      // Stop once focus leaves the page or wraps around.
      if (result.id === "end") break;
      stops += 1;
      if (result.problem) problems.push(`${route}: ${result.id} ${result.problem}`);
    }
    console.info(`Tab walk on ${route}: ${stops} focus stops`);
    expect(stops, `Tab walk on ${route}`).toBeGreaterThan(5);
    expect(problems).toEqual([]);
  }
});

test("the landing page fits narrow screens and its menu supports keyboard activation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One responsive sweep covers all viewport widths.");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})));
    });
    const metrics = await page.evaluate(() => {
      const heading = document.querySelector("h1")!;
      return {
        viewport: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        headings: document.querySelectorAll("h1").length,
        mainLandmarks: document.querySelectorAll("main").length,
        headingFontSize: getComputedStyle(heading).fontSize,
      };
    });
    expect(metrics.pageWidth).toBeLessThanOrEqual(width + 1);
    expect(metrics.headings).toBe(1);
    expect(metrics.mainLandmarks).toBe(1);
    console.info(`Landing metrics: ${JSON.stringify(metrics)}`);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}-viewport.png`) });
    if (width === 320) {
      const menu = page.getByRole("button", { name: "Toggle Menu", exact: true });
      await menu.focus();
      await expect(menu).toBeFocused();
      await menu.press("Enter");
      await expect(page.getByRole("link", { name: "Guide", exact: true }).first()).toBeVisible();
    }
  }
});

test("the mobile invite action appears after the hero and respects the home position", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The invite bar is mobile-only.");
  await page.goto("./");

  const inviteBar = page.getByTestId("mobile-invite-bar");
  await expect(inviteBar).toHaveAttribute("aria-hidden", "true");

  // inert keeps the off-screen bar's link out of the tab order.
  await expect(inviteBar).toHaveAttribute("inert", "");

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(inviteBar).toHaveAttribute("aria-hidden", "false");
  await expect(inviteBar).not.toHaveAttribute("inert");
  // Scoped to the bar: the page has other "Add to Discord" links.
  const invite = inviteBar.getByRole("link", { name: "Add to Discord" });
  await expect(invite).toBeVisible();
  await expect(invite).toHaveAttribute("href", /discord\.com/);
  const targetHeight = await invite.evaluate((element) => element.getBoundingClientRect().height);
  expect(targetHeight).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(inviteBar).toHaveAttribute("aria-hidden", "true");
});

test("the mobile docs drawer closes on Escape and returns focus to its trigger", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The drawer is the narrow-screen sidebar.");
  await page.goto("./docs/setup/");
  const trigger = page.getByRole("button", { name: "Open Sidebar" }).filter({ visible: true }).first();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest("#nd-sidebar-mobile"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Rule id plus offending selectors, so a failure names what to fix. */
async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
}

test("every exported page passes the automated WCAG 2.2 AA scan", async ({ page, request }) => {
  // Reduced motion settles reveal animations so contrast is measured on final colors.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const failures: { route: string; violations: Awaited<ReturnType<typeof axeViolations>> }[] = [];
  for (const url of await exportedPages(request)) {
    const route = `.${url.slice(SITE_ORIGIN.length)}`;
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const violations = await axeViolations(page);
    if (violations.length > 0) failures.push({ route, violations });
  }
  expect(failures).toEqual([]);
});

test("the visible mobile invite bar passes the automated WCAG 2.2 AA scan", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The invite bar is mobile-only.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByTestId("mobile-invite-bar")).toHaveAttribute("aria-hidden", "false");
  expect(await axeViolations(page)).toEqual([]);
});
