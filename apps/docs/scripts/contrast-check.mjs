// WCAG contrast check for the FluffBoost palette.
// Run: bun apps/docs/scripts/contrast-check.mjs
// AA needs >= 4.5 for normal text, >= 3.0 for large/bold text and UI.

const L = {
  paper: "#fbf4e9",
  paper2: "#f4e7d2",
  card: "#fffdf8",
  ink: "#2b1e12",
  inkSoft: "#5a4632",
  honey: "#e07c05",
  honeyInk: "#955000",
  berry: "#b4194a",
  berryInk: "#a3153f",
  pine: "#0e6e56",
  white: "#fffdf8",
};

const D = {
  paper: "#17110b",
  paper2: "#1f1710",
  card: "#23190f",
  ink: "#f6ead7",
  inkSoft: "#c8b39a",
  honey: "#f7a63a",
  honeyInk: "#f9b862",
  berry: "#ff7ca0",
  berryInk: "#ff8fae",
  pine: "#57d3af",
};

function lum(hex) {
  const c = hex.replace("#", "");
  const v = [0, 2, 4].map((i) => {
    const s = parseInt(c.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function ratio(a, b) {
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// [label, fg, bg, minimum]  (min 3.0 = large/bold text or UI element)
const pairs = [
  ["L body ink / paper", L.ink, L.paper, 4.5],
  ["L muted / paper", L.inkSoft, L.paper, 4.5],
  ["L muted / card", L.inkSoft, L.card, 4.5],
  ["L honey link / paper", L.honeyInk, L.paper, 4.5],
  ["L berry link / paper", L.berryInk, L.paper, 4.5],
  ["L pine / paper", L.pine, L.paper, 4.5],
  ["L body ink / paper-2", L.ink, L.paper2, 4.5],
  ["L primary btn: ink on honey", L.ink, L.honey, 4.5],
  ["L berry btn: white on berry", L.white, L.berry, 4.5],
  ["L pine badge: white on pine", L.white, L.pine, 4.5],
  ["D body ink / paper", D.ink, D.paper, 4.5],
  ["D muted / paper", D.inkSoft, D.paper, 4.5],
  ["D muted / card", D.inkSoft, D.card, 4.5],
  ["D honey link / paper", D.honeyInk, D.paper, 4.5],
  ["D berry link / paper", D.berryInk, D.paper, 4.5],
  ["D pine / paper", D.pine, D.paper, 4.5],
  ["D primary btn: dark on honey", D.paper, D.honey, 4.5],
];

let fails = 0;
for (const [label, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const aa = r >= 4.5;
  const aaa = r >= 7;
  const ok = r >= min;
  if (!ok) fails++;
  const tag = aaa ? "AAA" : aa ? "AA " : ok ? "AA-lg" : "FAIL";
  console.log(`${ok ? "✓" : "✗"} ${tag} ${r.toFixed(2).padStart(5)}  ${label}`);
}

console.log(`\n${fails === 0 ? "All pairs pass." : fails + " FAILED"}`);
process.exit(fails === 0 ? 0 : 1);
