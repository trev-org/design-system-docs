# Lumen Design System: Figma build spec

This spec tells a designer (or Claude with a Figma connector) exactly how to build the Lumen Figma library so it matches the code in `@lumen/react` and the docs site. Token values live in `figma/tokens/*.json`; this file only references tokens by name.

**Conventions**

- Token references use the JSON path, e.g. `color.bg.brand`. In Figma, the variable name uses slashes: `color/bg/brand`.
- "Bind" means bind the property to the variable or style. **Never** leave a raw hex value or an unbound number on a library layer.
- Auto layout values are written as `direction · padding (T R B L or Y X) · gap · alignment · sizing`.
- Variant property names and values are written exactly as they should appear in Figma (Title Case values), and map 1:1 to React props (lowercase).
- Icons are 16px (20px at `Lg`) instances of `Icon / <name>` with the stroke bound to the parent text color.

---

## 1. Variables and styles

### 1.1 Variable collections

| Collection | Source file(s) | Modes | Scopes | Publish |
|---|---|---|---|---|
| `Primitives` | `primitives.json` | `Default` | All fills/strokes | Hidden from publishing |
| `Semantic` | `semantic/light.json`, `semantic/dark.json` | `Light`, `Dark` | `bg/*` → Fill; `text/*` → Text fill, icon stroke; `border/*` → Stroke | Published |
| `Typography` | `typography.json` (`font.*` only) | `Default` | Font family / weight / size / line height / letter spacing | Published |
| `Spacing` | `spacing.json` | `Default` | Gap, padding | Published |
| `Radius` | `radius.json` | `Default` | `radius/*` → Corner radius; `border-width/*` → Stroke width | Published |

Semantic variables must be **aliases** to Primitives (e.g. `color/bg/brand` → `color/brand/600` in Light, `color/brand/500` in Dark), never copied values.

### 1.2 Text styles (from `typography.*`)

Create one text style per composite token, named with slashes, with every property bound to the Typography variables:

| Text style | Family | Size / line height | Weight | Letter spacing |
|---|---|---|---|---|
| `display/2xl` | Plus Jakarta Sans | 60 / 72 | Bold (700) | -2% |
| `display/xl` | Plus Jakarta Sans | 48 / 56 | Bold (700) | -2% |
| `display/lg` | Plus Jakarta Sans | 36 / 44 | Bold (700) | -2% |
| `heading/xl` | Plus Jakarta Sans | 30 / 38 | Semibold (600) | -1% |
| `heading/lg` | Plus Jakarta Sans | 24 / 32 | Semibold (600) | -1% |
| `heading/md` | Plus Jakarta Sans | 20 / 28 | Semibold (600) | -1% |
| `heading/sm` | Inter | 16 / 24 | Semibold (600) | 0% |
| `body/lg` | Inter | 18 / 28 | Regular (400) | 0% |
| `body/md` | Inter | 16 / 24 | Regular (400) | 0% |
| `body/sm` | Inter | 14 / 20 | Regular (400) | 0% |
| `label/lg` | Inter | 16 / 24 | Medium (500) | 0% |
| `label/md` | Inter | 14 / 20 | Semibold (600) | 0% |
| `label/sm` | Inter | 12 / 16 | Medium (500) | 1% |
| `caption/md` | Inter | 12 / 16 | Regular (400) | 1% |
| `code/md` | JetBrains Mono | 14 / 20 | Regular (400) | 0% |

### 1.3 Effect styles (from `effects.json`)

| Effect style | Layers (x, y, blur, spread, color) |
|---|---|
| `shadow/xs` | 0 1 2 0 `#0E10160F` |
| `shadow/sm` | 0 1 3 0 `#0E10161A`; 0 1 2 -1 `#0E10161A` |
| `shadow/md` | 0 4 6 -1 `#0E10161A`; 0 2 4 -2 `#0E10160F` |
| `shadow/lg` | 0 10 15 -3 `#0E10161A`; 0 4 6 -4 `#0E10160D` |
| `shadow/xl` | 0 20 25 -5 `#0E10161F`; 0 8 10 -6 `#0E101614` |
| `shadow/focus` | 0 0 0 4 `#6D4FEF66` |

