# CLAUDE.md

Team instructions for this project — committed, shared by everyone working in this repo.

## Project

A web system for encoding and managing child-labor profile records, based on a DOLE-style
"Child Labor Profiling Database" intake form (sections A–C2: personal info, education, health,
work, family, and social services availed/requested). Handles minors' personal, health, and work
data — treat all profile data as sensitive by default.

## Repo layout

```
CL/
├── frontend/   React + Vite + Tailwind CSS (npm run dev, port 5173)
└── backend/    Node.js + Express + Neon Postgres (npm run dev, port 4000)
```

## Stack

| Layer      | Choice                                    |
|------------|--------------------------------------------|
| Frontend   | React + Tailwind CSS                      |
| Backend    | Node.js + Express                         |
| Database   | Neon (managed PostgreSQL)                 |
| Auth       | JWT (`jsonwebtoken`), 8h token expiry     |
| Passwords  | `bcryptjs`                                |
| CORS       | `cors` middleware on the Express app      |
| Timezone   | Asia/Manila (`Asia/Manila`) for all server-side date/time handling |

## Conventions

Detailed, modular conventions live under [.claude/rules/](.claude/rules/) — read the relevant file
before touching that part of the codebase:

- [design-tokens.md](.claude/rules/design-tokens.md) — color palette, Tailwind theme mapping
- [auth-conventions.md](.claude/rules/auth-conventions.md) — JWT/bcrypt/CORS setup and rules
- [backend-conventions.md](.claude/rules/backend-conventions.md) — Express structure, Neon/Postgres, timezone handling
- [frontend-conventions.md](.claude/rules/frontend-conventions.md) — React/Tailwind structure, shared layout

## .claude/ anatomy

This project follows the standard Claude Code control-center layout:

- `CLAUDE.md` — this file, team instructions (committed)
- `CLAUDE.local.md` — personal overrides/scratch notes (gitignored)
- `.claude/settings.json` — shared permissions/config (committed)
- `.claude/settings.local.json` — personal permissions (gitignored)
- `.claude/rules/` — modular instruction files, referenced above
- `.claude/commands/` — custom slash commands (empty for now — add as workflows emerge, e.g. `/deploy`)
- `.claude/skills/` — auto-invoked workflows (empty for now)
- `.claude/agents/` — subagent personas: [code-reviewer.md](.claude/agents/code-reviewer.md), [security-auditor.md](.claude/agents/security-auditor.md)

## Notes

- Backend framework was confirmed as Express (2026-08-23).
- Frontend scaffolded 2026-08-24: Vite + React + Tailwind v4 (`@tailwindcss/vite`, tokens defined
  in `frontend/src/index.css` via `@theme`, mirroring [design-tokens.md](.claude/rules/design-tokens.md)
  plus an accent/semantic set — keep both in sync when the palette changes).
- First screen built: `/encode` (`frontend/src/pages/EncodeChildProfile.jsx`) — a two-pane profile
  encoder (sectioned intake form + roster sidebar). Fixed-shell layout (no page scroll — see
  [frontend-conventions.md](.claude/rules/frontend-conventions.md)); roster is paginated, not
  scrollable.
- Backend scaffolded 2026-08-24: Express + `pg`, full schema + migrations for the whole form
  (sections A–C2), auth routes, profiles CRUD, geography lookup routes, Excel bulk-import route —
  see [backend-conventions.md](.claude/rules/backend-conventions.md) for the file layout and
  [auth-conventions.md](.claude/rules/auth-conventions.md) for the login setup.
- Neon project connected 2026-08-24, migrations applied, one encoder account seeded
  (`encoder@clprofiling.local` — see whoever set up `backend/.env` for the password, it's not
  written down here). `/login` is built and working (`frontend/src/pages/Login.jsx`,
  `AuthContext.jsx`), `/encode` and the routes below are protected.
- `/profiles` (`frontend/src/pages/ChildProfilesTable.jsx`) — sortable/searchable/paginated table
  (TanStack Table) of real profiles from `GET /api/profiles`, plus an "Import from Excel" button
  (`POST /api/profiles/import`, always creates new `draft` rows, never updates existing ones).
