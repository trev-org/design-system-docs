#!/usr/bin/env node
/**
 * Lumen token build
 * -----------------
 * Single source of truth: figma/tokens/**.json (W3C DTCG format, Tokens Studio compatible).
 *
 * Generates:
 *   tokens/lumen.css                 CSS custom properties (light + dark) and type utility classes
 *   tokens/lumen.tokens.json         Flat, fully resolved token map (handy for JS / tooling)
 *   snippets/generated/*.mdx         Tables and swatches used by the docs pages
 *
 * Usage:  node scripts/build-tokens.mjs           (write files)
 *         node scripts/build-tokens.mjs --check   (exit 1 if generated files are stale)
 *
 * Zero dependencies. Node 18+.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS_DIR = join(ROOT, "figma/tokens");
const CHECK = process.argv.includes("--check");
const PREFIX = "lumen";

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------
const readJson = (p) => JSON.parse(readFileSync(join(TOKENS_DIR, p), "utf8"));
const metadata = readJson("$metadata.json");
const sets = Object.fromEntries(metadata.tokenSetOrder.map((s) => [s, readJson(`${s}.json`)]));

/** Flatten a DTCG tree into [{ path: ["color","brand","500"], token }] */
function flatten(tree, path = [], out = []) {
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith("$")) continue;
    if (node && typeof node === "object" && "$value" in node) out.push({ path: [...path, key], token: node });
    else if (node && typeof node === "object") flatten(node, [...path, key], out);
  }
  return out;
}

const SHARED_SETS = metadata.tokenSetOrder.filter((s) => !s.startsWith("semantic/"));
const shared = SHARED_SETS.flatMap((s) => flatten(sets[s]).map((t) => ({ ...t, set: s })));
const light = flatten(sets["semantic/light"]);
const dark = flatten(sets["semantic/dark"]);

const byPath = new Map(shared.map((t) => [t.path.join("."), t]));
const lightByPath = new Map(light.map((t) => [t.path.join("."), t]));
const darkByPath = new Map(dark.map((t) => [t.path.join("."), t]));

const ALIAS = /^\{([^}]+)\}$/;
/** Resolve an alias string like "{color.brand.500}" against shared + a mode map */
function resolveValue(value, modeMap, seen = new Set()) {
  if (typeof value === "string") {
    const m = value.match(ALIAS);
    if (!m) return value;
    const key = m[1];
    if (seen.has(key)) throw new Error(`Circular alias: ${key}`);
    seen.add(key);
    const target = (modeMap && modeMap.get(key)) || byPath.get(key);
    if (!target) throw new Error(`Unresolved alias {${key}}`);
    return resolveValue(target.token.$value, modeMap, seen);
  }
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, modeMap, new Set(seen)));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveValue(v, modeMap, new Set(seen))]));
  return value;
}

// light & dark semantic files must define the same tokens
for (const k of lightByPath.keys()) if (!darkByPath.has(k)) throw new Error(`semantic/dark is missing ${k}`);
for (const k of darkByPath.keys()) if (!lightByPath.has(k)) throw new Error(`semantic/light is missing ${k}`);

// ---------------------------------------------------------------------------
// CSS helpers
// ---------------------------------------------------------------------------
const cssVar = (path) => `--${PREFIX}-${path.join("-")}`;
const aliasToVar = (v) => {
  const m = typeof v === "string" && v.match(ALIAS);
  return m ? `var(${cssVar(m[1].split("."))})` : null;
};
const pctToEm = (v) => (typeof v === "string" && v.endsWith("%") ? `${parseFloat(v) / 100}em` : v);
const fallbackFor = (familyPath) => byPath.get(familyPath)?.token.$extensions?.["com.lumen"]?.fallback;
const fontStack = (name, path) => {
  const fb = fallbackFor(path);
  const quoted = /\s/.test(name) ? `'${name}'` : name;
  return fb ? `${quoted}, ${fb}` : quoted;
};
const shadowCss = (layers) =>
  (Array.isArray(layers) ? layers : [layers])
    .map((l) => `${l.inset ? "inset " : ""}${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} ${l.color}`)
    .join(", ");

function cssValue({ path, token }) {
  const t = token.$type;
  const raw = token.$value;
  const alias = aliasToVar(raw);
  if (alias) return alias;
  switch (t) {
    case "fontFamily":
      return fontStack(raw, path.join("."));
    case "cubicBezier":
      return `cubic-bezier(${raw.join(", ")})`;
    case "shadow":
      return shadowCss(resolveValue(raw));
    case "dimension":
      return pctToEm(raw);
    default:
      return String(raw);
  }
}

