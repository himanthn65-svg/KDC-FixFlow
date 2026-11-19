import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import {
  getStoredUser,
  getAccessToken,
  loginUser,
  loginAdmin,
  logoutUser,
} from '../features/authentication/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = getStoredUser()
    const token = getAccessToken()

    return storedUser && token ? storedUser : null
  })

  const login = useCallback(async (credentials) => {
    const authenticatedUser = await loginUser(credentials)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const adminLogin = useCallback(async (credentials) => {
    const authenticatedUser = await loginAdmin(credentials)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
  }, [])

  const isAuthenticated = Boolean(user && getAccessToken())

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isStudent: user?.role === 'student',
    isStaff: user?.role === 'maintenance_staff',
    isAdmin: user?.role === 'admin',
    login,
    adminLogin,
    logout,
  }), [user, isAuthenticated, login, adminLogin, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