- 2026-08-24: `/encode` fully wired to the real API too — no more mock data anywhere in the
  frontend (`frontend/src/data/{mockFormDataById,initialFormData}.js` were deleted; `data/profiles.js`
  now only holds the `statusLabel` lookup map). The roster fetches `GET /api/profiles`, selecting a
  profile fetches `GET /api/profiles/:id`, "Save draft"/"Save & continue" PATCH it, and "+ New"
  POSTs a new draft. `frontend/src/lib/profileMapper.js`'s `toFormData`/`toPatchPayload` translate
  between the form's nested per-section shape and the API's flat shape — keep it in sync with
  `backend/src/routes/profiles.routes.js`'s `FIELD_MAP` (the source of truth for that flat shape,
  its DB columns, and value coercions) if either changes. The 8 hand-authored sample profiles were
  ported into the real DB via `backend/scripts/seed-sample-profiles.mjs` (safe to re-run — skips
  rows that already exist by last/first name + year).
- 2026-08-24: the source workbook's **"Database"** tab (real historical DOLE records, distinct
  from the "ENCODE" tab the day-to-day import feature is modeled on) is a completely different,
  denormalized shape — combined name cells, code-packed free-text for "check all that apply"
  answers, family members/services flattened into 12 slot-columns of "Label: value" blobs, and a
  referral-tracking section (enumerator, date of interview, needs assessed/referred/withdrawn) with
  no equivalent columns in our schema. `backend/scripts/import-legacy-database-sheet.mjs` fetches
  that tab live (CSV export) and imports its 20 rows — the sheet's own "Child's ID No." column is
  already in our `control_no` format, so it's reused verbatim rather than regenerated. Idempotent
  (skips existing `control_no`s). The referral-tracking columns are not imported (no schema home
  for them yet). Needed a new migration (`0004_seed_mimaropa_geography.sql`) since this real data
  references a region/province/city/barangays outside the placeholder geography seed.
- 2026-08-24: replaced the 3-region placeholder geography with the real nationwide list (18
  regions, 88 provinces, 1,649 cities/municipalities) sourced from the source workbook's hidden
  "Codes"/"Province"/"City-Municipality" sheets — `backend/scripts/seed-full-geography.mjs` (safe
  to re-run; renames existing placeholder rows to their official name in place rather than
  duplicating them, so it didn't break the 28 already-encoded profiles' geography). The encode
  form's Region/Province/Municipality fields now fetch live from `GET /api/regions` etc.
  (`PersonalInfoSection.jsx`) instead of a static option list — a flat, unscoped 1,649-city list
  can't reasonably be one `<select>`. Barangay became a free-text field instead: the source
  workbook has **no** barangay master list at all, and the real form doesn't validate it either
  (confirmed by the "Database" tab's real rows) — see backend-conventions.md's geography section
  and `present_barangay_text`. Also replaced every other option list in `formOptions.js`
  (religion, dropout reasons, ailments, family ailments, task performed, work arrangement, hazards,
  dwelling material, + new highest-grade/disability-type/civil-status/skills lists) with the
  authoritative values from that same Codes sheet, since several had drifted from invented/
  approximate wording. One deliberate omission to flag: the Codes sheet's task-performed list tops
  out at 12 items ending in "Others" — it does not have separate OSEC / "Children in Prostitution"
  categories the way this list briefly did; re-add only as a deliberate decision, not a silent
  revert.
- 2026-08-24: synced the day-to-day "Import from Excel" feature (both the downloadable template and
  the parser) to the real DOLE "Database" sheet format instead of an invented simple-columns
  format — the same shape `import-legacy-database-sheet.mjs` already knew how to parse. The template
  is now a direct copy of the real master workbook (`backend/assets/child-profile-import-template-master.xlsx`),
  not generated from a column list. See [backend-conventions.md](.claude/rules/backend-conventions.md)'s
  Excel import section.
- 2026-08-25: added a second user role, **LGU** — a work-queue view (`/lgu`) of children with
  pending service requests, with a "Refer to DOLE/DSWD" action that logs to a new `referrals` table.
  One shared seeded account (`lgu@clprofiling.local`); ask whoever set up `backend/.env` for the
  password if it's needed again, same as the encoder account. `requireRole` now gates every route by
  role (encoder/admin own profile CRUD + import; lgu/admin own the referral queue) — see
  [auth-conventions.md](.claude/rules/auth-conventions.md)'s Roles section for the full picture and
  a known gap around referrals and Section C2 re-saves.
