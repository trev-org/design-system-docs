# Lumen Design System docs

Documentation site for **Lumen**, a sample token-driven design system, built with [Mintlify](https://mintlify.com). It covers:

- **Foundations**: color (primitive scales and light/dark semantic aliases), typography, spacing, radius, elevation, motion, breakpoints, accessibility
- **Components**: Button, Input, Checkbox, Switch, Card, Badge, Avatar, Alert, Tooltip, Modal (anatomy, variants, sizes, states, props, React examples for the imaginary `@lumen/react` package, accessibility, and do/don't guidance)
- **Figma kit**: W3C DTCG design tokens ready for Tokens Studio or native Figma variables, plus a layer-by-layer component spec

> Lumen and its `@lumen/*` packages are invented for demonstration purposes.

## Repository layout

```
.
├── docs.json                 Mintlify config (theme, colors, navigation, navbar, footer)
├── index.mdx                 Introduction
├── get-started/              Installation, theming, principles, contributing, changelog
├── foundations/              Color, typography, spacing, radius, elevation, motion, breakpoints, accessibility
├── components/               One page per component
├── resources/                Figma kit, design tokens reference
├── figma/
│   ├── README.md             How to import tokens into Figma and build the library (incl. with Claude)
│   ├── component-spec.md     Figma component sets, variant properties, auto layout, token bindings
│   └── tokens/               SOURCE OF TRUTH: DTCG token JSON + Tokens Studio $metadata/$themes
├── tokens/                   GENERATED: lumen.css (CSS variables) and lumen.tokens.json
├── snippets/
│   ├── generated/            GENERATED: token tables used by the docs
│   └── lumen-icons.jsx       Inline SVG icons for previews
├── scripts/build-tokens.mjs  Token build (zero dependencies)
├── style.css                 Preview styles for the docs (uses only --lumen-* variables)
├── logo/, favicon.svg        Brand assets
└── .mintignore               Keeps figma/*.md and scripts/ out of the published site
```

## Preview locally

Requires Node.js 20.17+.

```bash
npm i -g mint
mint dev
```

Open http://localhost:3000. Other useful commands:

```bash
mint broken-links   # check internal links
mint validate       # strict build validation
mint a11y           # contrast and alt-text checks
```

## Tokens

All token values originate in `figma/tokens/*.json`. After editing them, regenerate the CSS, resolved JSON, and docs tables:

```bash
node scripts/build-tokens.mjs           # write generated files + print WCAG contrast report
node scripts/build-tokens.mjs --check   # CI mode: fail if generated files are stale or contrast fails
```

Never edit `tokens/` or `snippets/generated/` by hand. Mintlify automatically loads every `.css` file in the repo, so the docs previews use the generated `tokens/lumen.css` directly.

## Figma

See [`figma/README.md`](figma/README.md) for importing the tokens with Tokens Studio or native Figma variable import, and for a ready-made prompt to have Claude build the Figma library from `figma/component-spec.md` in the Claude desktop app or claude.ai (with the Figma connector enabled).

## Deploy

1. Push this repository to GitHub.
2. In the [Mintlify dashboard](https://dashboard.mintlify.com), create a project and connect the repository: install the **Mintlify GitHub App** for the repo when prompted and select the `main` branch. `docs.json` is at the repository root, so no monorepo path is needed.
3. Every push to `main` deploys automatically; pull requests get preview deployments.
4. Optionally add a custom domain under **Settings → Custom domain**.
