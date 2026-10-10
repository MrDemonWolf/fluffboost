// WCAG contrast check for the FluffBoost palette.
// Run: bun run check:contrast (from apps/docs) — exits 1 if any pair fails.
// AA needs >= 4.5 for normal text, >= 3.0 for large/bold text and UI parts
// (icons, focus indicators).
//
// The palette is read from the :root and .dark blocks of app/global.css, so a
// retuned token is checked as soon as it changes. A token the pairs below need
// but global.css no longer defines as #rrggbb (or var(--…) of one) fails loudly.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dirname, "../app/global.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function declarations(selector) {
  const tokens = {};
  const block = new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]*)\\}`, "g");
  for (const [, body] of css.matchAll(block)) {
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      tokens[name] = value.trim();
    }
  }
  return tokens;
}

const lightTokens = declarations(":root");
// .dark sits on <html> next to :root, so it inherits every token it does not override.
const darkTokens = { ...lightTokens, ...declarations("\\.dark") };

function palette(tokens, theme) {
  const resolveToken = (name, seen = []) => {
    const value = tokens[name];
    if (value === undefined) throw new Error(`${theme}: --${name} is not defined in app/global.css`);
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    const ref = /^var\(--([\w-]+)\)$/.exec(value);
    if (ref && !seen.includes(name)) return resolveToken(ref[1], [...seen, name]);
    throw new Error(`${theme}: --${name} is "${value}", expected #rrggbb or var(--token)`);
  };
  return (name) => resolveToken(name);
}

function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Composite `hex` at `alpha` over an opaque background, as Tailwind's
// `bg-token/NN` utilities render.
function over(hex, alpha, bg) {
  const fg = rgb(hex);
  const back = rgb(bg);
  return `#${fg
    .map((c, i) => Math.round(c * alpha + (back[i] ?? 0) * (1 - alpha)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function lum(hex) {
  const v = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function ratio(a, b) {
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// [label, fg, bg, minimum] for the pairs the markup actually renders.
function pairsFor(t) {
  const tinted = over(t("fb-paper-2"), 0.6, t("fb-paper")); // Section tinted band
  const row = over(t("fb-paper-2"), 0.5, t("fb-card")); // suggestion row
  return [
    ["body ink / paper", t("fb-ink"), t("fb-paper"), 4.5],
    ["body ink / paper-2", t("fb-ink"), t("fb-paper-2"), 4.5],
    ["body ink / card", t("fb-ink"), t("fb-card"), 4.5],
    ["muted / paper", t("fb-ink-soft"), t("fb-paper"), 4.5],
    ["muted / paper-2 (footer)", t("fb-ink-soft"), t("fb-paper-2"), 4.5],
    ["muted / card", t("fb-ink-soft"), t("fb-card"), 4.5],
    ["muted / tinted band", t("fb-ink-soft"), tinted, 4.5],
    ["honey-ink / paper", t("fb-honey-ink"), t("fb-paper"), 4.5],
    ["honey-ink / paper-2 (footer)", t("fb-honey-ink"), t("fb-paper-2"), 4.5],
    ["honey-ink / card (step numerals)", t("fb-honey-ink"), t("fb-card"), 4.5],
    ["honey-ink eyebrow / tinted band", t("fb-honey-ink"), tinted, 4.5],
    ["honey-ink / honey-15 badge", t("fb-honey-ink"), over(t("fb-honey"), 0.15, t("fb-card")), 4.5],
    ["honey-ink / honey-20 initials", t("fb-honey-ink"), over(t("fb-honey"), 0.2, row), 4.5],
    ["honey-ink icon / honey-14 tile", t("fb-honey-ink"), over(t("fb-honey"), 0.14, t("fb-card")), 3],
    ["berry-ink icon / berry-12 tile", t("fb-berry-ink"), over(t("fb-berry"), 0.12, t("fb-card")), 3],
    ["pine / pine-15 badge on card", t("fb-pine"), over(t("fb-pine"), 0.15, t("fb-card")), 4.5],
    ["pine / pine-15 badge on row", t("fb-pine"), over(t("fb-pine"), 0.15, row), 4.5],
    ["on-honey / honey (buttons)", t("fb-on-honey"), t("fb-honey"), 4.5],
    ["docs primary fg / primary", t("color-fd-primary-foreground"), t("color-fd-primary"), 4.5],
    ["focus ring / paper", t("fb-focus"), t("fb-paper"), 3],
    ["focus ring / paper-2", t("fb-focus"), t("fb-paper-2"), 3],
    ["focus ring / card", t("fb-focus"), t("fb-card"), 3],
    ["docs ring / paper", t("color-fd-ring"), t("fb-paper"), 3],
  ];
}

let fails = 0;
for (const [theme, tokens] of [["L", lightTokens], ["D", darkTokens]]) {
  let pairs;
  try {
    pairs = pairsFor(palette(tokens, theme === "L" ? "light" : "dark"));
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  for (const [label, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) fails++;
    const tag = r >= 7 ? "AAA" : r >= 4.5 ? "AA " : ok ? "AA-lg" : "FAIL";
    console.log(`${ok ? "✓" : "✗"} ${tag} ${r.toFixed(2).padStart(5)}  ${theme} ${label} (min ${min})`);
  }
}

console.log(`\n${fails === 0 ? "All pairs pass." : fails + " FAILED"}`);
process.exit(fails === 0 ? 0 : 1);
