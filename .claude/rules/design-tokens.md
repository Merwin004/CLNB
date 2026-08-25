---
name: design-tokens
description: Color palette and Tailwind theme mapping for the frontend
---

# Design tokens

## Color palette

A single tonal blue-gray scale, darkest to lightest, taken from the reference palette image:

| Token       | Hex       | Role (suggested)                  |
|-------------|-----------|-------------------------------------|
| `brand-900` | `#4A6274` | Primary / headers / dark surfaces  |
| `brand-700` | `#6B8191` | Secondary text / hover states      |
| `brand-500` | `#8BA0AF` | Accents / borders                  |
| `brand-400` | `#ADB8B9` | Muted UI elements                  |
| `brand-200` | `#CDD4CD` | Light surfaces / dividers          |
| `brand-100` | `#E9EAE8` | Page background / lightest surface |

> The lightest swatch (`brand-100`) was partially cropped in the source reference image —
> double-check `#E9EAE8` against the original design file before treating it as final.

Extended with an accent + two semantic pairs, introduced for the encode-screen mockup
(2026-08-24) — a warm brass accent reads deliberately against the cool slate scale, and
good/warn stay separate from the accent per the "semantic color is not your accent" rule:

| Token          | Hex       | Role                                    |
|----------------|-----------|-------------------------------------------|
| `accent`       | `#AD7F35` | Primary actions, focus emphasis, selected chips |
| `accent-ink`   | `#5C4116` | Text/icon color on top of `accent`/`accent-soft` |
| `accent-soft`  | `#EFDFC0` | Selected-state background (chips, badges) |
| `good`         | `#5C7A5E` | Semantic: complete/success text          |
| `good-soft`    | `#DEE7DA` | Semantic: complete/success background    |
| `warn`         | `#A8752F` | Semantic: draft/attention text           |
| `warn-soft`    | `#EFDCB8` | Semantic: draft/attention background     |

The roster/sidebar chrome (dark, always-on regardless of light/dark theme — see
[frontend-conventions.md](frontend-conventions.md)) reuses `brand-900`→`brand-700` as a gradient
rather than a separate token set.

## Tailwind theme mapping

Defined in `frontend/src/index.css` via Tailwind v4's `@theme` directive (no `tailwind.config.js`
needed — v4 uses `@tailwindcss/vite` and CSS-based theme config):

```css
@theme {
  --color-brand-900: #4A6274;
  --color-brand-700: #6B8191;
  --color-brand-500: #8BA0AF;
  --color-brand-400: #ADB8B9;
  --color-brand-200: #CDD4CD;
  --color-brand-100: #E9EAE8;

  --color-accent: #AD7F35;
  --color-accent-ink: #5C4116;
  --color-accent-soft: #EFDFC0;
  --color-good: #5C7A5E;
  --color-good-soft: #DEE7DA;
  --color-warn: #A8752F;
  --color-warn-soft: #EFDCB8;
}
```

Use `bg-brand-*`, `text-brand-*`, `border-brand-*`, `bg-accent`, `text-good`, etc. utilities
rather than hardcoding hex values in components, so the palette stays swappable from one place.
Keep this file and `frontend/src/index.css` in sync if either changes.
