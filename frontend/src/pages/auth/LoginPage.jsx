import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthLayout from '../../components/layout/AuthLayout'
import { useAuth } from '../../context/AuthContext'

function getDashboardPath(role) {
  if (role === 'student') return '/student/dashboard'
  if (role === 'maintenance_staff') return '/staff/dashboard'
  return '/'
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    email: '',
    password: '',
    login_as: 'student',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login({
        email: form.email.trim(),
        password: form.password,
        login_as: form.login_as,
      })

      const destination = location.state?.from?.pathname
      navigate(destination || getDashboardPath(user.role), { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to sign in. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Access your campus workspace securely."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@kdc.edu"
              className="input-premium pl-11"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="input-premium pl-11 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-cyan-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="login_as" className="mb-2 block text-sm font-medium text-slate-300">
            Login As
          </label>
          <select
            id="login_as"
            name="login_as"
            required
            value={form.login_as}
            onChange={handleChange}
            className="input-premium"
          >
            <option value="student">Student</option>
            <option value="maintenance_staff">Maintenance Staff</option>
          </select>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-3d w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-7 space-y-4 text-center text-sm">
        <p className="text-slate-400">
          New student?{' '}
          <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Create an account
          </Link>
        </p>

        <div className="border-t border-white/10 pt-5">
          <Link
            to="/admin/login"
            className="text-xs text-slate-500 transition hover:text-cyan-300"
          >
            Administrator access
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
