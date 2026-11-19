import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getDashboardPath(role) {
  switch (role) {
    case 'student':
      return '/student/dashboard'
    case 'maintenance_staff':
      return '/staff/dashboard'
    case 'admin':
      return '/admin/dashboard'
    default:
      return '/'
  }
}

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/admin')
      ? '/admin/login'
      : '/login'

    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location }}
      />
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={getDashboardPath(user.role)}
        replace
      />
    )
  }

  return <Outlet />
}