// ---------------------------------------------------------------------------
// Build CSS
// ---------------------------------------------------------------------------
const header = `/* Lumen Design System tokens. GENERATED by scripts/build-tokens.mjs from figma/tokens. Do not edit by hand. */`;
const lines = [header, "", ":root {"];
let currentSet = null;
for (const t of shared) {
  if (t.token.$type === "typography") continue;
  if (t.set !== currentSet) {
    lines.push(`  /* ${t.set} */`);
    currentSet = t.set;
  }
  lines.push(`  ${cssVar(t.path)}: ${cssValue(t)};`);
}
// typography composites -> font shorthand + letter-spacing
const typeStyles = shared.filter((t) => t.token.$type === "typography");
lines.push("  /* typography styles */");
for (const t of typeStyles) {
  const v = t.token.$value;
  const fam = aliasToVar(v.fontFamily);
  lines.push(
    `  ${cssVar(t.path)}: ${aliasToVar(v.fontWeight)} ${aliasToVar(v.fontSize)}/${aliasToVar(v.lineHeight)} ${fam};`,
    `  ${cssVar(t.path)}-letter-spacing: ${aliasToVar(v.letterSpacing)};`
  );
}
lines.push("}", "");

const modeBlock = (selector, list, comment) => {
  const out = [`/* ${comment} */`, `${selector} {`];
  for (const t of list) out.push(`  ${cssVar(t.path)}: ${cssValue(t)};`);
  out.push("}", "");
  return out;
};
lines.push(...modeBlock(`:root,\n[data-theme="light"],\n.light`, light, "Semantic: Light mode (default)"));
lines.push(...modeBlock(`[data-theme="dark"],\n.dark`, dark, "Semantic: Dark mode"));
lines.push(
  "/* Opt-in: follow the OS setting when no explicit theme is set */",
  "@media (prefers-color-scheme: dark) {",
  `  :root[data-theme="system"] {`,
  ...dark.map((t) => `    ${cssVar(t.path)}: ${cssValue(t)};`),
  "  }",
  "}",
  ""
);
lines.push("/* Type style utility classes */");
for (const t of typeStyles) {
  const name = t.path.slice(1).join("-");
  lines.push(
    `.${PREFIX}-text-${name} { font: var(${cssVar(t.path)}); letter-spacing: var(${cssVar(t.path)}-letter-spacing); }`
  );
}
lines.push("");
const css = lines.join("\n");

// ---------------------------------------------------------------------------
// Flat resolved JSON
// ---------------------------------------------------------------------------
const flat = { $generated: "scripts/build-tokens.mjs — do not edit", tokens: {} };
for (const t of shared)
  flat.tokens[t.path.join(".")] = { type: t.token.$type, value: resolveValue(t.token.$value), cssVar: cssVar(t.path) };
for (const t of light) {
  const k = t.path.join(".");
  flat.tokens[k] = {
    type: t.token.$type,
    light: resolveValue(t.token.$value, lightByPath),
    dark: resolveValue(darkByPath.get(k).token.$value, darkByPath),
    alias: { light: t.token.$value, dark: darkByPath.get(k).token.$value },
    cssVar: cssVar(t.path),
  };
}
const flatJson = JSON.stringify(flat, null, 2) + "\n";

