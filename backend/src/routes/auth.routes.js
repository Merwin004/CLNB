import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/pool.js'
import { asyncHandler, HttpError } from '../middleware/errorHandler.js'

const router = Router()
const BCRYPT_ROUNDS = 12
const TOKEN_EXPIRY = '8h'
const ROLES = ['encoder', 'admin', 'lgu']

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

// POST /api/auth/register — creates an account (encoder by default; pass
// role to provision an LGU/admin account instead — see .claude/rules/
// auth-conventions.md for the current roles: encoder, lgu, admin).
// Intended for admin-provisioned accounts, not public self-signup; add an
// admin-only guard here before exposing this outside the local network.
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, fullName, role = 'encoder' } = req.body ?? {}
    if (!email || !password || !fullName) {
      throw new HttpError(400, 'email, password, and fullName are required')
    }
    if (password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters')
    }
    if (!ROLES.includes(role)) {
      throw new HttpError(400, `role must be one of: ${ROLES.join(', ')}`)
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'An account with that email already exists')
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      [email, passwordHash, fullName, role],
    )

    const user = result.rows[0]
    res.status(201).json({ user, token: signToken(user) })
  }),
)

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      throw new HttpError(400, 'email and password are required')
    }

    const result = await query('SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    // Same error for "no such user" and "wrong password" — don't leak which one it was.
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!user || !passwordMatches) {
      throw new HttpError(401, 'Invalid email or password')
    }

    const { password_hash, ...publicUser } = user
    res.json({ user: publicUser, token: signToken(user) })
  }),
)

export default router
