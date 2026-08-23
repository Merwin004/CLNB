# CLAUDE.md

Team instructions for this project — committed, shared by everyone working in this repo.

## Project

A web system currently in setup phase. No frontend/backend app code exists yet — this repo currently
only holds project-level Claude Code configuration and conventions, decided ahead of implementation.

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

Repo layout is not yet decided (root-level only for now). When frontend/backend code is added, revisit
this file to document the folder structure.

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
- Repo folder structure (e.g. `/frontend` + `/backend`) intentionally deferred until app scaffolding starts.