// ---------------------------------------------------------------------------
// Contrast (WCAG 2.x)
// ---------------------------------------------------------------------------
function luminance(hex) {
  const h = hex.replace("#", "").slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const sem = (k, mode) => flat.tokens[k][mode];
const PAIRS = [
  ["color.text.primary", "color.bg.surface", 4.5, "Body text"],
  ["color.text.secondary", "color.bg.surface", 4.5, "Helper text"],
  ["color.text.tertiary", "color.bg.surface", 4.5, "Placeholder"],
  ["color.text.brand", "color.bg.surface", 4.5, "Links"],
  ["color.text.on-brand", "color.bg.brand", 4.5, "Primary button label"],
  ["color.text.on-brand", "color.bg.brand-hover", 4.5, "Primary button (hover)"],
  ["color.text.on-brand", "color.bg.danger", 4.5, "Danger button label"],
  ["color.text.inverse", "color.bg.inverse", 4.5, "Tooltip text"],
  ["color.text.success", "color.bg.success-subtle", 4.5, "Success alert text"],
  ["color.text.warning", "color.bg.warning-subtle", 4.5, "Warning alert text"],
  ["color.text.danger", "color.bg.danger-subtle", 4.5, "Danger alert text"],
  ["color.text.info", "color.bg.info-subtle", 4.5, "Info alert text"],
  ["color.text.brand", "color.bg.brand-subtle", 4.5, "Brand badge text"],
  ["color.text.secondary", "color.bg.muted", 4.5, "Neutral badge text"],
  ["color.bg.neutral-strong", "color.bg.surface", 3, "Switch track, off (non-text)"],
  ["color.border.strong", "color.bg.surface", 3, "Input border (non-text, 1.4.11)"],
  ["color.border.focus", "color.bg.surface", 3, "Focus ring (non-text, 1.4.11)"],
];
const contrastRows = PAIRS.map(([fg, bg, min, use]) => {
  const l = contrast(sem(fg, "light"), sem(bg, "light"));
  const d = contrast(sem(fg, "dark"), sem(bg, "dark"));
  return { fg, bg, min, use, l, d };
});
const failures = contrastRows.filter((r) => r.l < r.min || r.d < r.min);

// ---------------------------------------------------------------------------
// MDX snippets
// ---------------------------------------------------------------------------
const GEN_NOTE = "{/* GENERATED by scripts/build-tokens.mjs from figma/tokens. Do not edit by hand. */}\n\n";
const code = (s) => "`" + s + "`";
const swatch = (hex) =>
  `<span className="lm-swatch" style={{ background: "${hex}" }} />`;
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const snippets = {};

// Primitive palette (Mintlify <Color> component)
{
  const scales = Object.keys(sets.primitives.color).filter((k) => k !== "base");
  let s = GEN_NOTE + `<Color variant="table">\n`;
  s += `  <Color.Row title="Base">\n`;
  for (const [k, v] of Object.entries(sets.primitives.color.base))
    s += `    <Color.Item name="base.${k}" value="${v.$value}" />\n`;
  s += `  </Color.Row>\n`;
  for (const scale of scales) {
    s += `  <Color.Row title="${titleCase(scale)}">\n`;
    for (const [step, v] of Object.entries(sets.primitives.color[scale])) {
      if (step.startsWith("$")) continue;
      s += `    <Color.Item name="${step}" value="${v.$value}" />\n`;
    }
    s += `  </Color.Row>\n`;
  }
  s += `</Color>\n`;
  snippets["color-primitives.mdx"] = s;

  // Reference table of primitive hex values
  let t = GEN_NOTE + `| Step | ${scales.map(titleCase).join(" | ")} |\n|---|${scales.map(() => "---").join("|")}|\n`;
  const steps = Object.keys(sets.primitives.color.brand).filter((k) => !k.startsWith("$"));
  for (const step of steps)
    t += `| **${step}** | ${scales.map((sc) => code(sets.primitives.color[sc][step].$value)).join(" | ")} |\n`;
  snippets["color-primitives-table.mdx"] = t;
}

// Semantic color tables, one per group
for (const group of Object.keys(sets["semantic/light"].color)) {
  const rows = light.filter((t) => t.path[1] === group);
  let s = GEN_NOTE;
  s += `<Color variant="compact">\n`;
  for (const t of rows) {
    const k = t.path.join(".");
    s += `  <Color.Item name="${t.path.slice(1).join(".")}" value={{ light: "${flat.tokens[k].light}", dark: "${flat.tokens[k].dark}" }} />\n`;
  }
  s += `</Color>\n\n`;
  s += `| Token | Light | Dark | Use for |\n|---|---|---|---|\n`;
  for (const t of rows) {
    const k = t.path.join(".");
    const f = flat.tokens[k];
    const strip = (a) => a.replace(/[{}]/g, "").replace(/^color\./, "");
    s += `| ${code(k)}<br/><small>${code(cssVar(t.path))}</small> | ${swatch(f.light)} ${code(strip(f.alias.light))}<br/><small>${f.light}</small> | ${swatch(f.dark)} ${code(strip(f.alias.dark))}<br/><small>${f.dark}</small> | ${t.token.$description || ""} |\n`;
  }
  snippets[`color-semantic-${group}.mdx`] = s;
}

// Contrast report
{
  const fmt = (x) => x.toFixed(2) + ":1";
  const badge = (ok) => (ok ? `<Badge color="green" size="sm">Pass</Badge>` : `<Badge color="red" size="sm">Fail</Badge>`);
  let s = GEN_NOTE + `| Pairing | Foreground / background | Min | Light | Dark |\n|---|---|---|---|---|\n`;
  for (const r of contrastRows)
    s += `| ${r.use} | ${code(r.fg.replace("color.", ""))} on ${code(r.bg.replace("color.", ""))} | ${r.min}:1 | ${fmt(r.l)} ${badge(r.l >= r.min)} | ${fmt(r.d)} ${badge(r.d >= r.min)} |\n`;
  snippets["contrast.mdx"] = s;
}

// Typography primitives
{
  const f = sets.typography.font;
  let s = GEN_NOTE + `| Token | Value | CSS variable |\n|---|---|---|\n`;
  for (const [k, v] of Object.entries(f.family))
    s += `| ${code(`font.family.${k}`)} | **${v.$value}**<br/><small>fallback: ${v.$extensions?.["com.lumen"]?.fallback ?? "—"}</small> | ${code(cssVar(["font", "family", k]))} |\n`;
  for (const [k, v] of Object.entries(f.weight))
    s += `| ${code(`font.weight.${k}`)} | ${v.$value} | ${code(cssVar(["font", "weight", k]))} |\n`;
  snippets["type-families.mdx"] = s;

  let z = GEN_NOTE + `| Size token | Value | Line-height token | Value |\n|---|---|---|---|\n`;
  const sizes = Object.entries(f.size);
  const lhs = Object.entries(f["line-height"]);
  for (let i = 0; i < Math.max(sizes.length, lhs.length); i++) {
    const a = sizes[i], b = lhs[i];
    z += `| ${a ? code(`font.size.${a[0]}`) : ""} | ${a ? a[1].$value : ""} | ${b ? code(`font.line-height.${b[0]}`) : ""} | ${b ? b[1].$value : ""} |\n`;
  }
  z += `\n| Letter-spacing token | Figma value | CSS value |\n|---|---|---|\n`;
  for (const [k, v] of Object.entries(f["letter-spacing"]))
    z += `| ${code(`font.letter-spacing.${k}`)} | ${v.$value} | ${pctToEm(v.$value)} |\n`;
  snippets["type-scale-primitives.mdx"] = z;
}

// Typography styles: live specimen + spec table
{
  let s = GEN_NOTE + `<div className="lm-type-specimens not-prose">\n`;
  for (const t of typeStyles) {
    const r = resolveValue(t.token.$value);
    const famPath = t.token.$value.fontFamily.replace(/[{}]/g, "");
    const name = t.path.slice(1).join("-");
    s += `  <div className="lm-type-row">\n`;
    s += `    <div className="lm-type-meta"><code>${t.path.slice(1).join(".")}</code><span>${parseInt(r.fontSize)}/${parseInt(r.lineHeight)} · ${r.fontWeight}</span></div>\n`;
    s += `    <div className="lm-type-sample lumen-text-${name}">${t.path[1] === "code" ? "const theme = createTheme();" : "Design with clarity"}</div>\n`;
    s += `  </div>\n`;
    void famPath;
  }
  s += `</div>\n\n`;
  s += `| Style | Family | Size | Line height | Weight | Letter spacing | Use for |\n|---|---|---|---|---|---|---|\n`;
  for (const t of typeStyles) {
    const r = resolveValue(t.token.$value);
    s += `| ${code(t.path.join("."))} | ${r.fontFamily} | ${r.fontSize} | ${r.lineHeight} | ${r.fontWeight} | ${r.letterSpacing} | ${t.token.$description || ""} |\n`;
  }
  snippets["type-styles.mdx"] = s;
}

// Spacing
{
  let s = GEN_NOTE + `| Token | Value | CSS variable | Scale |\n|---|---|---|---|\n`;
  for (const t of shared.filter((t) => t.path[0] === "space")) {
    s += `| ${code(t.path.join("."))} | ${t.token.$value} | ${code(cssVar(t.path))} | <span className="lm-space-bar" style={{ width: "${t.token.$value}" }} /> |\n`;
  }
  snippets["spacing.mdx"] = s;
}

// Radius + border width
{
  let s = GEN_NOTE + `<div className="lm-token-grid not-prose">\n`;
  for (const t of shared.filter((t) => t.path[0] === "radius")) {
    s += `  <div className="lm-token-tile"><div className="lm-radius-demo" style={{ borderRadius: "${t.token.$value}" }} /><code>${t.path.join(".")}</code><span>${t.token.$value}</span></div>\n`;
  }
  s += `</div>\n\n| Token | Value | CSS variable | Use for |\n|---|---|---|---|\n`;
  for (const t of shared.filter((t) => t.path[0] === "radius" || t.path[0] === "border-width"))
    s += `| ${code(t.path.join("."))} | ${t.token.$value} | ${code(cssVar(t.path))} | ${t.token.$description || ""} |\n`;
  snippets["radius.mdx"] = s;
}

// Shadows + z-index
{
  let s = GEN_NOTE + `<div className="lm-token-grid lm-token-grid--shadows not-prose">\n`;
  for (const t of shared.filter((t) => t.path[0] === "shadow" && t.path[1] !== "none")) {
    s += `  <div className="lm-token-tile"><div className="lm-shadow-demo" style={{ boxShadow: "${shadowCss(resolveValue(t.token.$value))}" }} /><code>${t.path.join(".")}</code><span>${t.token.$description}</span></div>\n`;
  }
  s += `</div>\n\n| Token | CSS value | Use for |\n|---|---|---|\n`;
  for (const t of shared.filter((t) => t.path[0] === "shadow"))
    s += `| ${code(t.path.join("."))} | ${code(shadowCss(resolveValue(t.token.$value)))} | ${t.token.$description || ""} |\n`;
  s += `\n| Layer token | z-index |\n|---|---|\n`;
  for (const t of shared.filter((t) => t.path[0] === "z-index")) s += `| ${code(t.path.join("."))} | ${t.token.$value} |\n`;
  snippets["shadows.mdx"] = s;
}

// Motion
{
  let s = GEN_NOTE + `| Duration token | Value | CSS variable | Use for |\n|---|---|---|---|\n`;
  for (const t of shared.filter((t) => t.path[0] === "duration"))
    s += `| ${code(t.path.join("."))} | ${t.token.$value} | ${code(cssVar(t.path))} | ${t.token.$description} |\n`;
  s += `\n| Easing token | Value | CSS variable | Use for |\n|---|---|---|---|\n`;
  for (const t of shared.filter((t) => t.path[0] === "easing"))
    s += `| ${code(t.path.join("."))} | ${code(cssValue(t))} | ${code(cssVar(t.path))} | ${t.token.$description} |\n`;
  snippets["motion.mdx"] = s;
}

// Breakpoints
{
  let s = GEN_NOTE + `| Token | Min width | Media query | Typical devices |\n|---|---|---|---|\n`;
  const devices = { sm: "Large phones (landscape)", md: "Tablets (portrait)", lg: "Tablets (landscape), small laptops", xl: "Laptops and desktops", "2xl": "Large desktops" };
  for (const t of shared.filter((t) => t.path[0] === "breakpoint"))
    s += `| ${code(t.path.join("."))} | ${t.token.$value} | ${code(`@media (min-width: ${t.token.$value})`)} | ${devices[t.path[1]] ?? ""} |\n`;
  snippets["breakpoints.mdx"] = s;
}

// Token count summary
{
  const count = shared.length + light.length;
  snippets["token-stats.mdx"] =
    GEN_NOTE +
    `export const tokenStats = { total: ${count}, primitives: ${shared.filter((t) => t.path[0] === "color").length}, semantic: ${light.length}, typeStyles: ${typeStyles.length} };\n`;
}

// ---------------------------------------------------------------------------
// Write / check
// ---------------------------------------------------------------------------
const outputs = {
  "tokens/lumen.css": css,
  "tokens/lumen.tokens.json": flatJson,
  ...Object.fromEntries(Object.entries(snippets).map(([k, v]) => [`snippets/generated/${k}`, v])),
};
let stale = [];
for (const [rel, content] of Object.entries(outputs)) {
  const full = join(ROOT, rel);
  if (CHECK) {
    if (!existsSync(full) || readFileSync(full, "utf8") !== content) stale.push(rel);
    continue;
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

console.log(`Lumen tokens: ${shared.length} shared + ${light.length} semantic (x2 modes), ${typeStyles.length} type styles.`);
for (const r of contrastRows)
  console.log(
    `  contrast ${r.use.padEnd(32)} light ${r.l.toFixed(2).padStart(5)}  dark ${r.d.toFixed(2).padStart(5)}  (min ${r.min})${r.l < r.min || r.d < r.min ? "  <-- FAIL" : ""}`
  );
if (failures.length) {
  console.error(`\n${failures.length} contrast pairing(s) below WCAG AA.`);
  process.exitCode = 1;
}
if (CHECK) {
  if (stale.length) {
    console.error(`\nStale generated files (run: node scripts/build-tokens.mjs):\n  ${stale.join("\n  ")}`);
    process.exitCode = 1;
  } else console.log("Generated files are up to date.");
} else console.log(`Wrote ${Object.keys(outputs).length} files.`);
