import { Outlet } from 'react-router-dom'

// Shared chrome for every route — keeps future nav/auth state in one place
// instead of duplicating it per page. See .claude/rules/frontend-conventions.md.
export default function AppLayout() {
  return (
    <div className="h-screen overflow-hidden bg-brand-100 max-[920px]:h-auto max-[920px]:overflow-visible">
      <Outlet />
    </div>
  )
}
