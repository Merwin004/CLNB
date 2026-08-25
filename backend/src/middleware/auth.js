import jwt from 'jsonwebtoken'
import { HttpError } from './errorHandler.js'

// Verifies the Bearer token and attaches { id, role } to req.user.
// See .claude/rules/auth-conventions.md — 8h expiry, secret from env only.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    throw new HttpError(401, 'Missing or invalid Authorization header')
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    throw new HttpError(401, 'Invalid or expired token')
  }
}

// Mount after requireAuth. Restricts a route to specific roles — e.g. LGU
// accounts can view pending service requests and refer children, but can't
// create/edit/import profiles; encoders are the reverse.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'Not authorized for this action')
    }
    next()
  }
}
