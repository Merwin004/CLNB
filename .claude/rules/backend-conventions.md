---
name: backend-conventions
description: Express, Neon/Postgres, and timezone conventions for the backend
---

# Backend conventions

## Framework

- Node.js + Express.
- See [auth-conventions.md](auth-conventions.md) for JWT/bcrypt/CORS specifics.

## Database — Neon (PostgreSQL)

- Connect via `DATABASE_URL` (Neon connection string), never hardcode credentials.
- Neon is serverless Postgres — expect connection pooling/cold-start behavior; use a pooled
  connection string (Neon's `-pooler` endpoint) for normal request traffic.
- Use parameterized queries always — never string-concatenate SQL.

## Timezone — Asia/Manila

- All server-side date/time logic assumes **Asia/Manila** (UTC+8), not server-local time or UTC-only
  assumptions.
- Store timestamps in the database as `timestamptz` (UTC under the hood) and convert to
  `Asia/Manila` only at the presentation layer (API response formatting or frontend), so data stays
  timezone-safe regardless of where the app is hosted.
- If using a library for formatting/conversion (e.g. `dayjs` with the timezone plugin, or `luxon`),
  set the target zone explicitly to `Asia/Manila` rather than relying on the host machine's TZ.
