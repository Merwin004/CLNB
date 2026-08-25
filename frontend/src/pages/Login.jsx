import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeForRole } from '../components/auth/ProtectedRoute.jsx'
import TextField from '../components/form/TextField.jsx'
import { ApiError } from '../lib/api.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Pre-filled for local testing only — import.meta.env.DEV is false in a
  // production build, so this never ships with real credentials baked in.
  const [email, setEmail] = useState(import.meta.env.DEV ? 'encoder@clprofiling.local' : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? '5PDbnEDbzgBSBd' : '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(email, password)
      // If they were bounced here from a specific protected route, send them
      // back there; otherwise land on whatever screen their role owns (an
      // LGU account has no reason to default to /encode, and vice versa).
      navigate(location.state?.from ?? homeForRole(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // Solid brand-color background with a floating card centered on top — no
    // background photo for now (removed 2026-08-25; re-add an <img> here the
    // same way if/when a new one is ready). No nav bar (no other public
    // pages to link to) and no remember-me/forgot-password/register links
    // (none of those flows exist for this single seeded encoder account).
    <div className="flex h-screen items-center justify-center bg-brand-900">
      <div className="mx-4 w-full max-w-[420px] rounded-3xl border border-brand-200 bg-white p-10 shadow-2xl">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-700">
          Child Labor National Database
        </p>
        <h1 className="mt-3 text-[42px] font-bold leading-tight tracking-tight text-brand-900">Sign in</h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@dole.gov.ph"
          />
          <TextField
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
          />

          {error && (
            <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 rounded-xl bg-brand-900 px-4 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
