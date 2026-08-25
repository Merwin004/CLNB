---
name: backend-conventions
description: Express, Neon/Postgres, and timezone conventions for the backend
---

# Backend conventions

## Framework

- Node.js + Express 5, ESM (`"type": "module"` in `backend/package.json`).
- See [auth-conventions.md](auth-conventions.md) for JWT/bcrypt/CORS specifics.

## Structure (scaffolded 2026-08-24)

```
backend/
├── .env.example        # copy to .env, fill in DATABASE_URL/JWT_SECRET/CORS_ORIGIN — never commit .env
└── src/
    ├── app.js           # express app config (cors, json, routes, error handlers) — no listen()
    ├── index.js         # app.listen() entry point
    ├── db/
    │   ├── pool.js       # pg Pool, lazy-connects (server boots fine before DATABASE_URL is set)
    │   ├── migrate.js     # runs src/db/migrations/*.sql in order, tracked in schema_migrations
    │   └── migrations/    # 0001_init_schema.sql, 0002_seed_geography.sql, ...
    ├── lib/
    │   ├── geography.js    # resolveGeography() — name -> FK id lookup, shared by profiles + import routes
    │   ├── controlNumber.js # generateControlNo(executor, {...}) — takes pool or a tx client
    │   ├── coerce.js       # toBool/toInt/toNumeric — "Yes"/"No"/possibly-empty-string -> SQL types
    │   └── databaseFormat.js # blank/parseName/parseDate/parseCodeList/parseCodeText/parseBlob —
    │                          # shared by import.routes.js and scripts/import-legacy-database-sheet.mjs
    ├── middleware/
    │   ├── auth.js        # requireAuth (verifies JWT) + requireRole(...roles) (403s wrong-role) — see auth-conventions.md
    │   └── errorHandler.js # asyncHandler wrapper, HttpError, centralized error/404 handlers
    └── routes/
        ├── index.js       # mounts everything under /api
        ├── auth.routes.js  # POST /register (role-aware), /login
        ├── profiles.routes.js # GET/POST/PATCH /profiles — encoder/admin only
        ├── import.routes.js   # POST /profiles/import — bulk-create draft profiles from an .xlsx file, encoder/admin only
        ├── lgu.routes.js   # GET /lgu/profiles, POST /lgu/referrals — lgu/admin only, see below
        └── geo.routes.js   # GET /regions, /provinces, /cities, /barangays (cascading dropdowns)
```

- Run migrations with `npm run migrate` (inside `backend/`) after setting `DATABASE_URL`.
- New route handlers: wrap async ones in `asyncHandler` from `errorHandler.js` and `throw new HttpError(status, message)`
  instead of manually try/catching — the centralized handler formats the response.
- `resolveGeography`/`generateControlNo`/the `toBool`/`toInt`/`toNumeric` coercions live in `src/lib/`
  specifically because they're shared by more than one call site (the Excel importer, the profiles
  PATCH handler, and `scripts/seed-sample-profiles.mjs`) — don't re-duplicate them locally in a new
  route file, import from `lib/` instead.

## Database — Neon (PostgreSQL)

