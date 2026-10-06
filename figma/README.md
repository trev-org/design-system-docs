# Lumen Figma kit

Everything needed to build the **Lumen Design System** Figma library lives in this folder. Figma itself isn't stored in the repo; these files are the source from which the Figma file is built (and rebuilt when tokens change).

```
figma/
├── README.md              ← you are here
├── component-spec.md      ← layer-by-layer spec for every component set + page structure
└── tokens/                ← W3C Design Tokens (DTCG), Tokens Studio compatible
    ├── $metadata.json     ← token set order (Tokens Studio)
    ├── $themes.json       ← Light / Dark themes (Tokens Studio)
    ├── primitives.json    ← color scales             → collection "Primitives"
    ├── semantic/
    │   ├── light.json     ← semantic color aliases   → collection "Semantic", mode "Light"
    │   └── dark.json      ← semantic color aliases   → collection "Semantic", mode "Dark"
    ├── typography.json    ← font primitives + text styles → collection "Typography" + text styles
    ├── spacing.json       ← 4px scale                → collection "Spacing"
    ├── radius.json        ← radii + border widths    → collection "Radius"
    ├── effects.json       ← shadows (effect styles) + z-index (code only)
    ├── motion.json        ← durations + easings (code only, for prototyping)
    └── breakpoints.json   ← breakpoints (code only)
```

## Format

- Every token is `{ "$type": "...", "$value": ... }` with an optional `$description`.
- Semantic tokens alias primitives: `"$value": "{color.brand.600}"`.
- Dimensions are strings with units (`"16px"`). Letter spacing is in percent (`"-2%"`), which Figma expects; the CSS build converts it to `em`.
- Font family tokens hold the Figma family name (`"Inter"`); CSS fallbacks are stored in `$extensions["com.lumen"].fallback`.
- Shadows use the DTCG `shadow` type (`offsetX`, `offsetY`, `blur`, `spread`, `color`), as arrays for layered shadows.

## Option A: Tokens Studio for Figma (recommended)

1. Install **Tokens Studio for Figma** from the Figma Community.
2. **Settings → Token format:** choose **W3C DTCG**.
3. **Sync:** add a GitHub/GitLab sync provider pointing at this repository, branch `main`, file path `figma/tokens` (folder / multi-file mode). Without Git access, use **Tools → Load from file/folder** and select `figma/tokens`.
4. The plugin reads `$metadata.json` (set order) and `$themes.json` (themes **Light** and **Dark**, group **Mode**).
5. **Styles & Variables → Export styles & variables:** select both themes; export Color/Number/String variables plus Typography and Shadow styles. You get:
   - Collections for the shared sets (`primitives`, `typography`, `spacing`, `radius`; rename to Title Case if you like) and a themed collection named after the theme group, **Mode**, with **Light**/**Dark** modes. Rename it to **Semantic** to match the spec. (Exporting themes as modes requires Tokens Studio Pro; on the free plan, export each theme separately or use Option B.)
   - 15 text styles (`typography/heading/lg`, …) and 6 effect styles (`shadow/sm`, …).

## Option B: Native Figma variables import

Figma's Variables panel can import DTCG JSON into a collection, one file per mode:

| Collection | Mode(s) | Import |
|---|---|---|
| `Primitives` | Default | `tokens/primitives.json` |
| `Semantic` | Light, Dark | `tokens/semantic/light.json` → Light, `tokens/semantic/dark.json` → Dark |
| `Typography` | Default | `tokens/typography.json` (the `font.*` group) |
| `Spacing` | Default | `tokens/spacing.json` |
| `Radius` | Default | `tokens/radius.json` |

Import `Primitives` first so Semantic aliases resolve. Composite `typography` and `shadow` tokens aren't variables; create them as text and effect styles using the tables in `component-spec.md` §1.2–1.3.

## Option C: Have Claude build the file

Claude can't open Figma from a terminal session, but in the **Claude desktop app** or on **claude.ai** with the **Figma connector** enabled (Settings → Connectors), Claude can create variables, styles, pages, and components in a Figma file you own.

1. Create an empty Figma design file, e.g. "Lumen Design System", and copy its URL.
2. In Claude (desktop or claude.ai), attach `figma/component-spec.md` and the files in `figma/tokens/` (or give Claude access to this GitHub repository).
3. Send a prompt like:

   ```
   Build the Lumen Design System library in this Figma file: <FIGMA FILE URL>

   Source of truth: the attached figma/tokens/*.json (W3C DTCG) and figma/component-spec.md.

   1. Variables: create collections Primitives (primitives.json), Semantic with modes
      Light and Dark (semantic/light.json and semantic/dark.json; keep them as ALIASES
      to Primitives), Typography (font.* in typography.json), Spacing, and Radius.
      Apply the scopes in component-spec.md §1.1.
   2. Styles: create the 15 text styles (§1.2) and 6 effect styles (§1.3), with text
      style properties bound to Typography variables.
   3. Pages: create Cover, Getting started, Foundations, Components, Patterns, Archive (§2).
   4. Components: build each component set in §3 in order (Button first), with exactly
      the listed variant properties/values, auto layout, and variable bindings.
      Never leave raw hex colors or unbound spacing/radius values.
   5. Foundations page: swatch tables for Primitives and Semantic (Light and Dark side by
      side), the type scale, spacing, radius, and shadows.

   Work one component at a time. After each, list what you created and anything you
   couldn't bind, then continue.
   ```

4. When tokens change later, ask Claude to **update** rather than rebuild; names are stable, so variables update in place.

## Keeping Figma and code in sync

- The JSON here is the single source of truth. Code (`tokens/lumen.css`, `tokens/lumen.tokens.json`) and the docs tables are generated from it by `node scripts/build-tokens.mjs`.
- Change tokens in JSON (directly, or by pushing from Tokens Studio to a branch), run the build, open a pull request, then re-sync Figma.
- Variant properties in Figma map 1:1 to React props (`Variant=Primary` ↔ `variant="primary"`).
