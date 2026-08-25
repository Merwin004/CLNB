import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// Where each role lands when it hits a route it's not allowed on (including
// "/") — not just /login, since an authenticated-but-wrong-role user should
// land on their own home, not be treated as logged out.
const ROLE_HOME = { lgu: '/lgu' }
const DEFAULT_HOME = '/encode'

export function homeForRole(role) {
  return ROLE_HOME[role] ?? DEFAULT_HOME
}

// `roles`, if given, restricts the route to those roles — see App.jsx.
// Encoder-facing screens (encode/profiles) exclude 'lgu' and vice versa,
// since each role's API access is scoped server-side the same way (see
// backend/src/middleware/auth.js's requireRole) and landing on a screen
// whose API calls will just 403 is a worse experience than redirecting.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return children
}
