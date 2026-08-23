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

## Tailwind theme mapping

Add to `tailwind.config.js` under `theme.extend.colors` once the frontend is scaffolded:

```js
theme: {
  extend: {
    colors: {
      brand: {
        900: '#4A6274',
        700: '#6B8191',
        500: '#8BA0AF',
        400: '#ADB8B9',
        200: '#CDD4CD',
        100: '#E9EAE8',
      },
    },
  },
},
```

Use `bg-brand-*`, `text-brand-*`, `border-brand-*` utilities rather than hardcoding hex values
in components, so the palette stays swappable from one place.
