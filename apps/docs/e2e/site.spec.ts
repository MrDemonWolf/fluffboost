import { expect, test } from "@playwright/test";

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

test("published pages keep local links and assets inside the GitHub Pages base path", async ({ page, request }) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).hostname === "127.0.0.1" && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });

  const checked = new Set<string>();
  for (const route of ["./", "./docs/setup/", "./docs/premium/", "./privacy/", "./terms/"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
    );
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== "http://127.0.0.1:4173" || checked.has(url.pathname)) continue;
      expect(url.pathname, href).toMatch(/^\/fluffboost(?:\/|$)/);
      checked.add(url.pathname);
      const linkedPage = await request.get(url.pathname);
      expect(linkedPage.status(), `Broken internal link: ${href}`).toBe(200);
    }
    const overflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows, `Horizontal overflow on ${route}`).toBe(false);
  }
  expect(failures).toEqual([]);
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