- Connect via `DATABASE_URL` (Neon connection string), never hardcode credentials.
- Neon is serverless Postgres — expect connection pooling/cold-start behavior; use a pooled
  connection string (Neon's `-pooler` endpoint) for normal request traffic.
- Use parameterized queries always — never string-concatenate SQL.
- Region/Province/Municipality are normalized into real lookup tables with FKs, not the source
  spreadsheet's wide column-per-region layout — see `0001_init_schema.sql`. `psgc_code` columns
  exist but are left NULL by the seed data; fill them in from the official PSGC before relying on
  them. The full nationwide list (18 regions, 88 provinces, 1,649 cities/municipalities) is seeded
  from the source workbook's hidden "Codes"/"Province"/"City-Municipality" sheets via
  `scripts/seed-full-geography.mjs` (safe to re-run — renames existing placeholder rows to their
  official name in place, preserving ids, rather than duplicating them).
- Barangay is **not** a lookup table for present address — `present_barangay_text` is a plain TEXT
  column, populated directly from whatever the caller typed. The source workbook has no barangay
  master list anywhere (there are ~42,000 nationwide); DOLE's real form takes it as free text too
  (confirmed by the "Database" tab's real historical rows). `barangays` still exists and is used by
  the (mostly vestigial) birth/employer-address FK columns the live form doesn't expose yet — see
  `lib/geography.js`.
- Multi-select "check all that apply" form fields (dropout reasons, ailments, hazards, etc.) are
  stored as `JSONB` arrays on `child_profiles` — they're a set for display/storage, never queried
  relationally, so a join table would be overhead without benefit.
- Repeating form sections (family members, services availed/requested) are separate tables with a
  `profile_id` FK and `sort_order`; `PATCH /api/profiles/:id` replaces a sub-table's rows wholesale
  when that array is included in the request body (`familyMembers`/`servicesAvailed`/`servicesRequested`
  top-level keys, not the frontend's nested `formData.family.members`-style shape — see
  [frontend-conventions.md](frontend-conventions.md) for the translation layer). A column's frontend
  field name doesn't always match its DB column 1:1 (e.g. `family_members.monthly_income` <-
  the form's `income` field) — `replaceRows()`'s per-column `{ column, key, coerce }` entries handle
  that, don't assume snake_case-of-column === frontend key.
- `child_profiles.control_no` is generated server-side on create
  (`CL-{year}-{regionalOfficeCode}-{fieldOfficeCode}-{seq}-{M/F/X}`), not client-supplied.
- `PATCH /api/profiles/:id`'s `FIELD_MAP` (in `profiles.routes.js`) is the whitelist of top-level
  body keys it accepts, using the *frontend's* field names (`dob`, `indigenous`, `sitio`, `phone`,
  `ageStopped`, etc.), not the DB's snake_case column names — the encode form's sections
  (`components/encode/*.jsx`) are the source of truth for what those names are. `barangay` is a
  plain `FIELD_MAP` entry (free text, see above). `region`/`province`/`municipality` (given as
  names) are handled separately from `FIELD_MAP`: all three must be present together or the request
  400s, and they're resolved via `resolveGeography()` the same way the Excel importer resolves them.

## Excel import

- Use **`exceljs`** for reading `.xlsx` files, not the npm-registry `xlsx` (SheetJS) package —
  that package has an unpatched high-severity Prototype Pollution + ReDoS advisory
  (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) with no fix on the registry; SheetJS only ships
  patches via their own CDN now. `exceljs` doesn't have that problem and is actively maintained.
- `POST /api/profiles/import` (`import.routes.js`) accepts multipart `.xlsx` uploads via
  `multer` (memory storage, 5MB cap, `.xlsx`-only filter) and always creates new `status: 'draft'`
  rows — it never updates existing profiles by control number.
- 2026-08-24: synced the importer (and its downloadable template) to the real DOLE "Database"
  sheet format — the same 110-column, one-row-per-child shape `scripts/import-legacy-database-sheet.mjs`
  already knew how to parse (see [backend-conventions.md](backend-conventions.md)'s geography
  section and that script's own header comment for the shape: combined name cells, code-packed
  free text for "check all that apply" answers, family members/services flattened into 12
  slot-columns of "Label: value" blobs). The parsing helpers (`blank`, `parseName`, `parseDate`,
  `parseCodeList`, `parseCodeText`, `parseBlob`) live in `src/lib/databaseFormat.js` so the live
  route and that one-off script share one implementation.
- The downloadable template is **not generated from a column list** — it's a direct copy of the
  real master workbook's blank "Database" sheet, versioned at
  `backend/assets/child-profile-import-template-master.xlsx`. `scripts/generate-import-template.mjs`
  just copies that file to `frontend/public/child-profile-import-template.xlsx`; run it after
  replacing the master file. Since matching is by **fixed column position** (`import.routes.js`'s
  `COL` map), not header text, that master file's column order is load-bearing — inserting/
  reordering/deleting a column there needs a matching `COL` update, and regenerating the template.
- Fields with no schema home are silently skipped (documented at the top of `COL` in
  `import.routes.js`): geographic District columns, "specify who/reason" for living arrangement,
  Learning Reference Number, employer address, time-of-work, and the entire referral-tracking
  section (enumerator, date of interview, needs assessed/referred/provided/withdrawn).
- Bad rows are skipped and reported (`{row, message}`), not the whole batch — one typo shouldn't
  lose the rest of a large sheet.

## LGU referrals (2026-08-25)

- `lgu.routes.js` is the second role's whole API surface: `GET /profiles` returns a **work queue**,
  not the full roster — only children with at least one `services_requested` row that has no
  matching `referrals` row yet (a `LEFT JOIN ... WHERE r.id IS NULL`), flattened to one array entry
  per pending service. `POST /referrals` creates one `referrals` row (`{profileId,
  serviceRequestedId, agency}`, agency is `DOLE` or `DSWD`), 409s if that service was already
  referred.
- `referrals.service_requested_id` is nullable with `ON DELETE SET NULL`, not `CASCADE` — because
  `PATCH /api/profiles/:id` wholesale-replaces a profile's `services_requested` rows on every save
  that touches Section C2 (`replaceRows()`), a referral would otherwise vanish (or silently point
  at a stray id) the next time an encoder re-saves that tab. `referrals.assistance` is a **snapshot**
  of the service description at referral time for the same reason — don't join back to
  `services_requested` to display what was referred, the live row may no longer be the same one (or
  may not exist).
- Known gap from that same wholesale-replace behavior: if an encoder re-saves Section C2 *after* one
  of its rows was already referred, the old `services_requested` row is deleted (orphaning that
  referral's `service_requested_id` to `NULL`, though the referral itself and its `assistance`
  snapshot survive) and a new row with the same content gets a new id with no referral pointing at
  it — so it reappears in the LGU queue as pending again. Not fixed; would need `replaceRows()` to
  diff instead of delete+reinsert.

## Timezone — Asia/Manila

- All server-side date/time logic assumes **Asia/Manila** (UTC+8), not server-local time or UTC-only
  assumptions.
- Store timestamps in the database as `timestamptz` (UTC under the hood) and convert to
  `Asia/Manila` only at the presentation layer (API response formatting or frontend), so data stays
  timezone-safe regardless of where the app is hosted.
- If using a library for formatting/conversion (e.g. `dayjs` with the timezone plugin, or `luxon`),
  set the target zone explicitly to `Asia/Manila` rather than relying on the host machine's TZ.
