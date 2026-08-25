// Centralized error handler — keeps route handlers free of try/catch boilerplate
// when paired with the asyncHandler wrapper below.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(err, req, res, next) {
  console.error(err)
  const status = err.status ?? 500
  const message = status === 500 ? 'Internal server error' : err.message
  res.status(status).json({ error: message })
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
