import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthLayout from '../../components/layout/AuthLayout'
import { useAuth } from '../../context/AuthContext'

export default function AdminLoginPage() {
  const { adminLogin } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
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
      await adminLogin({
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Administrator sign in failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      admin
      title="Administrator sign in"
      subtitle="Sign in to manage campus operations and maintenance."
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">Restricted access</p>
          <p className="mt-1 text-xs text-slate-500">Authorized administrators only</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="Administrator email"
              className="input-premium pl-11"
            />
          </div>
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="admin-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Enter administrator password"
              className="input-premium pl-11 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
          {loading ? 'Verifying...' : 'Secure Sign In'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-7 border-t border-white/10 pt-5 text-center">
        <Link to="/login" className="text-sm text-slate-400 transition hover:text-cyan-300">
          Back to Student & Staff Login
        </Link>
      </div>
    </AuthLayout>
  )
}
