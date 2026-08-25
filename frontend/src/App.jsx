import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute, { homeForRole } from './components/auth/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import Login from './pages/Login.jsx'
import EncodeChildProfile from './pages/EncodeChildProfile.jsx'
import ChildProfilesTable from './pages/ChildProfilesTable.jsx'
import LguReferrals from './pages/LguReferrals.jsx'

const ENCODER_ROLES = ['encoder', 'admin']
const LGU_ROLES = ['lgu', 'admin']

// "/" has no single fixed destination anymore now that there's more than one
// role's home screen — send each signed-in user to theirs.
function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={homeForRole(user?.role)} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleHomeRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/encode"
              element={
                <ProtectedRoute roles={ENCODER_ROLES}>
                  <EncodeChildProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/encode/:profileId"
              element={
                <ProtectedRoute roles={ENCODER_ROLES}>
                  <EncodeChildProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profiles"
              element={
                <ProtectedRoute roles={ENCODER_ROLES}>
                  <ChildProfilesTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lgu"
              element={
                <ProtectedRoute roles={LGU_ROLES}>
                  <LguReferrals />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
