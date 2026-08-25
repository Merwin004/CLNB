---
name: auth-conventions
description: JWT, password hashing, and CORS conventions for the backend
---

# Auth conventions

## JWT (`jsonwebtoken`)

- Access tokens expire in **8 hours** (`expiresIn: '8h'`).
- Sign with a secret from an environment variable (`JWT_SECRET`) — never hardcode it.
- Verify tokens in an Express middleware; attach the decoded payload to `req.user`.
- Do not put sensitive data (passwords, full user records) in the token payload — id + role is enough.

## Roles

- Three roles as of 2026-08-25: `encoder` (creates/edits/imports child profiles — the original
  role), `lgu` (views children with pending service requests and refers them to DOLE/DSWD —
  read-mostly, scoped to `/api/lgu/*`), `admin` (allowed everywhere; not yet assigned to any
  seeded account). `users.role` is CHECK-constrained to these three.
- `requireRole(...roles)` in `middleware/auth.js` mounts after `requireAuth` and 403s if
  `req.user.role` isn't in the list — see `profiles.routes.js`/`import.routes.js`
  (`requireRole('encoder', 'admin')`) and `lgu.routes.js` (`requireRole('lgu', 'admin')`). New
  routes should pick an explicit role gate rather than leaving a route reachable by any
  authenticated role by default.
- The frontend mirrors this: `ProtectedRoute`'s optional `roles` prop (see `App.jsx`) redirects a
  wrong-role signed-in user to their own home (`homeForRole()`) instead of erroring — this is a UX
  nicety only, the real boundary is the backend's `requireRole`.

## Passwords (`bcryptjs`)

- Hash on signup/password-change with a cost factor of 10-12 (`bcrypt.hash(password, 10)`).
- Never store or log plaintext passwords.
- Compare with `bcrypt.compare`, never manual string equality.

## CORS

- Use the `cors` middleware on the Express app.
- Restrict `origin` to the known frontend origin(s) via env var — avoid `origin: '*'` once auth
  cookies/headers are involved.

## Env vars this implies

- `JWT_SECRET`
- `CORS_ORIGIN`
- `DATABASE_URL` (Neon connection string, see [backend-conventions.md](backend-conventions.md))