### 1.4 Focus ring

Build a reusable `.Focus ring` component: a frame with no fill, stroke 2 bound to `color/border/focus`, stroke position **outside**, corner radius = host radius + 2, positioned absolutely with a 2px inset of -4 on every side. Hosts toggle it with a boolean property `Focus ring` hidden behind `State=Focus`.

---

## 2. File structure (pages)

1. **Cover**: 1920×1080 frame, `color/bg/brand` → `color/brand/950` gradient, logo, "Lumen Design System", version, last-updated date.
2. **Getting started**: how to enable the library, switch modes (Semantic collection → Light/Dark), and naming conventions.
3. **Foundations**: one section each for Color (Primitives + Semantic swatch tables, showing both modes side by side), Typography (all text styles), Spacing, Radius, Elevation, Iconography.
4. **Components**: one **section** per component, in this order: Button, Input, Checkbox, Switch, Card, Badge, Avatar, Alert, Tooltip, Modal. Each section contains the component set, a usage frame (do / don't), and an anatomy frame.
5. **Patterns**: compositions such as Form (Inputs + Checkbox + Buttons), Settings list (Switches), Confirmation dialog (Modal + Danger button), Empty state (Card + Button).
6. **Archive**: deprecated components, never published.

Base components that shouldn't be used directly start with `.` (e.g. `.Focus ring`, `.Spinner`) so Figma hides them from the assets panel.

---

## 3. Components

### 3.1 Button

**Component set:** `Button`

| Property | Type | Values | Default |
|---|---|---|---|
| `Variant` | Variant | `Primary`, `Secondary`, `Ghost`, `Danger`, `Warning` | `Secondary` |
| `Size` | Variant | `Sm`, `Md`, `Lg` | `Md` |
| `State` | Variant | `Default`, `Hover`, `Focus`, `Pressed`, `Disabled`, `Loading` | `Default` |
| `Icon start` | Boolean | — | false |
| `Icon end` | Boolean | — | false |
| `Icon only` | Variant | `False`, `True` | `False` |
| `Label` | Text | "Button" | — |
| `Start icon` / `End icon` | Instance swap | `Icon / *` | `Icon / plus`, `Icon / arrow-right` |

Total variants: 5 × 3 × 6 × 2 = 180.

**Layers and auto layout**

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Button` (root) | Horizontal · padding Y 0, X `space/4` (Sm `space/3`, Lg `space/5`) · gap `space/2` (Sm `space/1-5`) · center/center · hug × fixed height 40 (Sm 32, Lg 48). Icon only: fixed square 40/32/48, padding 0 | Radius `radius/md`; stroke width `border-width/thin`; effect `shadow/xs` (none for Ghost and Disabled) |
| `Start icon` | 16×16 (Lg 20×20) | Stroke → label color |
| `Label` | Hug | Text style `label/md` (Lg `label/lg`) |
| `End icon` | 16×16 (Lg 20×20) | Stroke → label color |
| `Spinner` (Loading only, replaces Start icon) | 16×16, `.Spinner` instance | Stroke → label color |
| `.Focus ring` (Focus only) | Absolute | See 1.4 |

**Color bindings by Variant × State**

| Variant | Default fill | Hover fill | Pressed fill | Stroke | Label / icon |
|---|---|---|---|---|---|
| Primary | `color/bg/brand` | `color/bg/brand-hover` | `color/bg/brand-active` | none | `color/text/on-brand` |
| Secondary | `color/bg/surface` | `color/bg/subtle` | `color/bg/muted` | `color/border/strong` | `color/text/primary` |
| Ghost | none | `color/bg/muted` | `color/bg/emphasis` | none | `color/text/primary` |
| Danger | `color/bg/danger` | `color/bg/danger-hover` | `color/bg/danger-hover` | none | `color/text/on-brand` |
| Warning | `color/bg/warning` | `color/bg/warning-hover` | `color/bg/warning-hover` | none | `color/text/on-warning` |
| *Any* Disabled | `color/bg/muted` (Ghost: none) | — | — | none | `color/text/disabled` |

Focus = Default fill + `.Focus ring`. Loading = Default fill, label text "Saving…", spinner visible.

### 3.2 Input

**Component set:** `Input`

| Property | Type | Values |
|---|---|---|
| `Size` | Variant | `Sm`, `Md`, `Lg` |
| `State` | Variant | `Default`, `Hover`, `Focus`, `Error`, `Disabled`, `Read-only` |
| `Filled` | Variant | `False` (placeholder), `True` (value) |
| `Label` | Boolean | default true |
| `Helper text` | Boolean | default true |
| `Icon start` | Boolean | default false |
| `Required` | Boolean | default false |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Input` (root) | Vertical · padding 0 · gap `space/1-5` · fill width (min 200) | — |
| `Label` | Horizontal · gap `space/0-5` · hug | Text `label/md`, fill `color/text/primary`; asterisk fill `color/text/danger` (Required) |
| `Field` | Horizontal · padding X `space/3` (Lg `space/4`) · gap `space/2` · left/center · fill × fixed height 40 (Sm 32, Lg 48) | Fill `color/bg/surface`; stroke `border-width/thin`; radius `radius/md`; effect `shadow/xs` |
| `Field / Icon` | 16×16 | Stroke `color/text/tertiary` |
| `Field / Text` | Fill width | Text `body/md` (Sm `body/sm`); placeholder fill `color/text/tertiary`, value fill `color/text/primary` |
| `Helper` | Hug | Text `caption/md`, fill `color/text/secondary` |

| State | Field stroke | Field fill | Effect | Helper fill |
|---|---|---|---|---|
| Default | `color/border/strong` | `color/bg/surface` | `shadow/xs` | `color/text/secondary` |
| Hover | `color/text/secondary` | `color/bg/surface` | `shadow/xs` | `color/text/secondary` |
| Focus | `color/border/focus` | `color/bg/surface` | `shadow/focus` | `color/text/secondary` |
| Error | `color/border/danger` | `color/bg/surface` | `shadow/xs` | `color/text/danger` (+ 12px error icon) |
| Disabled | `color/border/default` | `color/bg/subtle` | none | `color/text/disabled`; text fill `color/text/disabled` |
| Read-only | `color/border/default` | `color/bg/subtle` | none | `color/text/secondary`; text fill `color/text/primary` |

### 3.3 Checkbox

**Component set:** `Checkbox`

| Property | Type | Values |
|---|---|---|
| `Checked` | Variant | `False`, `True`, `Indeterminate` |
| `State` | Variant | `Default`, `Hover`, `Focus`, `Error`, `Disabled` |
| `Size` | Variant | `Sm`, `Md` |
| `Description` | Boolean | default false |
| `Label` | Text | "Label" |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Checkbox` (root) | Horizontal · padding 0 · gap `space/2` · top-left · hug | — |
| `Box` | 20×20 (Sm 16×16), 2px top margin | Radius `radius/sm`; stroke `border-width/thin` |
| `Box / Glyph` | 14×14 (Sm 12×12), centered, `Icon / check` or `Icon / minus` | Stroke `color/text/on-brand` |
| `Text` | Vertical · gap `space/0-5` | — |
| `Text / Label` | Hug | `body/md` (Sm `body/sm`), `color/text/primary` |
| `Text / Description` | Fill | `body/sm`, `color/text/secondary` |

| Checked × State | Box fill | Box stroke |
|---|---|---|
| False · Default | `color/bg/surface` | `color/border/strong` |
| False · Hover | `color/bg/surface` | `color/text/secondary` |
| True or Indeterminate · Default/Hover | `color/bg/brand` (Hover `color/bg/brand-hover`) | same as fill |
| Any · Error | (as above) | `color/border/danger` |
| False · Disabled | `color/bg/muted` | `color/border/default` |
| True · Disabled | `color/text/disabled` | none |
| Any · Focus | (as Default) + `.Focus ring` around Box | |

### 3.4 Switch

**Component set:** `Switch`

| Property | Type | Values |
|---|---|---|
| `Checked` | Variant | `False`, `True` |
| `State` | Variant | `Default`, `Hover`, `Focus`, `Disabled` |
| `Size` | Variant | `Sm`, `Md`, `Lg` |
| `Label` | Boolean | default true |
| `Label position` | Variant | `End`, `Start` |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Switch` (root) | Horizontal · gap `space/3` · center · hug | — |
| `Track` | Horizontal · padding 2 (`space/0-5`) · Md 36×20, Sm 28×16, Lg 44×24 · alignment left (False) / right (True) | Radius `radius/full`; fill False `color/bg/neutral-strong`, True `color/bg/brand` |
| `Track / Thumb` | Md 16, Sm 12, Lg 20 circle | Fill `color/bg/knob`; effect `shadow/sm` |
| `Label` | Hug | `body/md`, `color/text/primary` (Disabled: `color/text/disabled`) |

Disabled track fill: False `color/bg/emphasis`, True `color/brand/200` (Light) / `color/brand/900` (Dark). Hover: track fill `color/bg/brand-hover` when True, unchanged when False. Prototype: smart-animate between `Checked` values, 200ms (`duration.normal`), custom bezier 0.3, 0, 0, 1.2 (`easing.emphasized`).

### 3.5 Card

**Component set:** `Card`

| Property | Type | Values |
|---|---|---|
| `Variant` | Variant | `Outlined`, `Elevated`, `Filled` |
| `Density` | Variant | `Comfortable`, `Compact` |
| `State` | Variant | `Default`, `Hover`, `Selected` |
| `Media` | Boolean | default false |
| `Footer` | Boolean | default true |
| `Content` | Instance swap (slot) | `.Card slot / Placeholder` |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Card` (root) | Vertical · padding 0 · gap 0 · fill width (min 240), clip content | Radius `radius/lg`; fill `color/bg/surface` (Filled: `color/bg/subtle`) |
| `Media` | Fill × fixed 120 (or 16:9) | Image fill |
| `Body` | Vertical · padding `space/6` (Compact `space/4`) · gap `space/2` · fill × hug | — |
| `Body / Title` | Fill | `heading/sm`, `color/text/primary` |
| `Body / Description` | Fill | `body/sm`, `color/text/secondary` |
| `Body / Content` | Slot, fill | — |
| `Footer` | Horizontal · padding Y `space/4` X `space/6` (Compact `space/3`/`space/4`) · gap `space/2` · right/center · fill × hug | Top stroke 1 `color/border/subtle` |

| Variant × State | Stroke | Effect |
|---|---|---|
| Outlined · Default | `color/border/default` | none |
| Outlined · Hover | `color/border/strong` | `shadow/md` |
| Elevated · Default | none | `shadow/sm` |
| Elevated · Hover | none | `shadow/md` |
| Filled · Default/Hover | none | none / `shadow/sm` |
| Any · Selected | 2px `color/border/brand`; fill `color/bg/brand-subtle` | none |

### 3.6 Badge

**Component set:** `Badge`

| Property | Type | Values |
|---|---|---|
| `Tone` | Variant | `Neutral`, `Brand`, `Success`, `Warning`, `Danger`, `Info` |
| `Appearance` | Variant | `Subtle`, `Outline` |
| `Size` | Variant | `Sm`, `Md`, `Lg` |
| `Dot` | Boolean | default false |
| `Label` | Text | "Badge" |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Badge` (root) | Horizontal · padding X `space/2` (Sm `space/1-5`, Lg `space/3`) · gap `space/1` (Lg `space/1-5`) · center · hug × fixed 24 (Sm 20, Lg 28) | Radius `radius/full`; stroke `border-width/thin` (Outline only) |
| `Dot` | 6×6 ellipse | Fill = label color |
| `Label` | Hug | `label/sm` (Lg `label/md`) |

| Tone | Subtle fill | Label / dot | Outline stroke |
|---|---|---|---|
| Neutral | `color/bg/muted` | `color/text/secondary` | `color/border/strong` |
| Brand | `color/bg/brand-subtle` | `color/text/brand` | `color/border/brand` |
| Success | `color/bg/success-subtle` | `color/text/success` | `color/border/success` |
| Warning | `color/bg/warning-subtle` | `color/text/warning` | `color/border/warning` |
| Danger | `color/bg/danger-subtle` | `color/text/danger` | `color/border/danger` |
| Info | `color/bg/info-subtle` | `color/text/info` | `color/border/info` |

Outline appearance: no fill.

### 3.7 Avatar

**Component set:** `Avatar`

| Property | Type | Values |
|---|---|---|
| `Type` | Variant | `Image`, `Initials`, `Icon` |
| `Size` | Variant | `Xs` (24), `Sm` (32), `Md` (40), `Lg` (48), `Xl` (64) |
| `Shape` | Variant | `Circle`, `Square` |
| `Status` | Variant | `None`, `Online`, `Away`, `Busy`, `Offline` |
| `Initials` | Text | "AK" |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Avatar` (root) | Horizontal · center/center · fixed square | Radius `radius/full` (Square: `radius/lg`); clip content |
| `Image` | Fill, image fill (cover) | — |
| `Initials` | Hug | Fill `color/text/brand` on root fill `color/bg/brand-subtle`. Text: Xs `label/sm` at 10px, Sm `label/sm`, Md `label/md`, Lg `label/lg`, Xl `heading/md` |
| `Icon` | 50% of size, `Icon / user` | Stroke `color/text/secondary` on root fill `color/bg/muted` |
| `Status` | Absolute, bottom-right, 25% of size (min 8) | Fill: Online `color/green/500`, Away `color/amber/500`, Busy `color/red/500`, Offline `color/neutral/400`; stroke 2 outside `color/bg/surface` |

Also build `Avatar group`: horizontal auto layout, gap -8 (the negative of `space/2`; Figma variables can't be negated, so this is the library's one documented unbound value), each avatar with a 2px `color/bg/canvas` outside stroke; property `Count` = 2 | 3 | 4 | 4+ (last shows "+N" Initials avatar with Neutral fill).

### 3.8 Alert

**Component set:** `Alert`

| Property | Type | Values |
|---|---|---|
| `Tone` | Variant | `Info`, `Success`, `Warning`, `Danger` |
| `Layout` | Variant | `Inline`, `Banner` |
| `Description` | Boolean | default true |
| `Actions` | Boolean | default false |
| `Closable` | Boolean | default false |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Alert` (root) | Horizontal · padding `space/4` · gap `space/3` · top-left · fill × hug | Radius `radius/lg` (Banner: 0); stroke `border-width/thin` (Banner: bottom only); fill/stroke per tone |
| `Icon` | 20×20; Info `Icon / info`, Success `Icon / check-circle`, Warning `Icon / alert-triangle`, Danger `Icon / x-circle` | Stroke = tone text |
| `Content` | Vertical · gap `space/1` · fill | — |
| `Content / Title` | Fill | `label/md`, `color/text/primary` |
| `Content / Description` | Fill | `body/sm`, `color/text/secondary` |
| `Content / Actions` | Horizontal · gap `space/4` · padding top `space/2` | `label/md`; first action = tone text, second = `color/text/secondary` |
| `Dismiss` | `Button` instance: Variant=Ghost, Size=Sm, Icon only=True, icon `Icon / x` | — |

| Tone | Fill | Stroke | Icon / action |
|---|---|---|---|
| Info | `color/bg/info-subtle` | `color/border/info` | `color/text/info` |
| Success | `color/bg/success-subtle` | `color/border/success` | `color/text/success` |
| Warning | `color/bg/warning-subtle` | `color/border/warning` | `color/text/warning` |
| Danger | `color/bg/danger-subtle` | `color/border/danger` | `color/text/danger` |

### 3.9 Tooltip

**Component set:** `Tooltip`

| Property | Type | Values |
|---|---|---|
| `Placement` | Variant | `Top`, `Bottom`, `Left`, `Right` |
| `Shortcut` | Boolean | default false |
| `Label` | Text | "Tooltip" |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Tooltip` (root) | Vertical (Left/Right: horizontal) · center · hug; arrow placed on the side facing the trigger | — |
| `Bubble` | Horizontal · padding Y `space/1-5` X `space/2` · gap `space/1-5` · hug, max width 240 | Fill `color/bg/inverse`; radius `radius/md`; effect `shadow/lg` |
| `Bubble / Label` | Hug (wrap at max width) | `caption/md`, `color/text/inverse` |
| `Bubble / Kbd` | Padding X 4 · radius `radius/xs` | Fill `color/text/inverse` at 20% opacity; text `caption/md` |
| `Arrow` | 8×8 square rotated 45°, overlapping bubble by 4 | Fill `color/bg/inverse` |

### 3.10 Modal

**Component set:** `Modal`

| Property | Type | Values |
|---|---|---|
| `Size` | Variant | `Sm` (400), `Md` (560), `Lg` (720) |
| `Variant` | Variant | `Default`, `Destructive`, `Passive` |
| `Description` | Boolean | default true |
| `Footer` | Boolean | default true |
| `Close button` | Boolean | default true |
| `Content` | Instance swap (slot) | `.Modal slot / Placeholder` |

| Layer | Auto layout / size | Bindings |
|---|---|---|
| `Modal` (root) | Vertical · padding 0 · gap 0 · fixed width (Size) × hug | Fill `color/bg/surface`; radius `radius/xl`; effect `shadow/xl`; Dark mode only: stroke `color/border/default` |
| `Header` | Horizontal · padding T `space/6` X `space/6` B 0 · gap `space/4` · space-between, top | — |
| `Header / Title` | Fill | `heading/md`, `color/text/primary` |
| `Header / Close` | `Button` instance: Ghost, Sm, Icon only, `Icon / x` | — |
| `Body` | Vertical · padding T `space/2` X `space/6` B `space/6` · gap `space/4` · fill | Text `body/md`, `color/text/secondary` |
| `Footer` | Horizontal · padding Y `space/4` X `space/6` · gap `space/3` · right/center · fill | Top stroke 1 `color/border/subtle` |

Footer buttons by Variant: Default = `Button` Secondary "Cancel" + Primary "Confirm"; Destructive = Secondary "Cancel" + Danger "Delete"; Passive = Primary "Done".

Also build `Modal / Overlay`: frame 1440×900, fill `color/bg/overlay` at 48% opacity, with a centered `Modal` instance. Prototype: open with smart animate 300ms (`duration.slow`), ease-out bezier 0, 0, 0.2, 1 (`easing.enter`).

---

## 4. Quality checklist

- [ ] Every fill, stroke, radius, gap, and padding is bound to a variable or style (use a lint plugin or Figma's "Selection colors" panel to find raw values).
- [ ] Switching the `Semantic` collection mode from Light to Dark on a frame re-themes every component correctly.
- [ ] Variant property names and values match this spec exactly (they map to React props).
- [ ] Each component set has a description with a link to its docs page (`/components/<name>`).
- [ ] Text styles and effect styles are published; Primitives are hidden from publishing.
