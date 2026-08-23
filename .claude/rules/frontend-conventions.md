---
name: frontend-conventions
description: React + Tailwind structure and shared layout convention
---

# Frontend conventions

## Stack

- React + Tailwind CSS.
- Color palette lives in [design-tokens.md](design-tokens.md) — use `brand-*` Tailwind utilities,
  don't hardcode hex values in components.

## Shared layout

- Use a single shared layout component (e.g. `<Layout>`) wrapping page content — nav/header/footer
  live there once, not duplicated per page.
- Pages/routes render inside the shared layout rather than each re-implementing chrome.

## Auth on the frontend

- Store the JWT from the backend (see [auth-conventions.md](auth-conventions.md)) and attach it as
  an `Authorization: Bearer <token>` header on API requests.
- Treat the 8h expiry as real — handle expired-token responses (401) by redirecting to login rather
  than showing a broken state.
