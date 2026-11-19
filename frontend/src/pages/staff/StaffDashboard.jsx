
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BellRing,
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  ImagePlus,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Save,
  ShieldAlert,
  User,
  UserRound,
  UserCircle2,
  Wrench,
  X,
} from 'lucide-react'

import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
).replace(/\/api\/v1\/?$/, '')

function imageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

function getError(error) {
  const detail = error?.response?.data?.detail
  const message = error?.response?.data?.message

  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message || String(item)).join(', ')
  }
  if (detail && typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail)
  }
  if (typeof message === 'string') return message
  if (message && typeof message === 'object') {
    return message.message || JSON.stringify(message)
  }
  return error?.message || 'Something went wrong. Please try again.'
}

function statusLabel(status) {
  return String(status || 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getIssue(order) {
  return order?.issue || order?.complaint || order?.issue_details || {}
}

function getLocation(issue) {
  const location = issue?.location
  if (!location) return 'Location not provided'
  if (typeof location === 'string') return location

  return [
    location.name,
    location.building,
    location.floor,
    location.code,
  ].filter(Boolean).join(' • ') || 'Location not provided'
}

function StatusBadge({ status }) {
  const value = String(status || '').toLowerCase()

  const styles = {
    assigned: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
    accepted: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
    in_progress: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    rejected: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[value] || 'border-white/10 bg-white/5 text-slate-300'}`}>
      {statusLabel(status)}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, description, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-cyan-400/10 p-4 text-cyan-300">
        <Wrench size={28} />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
    </div>
  )
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [workOrders, setWorkOrders] = useState([])
  const [profile, setProfile] = useState(null)
  const [notifications, setNotifications] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pageError, setPageError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [activeSection, setActiveSection] = useState('profile')
  const [profileForm, setProfileForm] = useState({ full_name: '', bio: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const [rejectReason, setRejectReason] = useState('')
  const [completionNotes, setCompletionNotes] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const photoInputRef = useRef(null)

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    setPageError('')

    const results = await Promise.allSettled([
      api.get('/work-orders/my'),
      api.get('/users/staff-profile'),
      api.get('/notifications', { params: { skip: 0, limit: 20 } }),
    ])

    if (results[0].status === 'fulfilled') {
      setWorkOrders(Array.isArray(results[0].value.data) ? results[0].value.data : [])
    } else {
      setPageError(getError(results[0].reason))
    }

    if (results[1].status === 'fulfilled') {
      const staffProfile = results[1].value.data
      setProfile(staffProfile)
      setProfileForm({
        full_name: staffProfile?.full_name || user?.full_name || '',
        bio: staffProfile?.bio || '',
      })
    } else {
      setProfile(null)
    }

    if (results[2].status === 'fulfilled') {
      setNotifications(Array.isArray(results[2].value.data) ? results[2].value.data : [])
    }

    setLoading(false)
    setRefreshing(false)
  }, [user?.full_name])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const counts = useMemo(() => ({
    total: workOrders.length,
    assigned: workOrders.filter((item) => item.status === 'assigned').length,
    active: workOrders.filter((item) => ['accepted', 'in_progress'].includes(item.status)).length,
    completed: workOrders.filter((item) => item.status === 'completed').length,
  }), [workOrders])

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      const issue = getIssue(order)
      const matchesTab = activeTab === 'all' || order.status === activeTab
      const searchText = [
        order.id,
        order.issue_id,
        issue.title,
        issue.category,
        issue.description,
        getLocation(issue),
      ].join(' ').toLowerCase()

      return matchesTab && searchText.includes(search.toLowerCase())
    })
  }, [workOrders, activeTab, search])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const openOrder = async (order) => {
    setSelectedOrder(order)
    setDetailLoading(true)
    setPhotoError('')

    try {
      const response = await api.get(`/work-orders/${order.id}/details`)
      setSelectedOrder(response.data)
    } catch {
      // Keep the work-order data from the list if the detail request fails.
    } finally {
      setDetailLoading(false)
    }
  }

  const runAction = async (path, successMessage) => {
    if (!selectedOrder?.id) return

    setActionLoading(true)

    try {
      await api.post(path)
      await loadDashboard(true)

      const updated = await api.get(`/work-orders/${selectedOrder.id}/details`)
      setSelectedOrder(updated.data)

      window.alert(successMessage)
    } catch (error) {
      window.alert(getError(error))
    } finally {
      setActionLoading(false)
    }
  }

  const acceptOrder = () => {
    runAction(`/work-orders/${selectedOrder.id}/accept`, 'Work order accepted successfully.')
  }

  const startOrder = () => {
    runAction(`/work-orders/${selectedOrder.id}/start`, 'Maintenance work started.')
  }

  const rejectOrder = async () => {
    if (rejectReason.trim().length < 5) {
      window.alert('Please enter a rejection reason with at least 5 characters.')
      return
    }

    setActionLoading(true)

    try {
      await api.post(`/work-orders/${selectedOrder.id}/reject`, {
        reason: rejectReason.trim(),
      })

      setShowRejectModal(false)
      setRejectReason('')
      setSelectedOrder(null)
      await loadDashboard(true)
      window.alert('Work order rejected. The administrator has been notified.')
    } catch (error) {
      window.alert(getError(error))
    } finally {
      setActionLoading(false)
    }
  }

  const completeOrder = async () => {
    if (completionNotes.trim().length < 5) {
      window.alert('Please enter completion notes with at least 5 characters.')
      return
    }

    setActionLoading(true)

    try {
      await api.post(`/work-orders/${selectedOrder.id}/complete`, {
        staff_notes: completionNotes.trim(),
      })

      setShowCompleteModal(false)
      setCompletionNotes('')
      await loadDashboard(true)

      try {
        const updated = await api.get(`/work-orders/${selectedOrder.id}/details`)
        setSelectedOrder(updated.data)
      } catch {
        setSelectedOrder(null)
      }

      window.alert('Work marked as completed. It is now awaiting administrator verification.')
    } catch (error) {
      window.alert(getError(error))
    } finally {
      setActionLoading(false)
    }
  }

  const uploadRepairPhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !selectedOrder?.id) return

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size must be 5 MB or less.')
      return
    }

    const formData = new FormData()
    formData.append('photo', file)

    setUploadingPhoto(true)
    setPhotoError('')

    try {
      await api.post(`/work-orders/${selectedOrder.id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updated = await api.get(`/work-orders/${selectedOrder.id}/details`)
      setSelectedOrder(updated.data)
      await loadDashboard(true)
    } catch (error) {
      setPhotoError(getError(error))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const uploadProfilePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert('Image size must be 5 MB or less.')
      return
    }

    const formData = new FormData()
    formData.append('photo', file)

    setActionLoading(true)

    try {
      const response = await api.post('/users/staff-profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updatedProfile = response.data?.profile || response.data
      if (updatedProfile && typeof updatedProfile === 'object') {
        setProfile((current) => ({ ...current, ...updatedProfile }))
      }
      setNotice({ type: 'success', message: 'Profile photo updated successfully.' })
    } catch (error) {
      setNotice({ type: 'error', message: getError(error) })
    } finally {
      setActionLoading(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (profileForm.full_name.trim().length < 2) {
      setNotice({ type: 'error', message: 'Please enter a name with at least 2 characters.' })
      return
    }

    setProfileSaving(true)
    setNotice({ type: '', message: '' })
    try {
      const response = await api.patch('/users/staff-profile', {
        full_name: profileForm.full_name.trim(),
        bio: profileForm.bio.trim(),
      })
      const updatedProfile = response.data?.profile || response.data
      setProfile((current) => ({ ...current, ...updatedProfile }))
      setProfileForm({
        full_name: updatedProfile?.full_name || profileForm.full_name.trim(),
        bio: updatedProfile?.bio ?? profileForm.bio.trim(),
      })
      setNotice({ type: 'success', message: 'Your profile has been updated.' })
    } catch (error) {
      setNotice({ type: 'error', message: getError(error) })
    } finally {
      setProfileSaving(false)
    }
  }

  const markNotificationRead = async (notification) => {
    if (notification.is_read) return

    try {
      await api.patch(`/notifications/${notification.id}/read`)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      )
    } catch (error) {
      setNotice({ type: 'error', message: getError(error) })
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      )
    } catch (error) {
      setNotice({ type: 'error', message: getError(error) })
    }
  }

  const staffName = profile?.full_name || user?.full_name || 'Maintenance Staff'
  const staffEmail = profile?.email || user?.email || ''
  const staffPhoto = imageUrl(profile?.profile_photo)
  const issue = selectedOrder ? getIssue(selectedOrder) : {}
  const issuePhotos = issue?.photos || selectedOrder?.photos || []
  const history = issue?.status_history || issue?.history || []

  const tabs = [
    { id: 'all', label: 'All Work', count: counts.total },
    { id: 'assigned', label: 'New Assignments', count: counts.assigned },
    { id: 'accepted', label: 'Accepted', count: workOrders.filter((item) => item.status === 'accepted').length },
    { id: 'in_progress', label: 'In Progress', count: workOrders.filter((item) => item.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ]

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-950/60 p-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/15 p-2.5 text-cyan-300">
              <Wrench size={23} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide text-white">KDC FixFlow</p>
              <p className="text-xs text-slate-500">Maintenance Workspace</p>
            </div>
          </div>

          <div className="mt-12">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            {[
              { id: 'profile', label: 'My Profile', icon: UserCircle2 },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'work-orders', label: 'Work Orders', icon: Activity },
              { id: 'history', label: 'Work History', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSection(id)
                  setSelectedOrder(null)
                }}
                className={`mt-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeSection === id
                    ? 'bg-cyan-400/10 font-semibold text-cyan-200'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3"><Icon size={18} /> {label}</span>
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-cyan-400/10 text-cyan-200">
                {staffPhoto ? (
                  <img src={staffPhoto} alt="Staff profile" className="h-full w-full object-cover" />
                ) : <UserRound size={20} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{staffName}</p>
                <p className="truncate text-xs text-slate-500">Maintenance Staff</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-5 flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-300"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Maintenance Portal</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {({ profile: 'My Profile', notifications: 'Notifications', 'work-orders': 'Work Orders', history: 'Work History' })[activeSection]}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {({
                  profile: 'Manage your staff profile and personal information.',
                  notifications: 'All your assignment alerts and maintenance updates in one place.',
                  'work-orders': 'Review assignments and update maintenance progress.',
                  history: 'Review your completed and rejected maintenance assignments.',
                })[activeSection]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                title="Refresh dashboard"
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>

              {activeSection !== 'profile' && (
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 pr-3 transition hover:bg-white/10"
                  title="Open my profile"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-cyan-400/10 text-cyan-200">
                    {staffPhoto ? <img src={staffPhoto} alt="Profile" className="h-full w-full object-cover" /> : <UserRound size={19} />}
                  </div>
                  <span className="hidden max-w-32 truncate text-sm font-medium text-white sm:block">{staffName}</span>
                </button>
              )}
            </div>
          </header>

          <nav className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/55 p-2 lg:hidden">
            {[
              { id: 'profile', label: 'My Profile', icon: UserCircle2 },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'work-orders', label: 'Work Orders', icon: Activity },
              { id: 'history', label: 'Work History', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => { setActiveSection(id); setSelectedOrder(null) }} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold transition ${activeSection === id ? 'bg-cyan-300/15 text-cyan-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Icon size={16} /> {label}
                {id === 'notifications' && unreadCount > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">{unreadCount}</span>}
              </button>
            ))}
          </nav>

          <div className="mb-6 lg:hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10"
            >
              <LogOut size={17} /> Sign Out
            </button>
          </div>

          {notice.message && (
            <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-400/25 bg-rose-400/10 text-rose-200' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'}`}>
              {notice.type === 'error' ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
              <span className="min-w-0 flex-1">{notice.message}</span>
              <button type="button" onClick={() => setNotice({ type: '', message: '' })} aria-label="Dismiss message"><X size={16} /></button>
            </div>
          )}

          {/* UPDATED: Centered and enlarged staff profile */}
          {activeSection === 'profile' && (
            <section className="mx-auto w-full max-w-5xl space-y-8">
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-7 shadow-2xl sm:p-10">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-cyan-300/30 bg-cyan-400/10 text-cyan-200 shadow-xl shadow-cyan-500/10 sm:h-44 sm:w-44">
                    {staffPhoto ? (
                      <img
                        src={staffPhoto}
                        alt="Staff profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound size={68} />
                    )}
                  </div>

                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Maintenance Staff
                  </p>

                  <h2 className="mt-3 max-w-full break-words text-3xl font-bold text-white sm:text-4xl">
                    {staffName}
                  </h2>

                  <p className="mt-2 max-w-full break-all text-sm text-slate-400 sm:text-base">
                    {staffEmail}
                  </p>

                  <span className="mt-4 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-2 text-sm font-semibold text-cyan-200">
                    Employee ID: {profile?.employee_id || '—'}
                  </span>

                  <label className={`mt-7 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 ${actionLoading ? 'pointer-events-none opacity-50' : ''}`}>
                    {actionLoading ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <ImagePlus size={17} />
                    )}
                    Change Profile Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadProfilePhoto}
                      disabled={actionLoading}
                    />
                  </label>
                </div>
              </div>

              <form
                onSubmit={saveProfile}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl sm:p-9"
              >
                <div className="mb-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    Personal Details
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Edit Profile
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Update your display name and short bio. Your staff ID and department remain managed by the administrator.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">
                      Full Name
                    </span>
                    <input
                      value={profileForm.full_name}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          full_name: event.target.value,
                        }))
                      }
                      minLength={2}
                      maxLength={150}
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                      placeholder="Enter your full name"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">
                      Email Address
                    </span>
                    <input
                      value={staffEmail}
                      readOnly
                      className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-500"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">
                      Bio
                    </span>
                    <textarea
                      value={profileForm.bio}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          bio: event.target.value,
                        }))
                      }
                      rows={4}
                      maxLength={500}
                      placeholder="Write a short introduction about your role, experience or maintenance interests..."
                      className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
                    />
                    <span className="mt-1 block text-right text-xs text-slate-600">
                      {profileForm.bio.length}/500
                    </span>
                  </label>
                </div>

                <div className="mt-7 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {profileSaving ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>

              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl sm:p-9">
                <h2 className="text-xl font-bold text-white">
                  Staff Information
                </h2>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    ['Employee ID', profile?.employee_id],
                    ['Department', profile?.department],
                    ['Specialization', profile?.specialization],
                    ['Phone Number', profile?.phone_number],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
                    >
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-2 break-words text-lg font-semibold text-white">
                        {value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl sm:p-7">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Activity centre</p>
                  <h2 className="mt-2 text-xl font-bold text-white">All Notifications</h2>
                  <p className="mt-1 text-sm text-slate-400">Read every assignment, status change and maintenance update.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">{unreadCount} unread</span>
                  <button type="button" onClick={markAllRead} disabled={!unreadCount} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">Mark all as read</button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="py-12"><EmptyState title="You're all caught up" description="New assignments and work updates will appear here." /></div>
              ) : (
                <div className="mt-5 space-y-3">
                  {notifications.map((notification) => (
                    <article key={notification.id} className={`rounded-2xl border p-5 transition ${notification.is_read ? 'border-white/[0.07] bg-white/[0.02]' : 'border-cyan-300/20 bg-cyan-300/[0.045]'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 rounded-xl p-3 ${notification.is_read ? 'bg-white/5 text-slate-400' : 'bg-cyan-300/10 text-cyan-200'}`}><BellRing size={20} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="break-words text-base font-semibold text-white">{notification.title || 'KDC FixFlow Update'}</h3>
                            {notification.is_read ? <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-500">Read</span> : <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200">New</span>}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{notification.message || 'You have a new update.'}</p>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                            <p className="text-xs text-slate-500">{formatDateTime(notification.created_at)}</p>
                            {!notification.is_read && <button type="button" onClick={() => markNotificationRead(notification)} className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-100">Mark as read</button>}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'history' && (
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl sm:p-7">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Past assignments</p>
                <h2 className="mt-2 text-xl font-bold text-white">Work History</h2>
                <p className="mt-1 text-sm text-slate-400">Completed and rejected work orders assigned to you.</p>
              </div>
              {workOrders.filter((order) => ['completed', 'rejected'].includes(order.status)).length === 0 ? (
                <EmptyState title="No work history yet" description="Completed or rejected assignments will appear here." />
              ) : (
                <div className="space-y-3">
                  {workOrders.filter((order) => ['completed', 'rejected'].includes(order.status)).map((order) => {
                    const item = getIssue(order)
                    return (
                      <article key={order.id} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-cyan-300">Work Order #{order.id} · Complaint #{order.issue_id}</p>
                            <h3 className="mt-2 break-words text-base font-semibold text-white">{item.title || `Maintenance Complaint #${order.issue_id}`}</h3>
                            <p className="mt-2 text-sm text-slate-400">{getLocation(item)}</p>
                            <p className="mt-2 text-xs text-slate-500">{order.completed_at ? `Completed ${formatDateTime(order.completed_at)}` : order.updated_at ? `Updated ${formatDateTime(order.updated_at)}` : `Assigned ${formatDate(order.assigned_at)}`}</p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="mt-4 flex justify-end border-t border-white/[0.07] pt-3">
                          <button type="button" onClick={() => openOrder(order)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5">View Details <ArrowRight size={15} /></button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {activeSection === 'work-orders' && (
            <>
              <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={FileText} label="Total Assignments" value={counts.total} description="All work orders assigned to you" accent="bg-cyan-400/10 text-cyan-300" />
                <StatCard icon={Clock3} label="New Assignments" value={counts.assigned} description="Waiting for your response" accent="bg-blue-400/10 text-blue-300" />
                <StatCard icon={Activity} label="Active Work" value={counts.active} description="Accepted or currently in progress" accent="bg-amber-400/10 text-amber-300" />
                <StatCard icon={CheckCircle2} label="Completed" value={counts.completed} description="Work marked as completed" accent="bg-emerald-400/10 text-emerald-300" />
              </section>

              <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 shadow-xl shadow-black/10 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">My Work Orders</h2>
                    <p className="mt-1 text-sm text-slate-400">Review assignments and update maintenance progress.</p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search work orders..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        activeTab === tab.id
                          ? 'bg-cyan-400/15 text-cyan-200'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]">{tab.count}</span>
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 className="mr-3 animate-spin" size={22} /> Loading your work orders...
                  </div>
                ) : pageError ? (
                  <div className="my-6 rounded-xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-300">
                    <div className="flex items-center gap-2 font-semibold"><AlertCircle size={18} /> Unable to load work orders</div>
                    <p className="mt-2">{pageError}</p>
                    <button onClick={() => loadDashboard()} className="mt-4 rounded-lg bg-rose-400/10 px-4 py-2 font-semibold hover:bg-rose-400/20">Try Again</button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      title={search ? 'No matching work orders' : 'No work orders here yet'}
                      description={search ? 'Try another search term or choose a different status filter.' : 'New maintenance assignments from the administrator will appear here.'}
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4">
                    {filteredOrders.map((order) => {
                      const item = getIssue(order)

                      return (
                        <article
                          key={order.id}
                          className="rounded-xl border border-white/10 bg-slate-950/45 p-4 transition hover:border-cyan-400/30 sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-cyan-300">WO #{order.id}</span>
                                <span className="text-xs text-slate-600">•</span>
                                <span className="text-xs text-slate-500">Complaint #{order.issue_id}</span>
                              </div>
                              <h3 className="mt-2 text-lg font-semibold text-white">
                                {item.title || `Maintenance Complaint #${order.issue_id}`}
                              </h3>
                            </div>
                            <StatusBadge status={order.status} />
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                            {item.description || 'Open this work order to view the complaint details.'}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {getLocation(item)}</span>
                            <span className="flex items-center gap-1.5"><CalendarDays size={14} /> Assigned {formatDate(order.assigned_at)}</span>
                            {item.category && <span className="flex items-center gap-1.5"><Wrench size={14} /> {item.category}</span>}
                          </div>

                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                            <div className="flex flex-wrap gap-2">
                              {item.priority && (
                                <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                                  Priority: {statusLabel(item.priority)}
                                </span>
                              )}
                              {item.severity && (
                                <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                                  Severity: {statusLabel(item.severity)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => openOrder(order)}
                              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                            >
                              View Details <ArrowRight size={16} />
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-xs text-slate-600">
            <span>KDC FixFlow • Maintenance Staff Workspace</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-rose-300 lg:hidden">
              <LogOut size={14} /> Sign Out
            </button>
          </footer>
        </main>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101827] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Work Order #{selectedOrder.id}</p>
                <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                  {issue.title || `Complaint #${selectedOrder.issue_id}`}
                </h2>
                <div className="mt-2"><StatusBadge status={selectedOrder.status} /></div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                <X size={21} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              {detailLoading && (
                <p className="mb-4 flex items-center gap-2 text-sm text-cyan-300">
                  <Loader2 size={16} className="animate-spin" /> Loading complaint details...
                </p>
              )}

              <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-5">
                  <section>
                    <h3 className="mb-2 font-semibold text-white">Complaint Description</h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {issue.description || 'No description available.'}
                    </p>
                  </section>

                  <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Category</p>
                      <p className="mt-1 text-sm font-medium text-white">{issue.category || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Priority</p>
                      <p className="mt-1 text-sm font-medium text-white">{statusLabel(issue.priority)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Severity</p>
                      <p className="mt-1 text-sm font-medium text-white">{statusLabel(issue.severity)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reported On</p>
                      <p className="mt-1 text-sm font-medium text-white">{formatDateTime(issue.created_at)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white"><MapPin size={15} className="text-cyan-300" /> {getLocation(issue)}</p>
                    </div>
                  </section>

                  {issue.is_safety_concern && (
                    <div className="flex gap-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-rose-200">
                      <ShieldAlert className="shrink-0" size={20} />
                      <div>
                        <p className="font-semibold">Safety Concern</p>
                        <p className="mt-1 text-sm text-rose-200/80">This complaint has been flagged as a safety concern. Please take appropriate precautions.</p>
                      </div>
                    </div>
                  )}

                  <section>
                    <h3 className="mb-3 font-semibold text-white">Student / Reporter</h3>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="flex items-center gap-2 text-sm text-white"><User size={16} className="text-cyan-300" /> {issue.reporter?.full_name || issue.reporter_name || 'Reporter details unavailable'}</p>
                      {issue.reporter?.email && <p className="mt-2 text-sm text-slate-400">{issue.reporter.email}</p>}
                    </div>
                  </section>

                  {selectedOrder.admin_instructions && (
                    <section>
                      <h3 className="mb-3 font-semibold text-white">Administrator Instructions</h3>
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm leading-6 text-cyan-100">
                        {selectedOrder.admin_instructions}
                      </div>
                    </section>
                  )}
                </div>

                <div className="space-y-5">
                  <section>
                    <h3 className="mb-3 font-semibold text-white">Complaint Photos</h3>
                    {issuePhotos.length ? (
                      <div className="grid grid-cols-2 gap-2">
                        {issuePhotos.map((photo) => (
                          <a
                            key={photo.id || photo.image_url}
                            href={imageUrl(photo.image_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="overflow-hidden rounded-xl border border-white/10"
                          >
                            <img src={imageUrl(photo.image_url)} alt="Complaint evidence" className="h-28 w-full object-cover transition hover:scale-105" />
                            <p className="bg-black/40 px-2 py-1 text-[10px] text-slate-300">{photo.photo_type || 'Evidence'}</p>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-500">No complaint photos available.</p>
                    )}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-white">Repair Evidence</h3>
                      <span className="text-xs text-slate-500">
                        {issuePhotos.filter((photo) => photo.photo_type === 'resolution').length}/5
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {issuePhotos.filter((photo) => photo.photo_type === 'resolution').map((photo) => (
                        <a key={photo.id} href={imageUrl(photo.image_url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-white/10">
                          <img src={imageUrl(photo.image_url)} alt="Repair evidence" className="h-28 w-full object-cover" />
                          <p className="bg-black/40 px-2 py-1 text-[10px] text-emerald-300">Repair photo</p>
                        </a>
                      ))}
                    </div>

                    {selectedOrder.status === 'in_progress' && (
                      <div className="mt-3">
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto || issuePhotos.filter((photo) => photo.photo_type === 'resolution').length >= 5}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-cyan-400/5 px-3 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50"
                        >
                          {uploadingPhoto ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
                          {uploadingPhoto ? 'Uploading...' : 'Upload Repair Photo'}
                        </button>
                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadRepairPhoto} />
                        <p className="mt-2 text-xs text-slate-500">Upload up to 5 repair photos. Maximum 5 MB per image.</p>
                        {photoError && <p className="mt-2 text-xs text-rose-300">{photoError}</p>}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-3 font-semibold text-white">Work Order Timeline</h3>
                    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-300" />
                        <div>
                          <p className="text-sm text-white">Assigned</p>
                          <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(selectedOrder.assigned_at)}</p>
                        </div>
                      </div>
                      {selectedOrder.accepted_at && <div className="flex gap-3"><div className="mt-1 h-2 w-2 rounded-full bg-cyan-300" /><div><p className="text-sm text-white">Accepted</p><p className="mt-0.5 text-xs text-slate-500">{formatDateTime(selectedOrder.accepted_at)}</p></div></div>}
                      {selectedOrder.started_at && <div className="flex gap-3"><div className="mt-1 h-2 w-2 rounded-full bg-amber-300" /><div><p className="text-sm text-white">Work Started</p><p className="mt-0.5 text-xs text-slate-500">{formatDateTime(selectedOrder.started_at)}</p></div></div>}
                      {selectedOrder.completed_at && <div className="flex gap-3"><div className="mt-1 h-2 w-2 rounded-full bg-emerald-300" /><div><p className="text-sm text-white">Completed</p><p className="mt-0.5 text-xs text-slate-500">{formatDateTime(selectedOrder.completed_at)}</p></div></div>}
                    </div>
                  </section>

                  {selectedOrder.staff_notes && (
                    <section>
                      <h3 className="mb-2 font-semibold text-white">Your Completion Notes</h3>
                      <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100">{selectedOrder.staff_notes}</p>
                    </section>
                  )}
                </div>
              </div>

              {history.length > 0 && (
                <section className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="mb-3 font-semibold text-white">Complaint History</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {history.map((entry) => (
                      <div key={entry.id || entry.changed_at} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-sm font-medium text-white">{statusLabel(entry.new_status)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.changed_at)}</p>
                        {entry.notes && <p className="mt-2 text-sm text-slate-400">{entry.notes}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 bg-black/20 p-4 sm:px-6">
              {selectedOrder.status === 'assigned' && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                  >
                    Reject Assignment
                  </button>
                  <button
                    onClick={acceptOrder}
                    disabled={actionLoading}
                    className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {actionLoading ? 'Please wait...' : 'Accept Assignment'}
                  </button>
                </>
              )}

              {selectedOrder.status === 'accepted' && (
                <button onClick={startOrder} disabled={actionLoading} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50">
                  {actionLoading ? 'Please wait...' : 'Start Work'}
                </button>
              )}

              {selectedOrder.status === 'in_progress' && (
                <button onClick={() => setShowCompleteModal(true)} disabled={actionLoading} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50">
                  Mark as Completed
                </button>
              )}

              <button onClick={() => setSelectedOrder(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101827] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Reject Assignment</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="mt-2 text-sm text-slate-400">Provide a reason so the administrator can reassign this complaint.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Enter your reason..."
              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowRejectModal(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
              <button onClick={rejectOrder} disabled={actionLoading} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{actionLoading ? 'Submitting...' : 'Confirm Rejection'}</button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101827] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Complete Maintenance Work</h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="mt-2 text-sm text-slate-400">Describe the repair completed. The administrator will be notified for verification.</p>
            <textarea
              value={completionNotes}
              onChange={(event) => setCompletionNotes(event.target.value)}
              rows={5}
              maxLength={3000}
              placeholder="Explain what was repaired, replaced, or checked..."
              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCompleteModal(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
              <button onClick={completeOrder} disabled={actionLoading} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{actionLoading ? 'Submitting...' : 'Confirm Completion'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
