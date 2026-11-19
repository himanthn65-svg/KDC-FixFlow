import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRound, Mail, Lock, Eye, EyeOff, GraduationCap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthLayout from '../../components/layout/AuthLayout'
import { registerStudent } from '../../features/authentication/authService'

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  student_id: '',
  department: '',
  academic_year: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await registerStudent({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        student_id: form.student_id.trim(),
        department: form.department.trim(),
        academic_year: form.academic_year.trim(),
      })

      setSuccess('Your student account has been created. You can now sign in.')
      setForm(initialForm)

      setTimeout(() => navigate('/login', { replace: true }), 1600)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Registration failed. Please check your details.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create student account"
      subtitle="Register with your college details to access KDC FixFlow."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-slate-300">
            Full Name
          </label>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={150}
              required
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="input-premium pl-11"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="register-email"
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
          <label htmlFor="student_id" className="mb-2 block text-sm font-medium text-slate-300">
            Student ID / Roll Number
          </label>
          <div className="relative">
            <GraduationCap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="student_id"
              name="student_id"
              type="text"
              maxLength={50}
              required
              value={form.student_id}
              onChange={handleChange}
              placeholder="Enter your student ID"
              className="input-premium pl-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="department" className="mb-2 block text-sm font-medium text-slate-300">
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              maxLength={100}
              required
              value={form.department}
              onChange={handleChange}
              placeholder="e.g. BCA"
              className="input-premium"
            />
          </div>

          <div>
            <label htmlFor="academic_year" className="mb-2 block text-sm font-medium text-slate-300">
              Academic Year
            </label>
            <input
              id="academic_year"
              name="academic_year"
              type="text"
              maxLength={30}
              required
              value={form.academic_year}
              onChange={handleChange}
              placeholder="e.g. 2026–27"
              className="input-premium"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
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
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            {success}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-3d w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create Student Account'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
