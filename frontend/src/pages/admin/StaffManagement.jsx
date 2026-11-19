
import { useCallback, useEffect, useState } from 'react'
import {
  UserPlus,
  Users,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'

import api from '../../services/api'

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  employee_id: '',
  department: '',
  specialization: '',
  phone_number: '',
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(', ')
  }

  return error?.message || 'Something went wrong. Please try again.'
}

function getStaffList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.staff)) return data.staff
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStaff = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const response = await api.get('/admin/staff')
      setStaff(getStaffList(response.data))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function createStaff(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    setSubmitting(true)

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      employee_id: form.employee_id.trim(),
      department: form.department.trim(),
      specialization: form.specialization.trim() || null,
      phone_number: form.phone_number.trim() || null,
    }

    try {
      await api.post('/admin/staff', payload)

      setForm(initialForm)
      setShowForm(false)
      setSuccess('Maintenance staff account created successfully.')

      await loadStaff()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStaffStatus(member) {
    const nextStatus = !member.is_active

    const confirmed = window.confirm(
      `${nextStatus ? 'Activate' : 'Deactivate'} ${member.full_name}?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setUpdatingId(member.id)

    try {
      await api.patch(`/admin/staff/${member.id}/status`, {
        is_active: nextStatus,
      })

      setSuccess(
        `${member.full_name} has been ${nextStatus ? 'activated' : 'deactivated'}.`
      )

      await loadStaff()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUpdatingId(null)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()

  const filteredStaff = staff.filter((member) => {
    const matchesSearch = [
      member.full_name,
      member.email,
      member.employee_id,
      member.department,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))

    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && member.is_active) ||
      (filter === 'inactive' && !member.is_active)

    return matchesSearch && matchesFilter
  })

  const activeCount = staff.filter((member) => member.is_active).length
  const inactiveCount = staff.length - activeCount

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Administration
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Staff Management
          </h2>
          <p className="mt-2 text-base text-slate-400">
            Create and manage maintenance staff accounts.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadStaff(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setError('')
              setSuccess('')
              setShowForm((value) => !value)
            }}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            {showForm ? <X size={18} /> : <UserPlus size={18} />}
            {showForm ? 'Close Form' : 'Add Staff'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Staff" value={staff.length} icon={<Users size={21} />} />
        <StatCard label="Active Staff" value={activeCount} icon={<ShieldCheck size={21} />} />
        <StatCard label="Inactive Staff" value={inactiveCount} icon={<ShieldOff size={21} />} />
      </div>

      {showForm && (
        <form
          onSubmit={createStaff}
          className="animate-in fade-in slide-in-from-top-3 duration-300 rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-xl sm:p-7"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">Create Staff Account</h3>
            <p className="mt-1 text-sm text-slate-400">
              Enter the maintenance staff member's account and employment details.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Full Name" name="full_name" value={form.full_name} onChange={updateField} required placeholder="Enter full name" />
            <FormField label="Email Address" name="email" type="email" value={form.email} onChange={updateField} required placeholder="staff@example.com" />
            <FormField label="Password" name="password" type="password" value={form.password} onChange={updateField} required minLength={8} placeholder="Minimum 8 characters" />
            <FormField label="Employee ID" name="employee_id" value={form.employee_id} onChange={updateField} required placeholder="EMP-001" />
            <FormField label="Department" name="department" value={form.department} onChange={updateField} required placeholder="Electrical Maintenance" />
            <FormField label="Specialization" name="specialization" value={form.specialization} onChange={updateField} placeholder="Electrical / Plumbing / Civil" />
            <FormField label="Phone Number" name="phone_number" value={form.phone_number} onChange={updateField} placeholder="Enter phone number" />
          </div>

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(initialForm)
              }}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {submitting && <LoaderCircle size={17} className="animate-spin" />}
              {submitting ? 'Creating Account...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, employee ID..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'inactive'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition ${
                filter === value
                  ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-bold text-white">Maintenance Team</h3>
          <p className="mt-1 text-sm text-slate-400">
            {filteredStaff.length} staff member{filteredStaff.length === 1 ? '' : 's'} displayed
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
            <LoaderCircle size={21} className="animate-spin text-cyan-300" />
            Loading staff members...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Users size={34} className="mx-auto text-slate-600" />
            <p className="mt-4 text-base font-semibold text-slate-300">
              No staff members found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try another search or create a staff account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {filteredStaff.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-lg font-bold text-cyan-200">
                    {member.full_name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-base font-bold text-white">
                      {member.full_name}
                    </h4>
                    <p className="mt-1 truncate text-sm text-slate-400">
                      {member.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-md bg-white/5 px-2 py-1">
                        ID: {member.employee_id}
                      </span>
                      <span className="rounded-md bg-white/5 px-2 py-1">
                        {member.department}
                      </span>
                      {member.specialization && (
                        <span className="rounded-md bg-white/5 px-2 py-1">
                          {member.specialization}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      member.is_active
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'bg-rose-400/10 text-rose-300'
                    }`}
                  >
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <button
                    type="button"
                    disabled={updatingId === member.id}
                    onClick={() => toggleStaffStatus(member)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                      member.is_active
                        ? 'border-rose-400/20 text-rose-300 hover:bg-rose-400/10'
                        : 'border-emerald-400/20 text-emerald-300 hover:bg-emerald-400/10'
                    }`}
                  >
                    {updatingId === member.id ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : member.is_active ? (
                      <ShieldOff size={16} />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-400">{label}</p>
        <span className="rounded-xl bg-cyan-300/10 p-2.5 text-cyan-200">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-white">{value}</p>
    </div>
  )
}

function FormField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  minLength,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">
        {label}{required && <span className="ml-1 text-cyan-300">*</span>}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
      />
    </label>
  )
}
