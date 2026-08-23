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
