import { createContext, useContext, useState, useCallback } from 'react'
import { getStoredUser, login as apiLogin, clearSession } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())

  const login = useCallback(async (email, password) => {
    const loggedInUser = await apiLogin(email, password)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
