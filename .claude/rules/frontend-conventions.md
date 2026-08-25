---
name: frontend-conventions
description: React + Tailwind structure and shared layout convention
---

# Frontend conventions

## Stack

- React + Vite + Tailwind CSS v4 (`@tailwindcss/vite` plugin, no `tailwind.config.js` — theme
  tokens live in `frontend/src/index.css` via `@theme`). React Router for routing.
- Color palette lives in [design-tokens.md](design-tokens.md) — use `brand-*`/`accent*`/`good*`/`warn*`
  Tailwind utilities, don't hardcode hex values in components.
- Component layout: `src/components/form/` (generic field primitives — TextField, SelectField,
  SegmentedToggle, ChipGroup, MiniTable), `src/components/encode/` (the profile-encode form
  sections), `src/components/roster/` (profile list sidebar), `src/components/profiles/`
  (profile-table extras, e.g. `ImportProfilesModal`), `src/components/lgu/` (`ReferralModal`),
  `src/components/auth/` (`ProtectedRoute`), `src/context/` (`AuthContext`), `src/lib/api.js`
  (fetch wrapper — see below), `src/lib/profileMapper.js` (translates the encode form's nested
  formData shape <-> the API's flat shape — see below), `src/pages/`, `src/layouts/`, `src/data/`
  (static option lists + the `statusLabel` map — no per-profile mock data anymore; `/encode`,
  `/profiles`, and `/lgu` are all wired to the real API).
- `/profiles` (`ChildProfilesTable.jsx`) uses **`@tanstack/react-table`** (pin to the `^8` line —
  the `9.x` release restructured the API, `getCoreRowModel`/`useReactTable`/etc. moved out of the
  main export) for sort/search/pagination, styled by hand with the same tokens as everywhere else
  rather than its default look.

## Shared layout

- `src/layouts/AppLayout.jsx` wraps every route via React Router's `<Outlet />` — nav/header/auth
  chrome goes there once, not duplicated per page.
- Pages/routes render inside the shared layout rather than each re-implementing chrome.

## Dark chrome sidebar pattern

- The roster/profile-list sidebar is deliberately dark (brand-900→brand-700 gradient) always —
  same idea as VS Code or Linear's sidebar. The main content panel (forms, tables) is light-mode
  only for now; app-wide dark mode is not yet implemented (no `dark:` variants wired up). If it's
  added later, only the main panel should react to it — keep the sidebar permanently dark.

## Fixed-shell layout (no page scroll)

Decided 2026-08-24, after the page-scroll version felt "broken"/unstable in review. The `/encode`
screen (and any similarly dense data-entry screen) uses a **fixed viewport shell**, not a normal
scrolling page:

- `AppLayout.jsx` and the page root are `h-screen overflow-hidden` (≥920px) — the outer page never
  scrolls or moves.
- Inside a page, split into fixed chrome (header, tabs, footer/actions — `flex-none`) and **one**
  bounded content pane that scrolls internally: `min-h-0 flex-1 overflow-y-auto`. The `min-h-0` is
  required — a flex item's default `min-height: auto` otherwise refuses to shrink below its content
  size and the pane never actually scrolls (classic flexbox gotcha).
- Long, unbounded lists (e.g. the profile roster) get **pagination**, not internal scroll — Prev/Next
  controls, no `overflow-y-auto`. This keeps every panel's height predictable instead of depending
  on how much data happens to be loaded. The page *size* itself doesn't have to be a hardcoded
  constant, though — `ProfileRoster.jsx` measures the actual space between its header and footer
  (via `ResizeObserver`) and fits as many rows as fit, so it neither leaves dead space on a tall
  screen nor overflows the sidebar on a short one. A hardcoded row count worked fine against the
  small original mock set but broke down once the roster held real, variable-length data.
- Below the `max-[920px]:` breakpoint this all relaxes back to a normal scrolling page
  (`max-[920px]:h-auto max-[920px]:overflow-visible` etc.) — cramming a 60-question form and a full
  roster into a fixed, non-scrolling small screen isn't practical, so mobile is the one place a
  page scrollbar is still allowed.
- Don't reintroduce `min-h-screen` on a flex sibling next to a tall sibling — flexbox's default
  `align-items: stretch` will stretch it to match, and if its own content is short you get a large
  dead-space gap. That was the root cause of the original "page keeps growing" bug.

## Auth on the frontend

- `src/lib/api.js` holds the JWT + user in `localStorage` and attaches `Authorization: Bearer
  <token>` on every request via its `request()` wrapper — see [auth-conventions.md](auth-conventions.md)
  for the token itself. A 401 response clears the stored session immediately (treating the 8h
  expiry as real), and `AuthContext`/`ProtectedRoute` redirect to `/login` on the next render —
  don't build a screen that assumes an expired token just silently fails.
- File uploads (the Excel import) **cannot** go through `request()` — it always JSON-encodes the
  body and sets `Content-Type: application/json`, which breaks multipart uploads. Use a separate
  function with a raw `fetch(...)` + `FormData`, and don't set `Content-Type` by hand — the browser
  needs to add its own multipart boundary, which it can only do if it builds the header itself.
- `/login` pre-fills the encoder test credentials in dev builds only (`import.meta.env.DEV`), so
  local testing is a single click — never let that ship in a production build.

## Encode form <-> API shape

- `EncodeChildProfile.jsx`'s `formData` state is nested per section (`formData.personal.dob`,
  `formData.family.members`, `formData.servicesAvailed.records`, etc.) because that's how the
  section components (`components/encode/*.jsx`) read/write it. `GET`/`PATCH /api/profiles/:id`
  use a flatter shape instead (see [backend-conventions.md](backend-conventions.md)'s `FIELD_MAP`).
  `src/lib/profileMapper.js` is the one place that translates between them — `toFormData(apiResponse)`
  on load, `toPatchPayload(formData)` before every save. If a section gains a new field, add it in
  three places that must stay in sync: the section component, `profileMapper.js`, and the backend's
  `FIELD_MAP`.
- Region/Province/Municipality `<select>`s fetch live from `GET /api/regions` etc. and cascade
  (`PersonalInfoSection.jsx`'s `usePresentAddressOptions`) — choosing a region clears
  province/municipality since the old selection no longer applies. Barangay is a plain `TextField`,
  not a select — see [backend-conventions.md](backend-conventions.md)'s geography section for why.
  Any new sample/seed data must reference a (region, province, municipality) combination that
  actually exists in the seeded geography tables (see `backend/src/db/migrations/` and
  `backend/scripts/seed-full-geography.mjs`), or `resolveGeography()` will 400.

## Roles (2026-08-25)

- Two roles so far: `encoder` (owns `/encode`, `/profiles`) and `lgu` (owns `/lgu` —
  `LguReferrals.jsx`, a work queue of children with pending service requests and a Refer action;
  see `components/lgu/ReferralModal.jsx`). `ProtectedRoute`'s `roles` prop (see `App.jsx`) gates
  each route and redirects a signed-in wrong-role user to `homeForRole(user.role)` instead of
  erroring. `Login.jsx` sends a user to their role's home after sign-in (or back to whatever
  protected route bounced them to `/login`, if any) — don't reintroduce a single hardcoded
  post-login redirect.
- This is a UX nicety only — the real access boundary is the backend's `requireRole` (see
  auth-conventions.md). A new page for a role-gated route still needs its API calls to actually be
  gated server-side; the frontend redirect alone isn't security.
