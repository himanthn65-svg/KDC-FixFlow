
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Users,
  Pencil,
  Upload,
  X,
  Zap,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import StaffManagement from './StaffManagement'
import Notifications from './Notifications'
import CampusInsights from './CampusInsights'

const STATUSES = [
  'reported',
  'reviewed',
  'assigned',
  'in_progress',
  'completed',
  'verified',
  'closed',
  'reopened',
]

const PRIORITIES = ['low', 'medium', 'high', 'critical']

const RESOLVED_STATUSES = ['verified', 'closed']

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024

const API_ORIGIN = (api.defaults.baseURL || 'http://localhost:8000/api/v1')
  .replace(/\/api\/v1\/?$/, '')

function imageUrl(path) {
  if (!path) return ''

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

function label(value = '') {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function formatDate(value) {
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

function statusStyle(status) {
  if (['verified', 'closed'].includes(status)) {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  }

  if (['assigned', 'in_progress'].includes(status)) {
    return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
  }

  if (status === 'reopened') {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-300'
  }

  if (status === 'completed') {
    return 'border-violet-400/20 bg-violet-400/10 text-violet-300'
  }

  return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
}

function priorityStyle(priority) {
  if (priority === 'critical') return 'text-rose-300'
  if (priority === 'high') return 'text-orange-300'
  if (priority === 'medium') return 'text-amber-300'
  return 'text-slate-400'
}

function StatCard({ title, value, description, icon: Icon, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-cyan-300/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div className={`rounded-xl border border-white/10 bg-white/[0.04] p-3 ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusStyle(status)}`}>
      {label(status)}
    </span>
  )
}

function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${priorityStyle(priority)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label(priority)}
    </span>
  )
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101827] shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-xl'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              KDC FixFlow Administration
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm leading-5 text-slate-400">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </motion.section>
    </motion.div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-5 py-14 text-center">
      <ClipboardList size={30} className="mx-auto text-slate-600" />
      <h3 className="mt-4 text-base font-semibold text-slate-300">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)

  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Admin profile
  const [profile, setProfile] = useState(null)
  const [profileModal, setProfileModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [photoSaving, setPhotoSaving] = useState(false)

  const uploadInputRef = useRef(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedIssue, setSelectedIssue] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [actionModal, setActionModal] = useState(null)
  const [actionNotes, setActionNotes] = useState('')
  const [actionPriority, setActionPriority] = useState('medium')
  const [actionSaving, setActionSaving] = useState(false)

  const [deleteReason, setDeleteReason] = useState('')
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [adminInstructions, setAdminInstructions] = useState('')
  const pageSize = 10

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 4000)
  }

    const loadIssues = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const response = await api.get('/admin/issues', {
        params: { skip: 0, limit: 100 },
      })

      setIssues(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to load complaints.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadStaff = useCallback(async () => {
    setStaffLoading(true)

    try {
      const response = await api.get('/admin/staff', {
        params: { skip: 0, limit: 100 },
      })

      const activeStaff = Array.isArray(response.data)
        ? response.data.filter(staff => staff.is_active)
        : []

      setStaffList(activeStaff)
    } catch (err) {
      showNotice(
        err.response?.data?.detail || 'Unable to load maintenance staff.',
        'error'
      )
      setStaffList([])
    } finally {
      setStaffLoading(false)
    }
  }, [])
  // Load the administrator profile
  const loadAdminProfile = useCallback(async () => {
    try {
      const response = await api.get('/users/admin-profile')
      setProfile(response.data)
    } catch (err) {
      showNotice(
        err.response?.data?.detail || 'Unable to load admin profile.',
        'error'
      )
    }
  }, [])

  // Open the profile editor
  const openProfile = () => {
    setEditName(profile?.full_name || user?.full_name || '')
    setEditBio(profile?.bio || '')
    setProfileModal(true)
    setSidebarOpen(false)
  }

  // Save administrator name and bio
  const saveProfile = async event => {
    event.preventDefault()

    if (editName.trim().length < 2) {
      showNotice('Name must contain at least 2 characters.', 'error')
      return
    }

    setProfileSaving(true)

    try {
      const response = await api.patch('/users/admin-profile', {
        full_name: editName.trim(),
        bio: editBio.trim(),
      })

      setProfile(response.data)
      setProfileModal(false)
      showNotice('Admin profile updated successfully.')
    } catch (err) {
      showNotice(
        err.response?.data?.detail || 'Unable to update admin profile.',
        'error'
      )
    } finally {
      setProfileSaving(false)
    }
  }

  // Upload administrator profile photo
  const uploadProfilePhoto = async file => {
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showNotice('Choose a JPG, PNG or WebP image.', 'error')
      return
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      showNotice('Profile photo must be 5 MB or smaller.', 'error')
      return
    }

    const formData = new FormData()
    formData.append('photo', file)

    setPhotoSaving(true)

    try {
      // Explicitly send multipart/form-data.
      // api.js has application/json as its default Content-Type.
      await api.post(
        '/users/admin-profile/photo',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      // Reload the profile after the upload so the latest saved
      // profile_photo path is used by the UI.
      const profileResponse = await api.get('/users/admin-profile')

      setProfile(profileResponse.data)

      showNotice('Admin profile photo updated successfully.')
    } catch (err) {
      showNotice(
        err.response?.data?.detail ||
        err.message ||
        'Unable to upload admin profile photo.',
        'error'
      )
    } finally {
      setPhotoSaving(false)
    }
  }

  // Handle selecting a photo from the device
  const handleProfilePhotoChange = event => {
    const file = event.target.files?.[0]

    // Reset the input so the same image can be selected again.
    event.target.value = ''

    uploadProfilePhoto(file)
  }

  useEffect(() => {
    loadIssues()
  }, [loadIssues])
    useEffect(() => {
    loadStaff()
  }, [loadStaff])
  useEffect(() => {
    loadAdminProfile()
  }, [loadAdminProfile])

  const categories = useMemo(() => {
    return [...new Set(issues.map(issue => issue.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  }, [issues])

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase()

    return issues.filter(issue => {
      const matchesSearch = !query || [
        issue.title,
        issue.description,
        issue.category,
        issue.location?.name,
        issue.location?.code,
        issue.reporter?.full_name,
        issue.reporter?.email,
        String(issue.id),
      ].some(value => String(value || '').toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'all' || issue.status === statusFilter

      const matchesPriority =
        priorityFilter === 'all' || issue.priority === priorityFilter

      const matchesCategory =
        categoryFilter === 'all' || issue.category === categoryFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory
    })
  }, [issues, search, statusFilter, priorityFilter, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize))

  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, priorityFilter, categoryFilter])

  const statistics = useMemo(() => {
    return {
      total: issues.length,
      reported: issues.filter(issue => issue.status === 'reported').length,
      active: issues.filter(issue =>
        ['assigned', 'in_progress'].includes(issue.status)
      ).length,
      completed: issues.filter(issue =>
        ['completed', 'verified', 'closed'].includes(issue.status)
      ).length,
      critical: issues.filter(issue => issue.priority === 'critical').length,
      safety: issues.filter(issue => issue.is_safety_concern).length,
    }
  }, [issues])

  const openIssue = async issue => {
    setDetailLoading(true)
    setSelectedIssue(issue)

    try {
      const response = await api.get(`/admin/issues/${issue.id}`)
      setSelectedIssue(response.data)
    } catch (err) {
      showNotice(
        err.response?.data?.detail || 'Could not load complaint details.',
        'error'
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const closeIssue = () => {
    setSelectedIssue(null)
    setActionModal(null)
    setActionNotes('')
    setDeleteReason('')
  }

    const openAction = (type, issue) => {
    setActionNotes('')
    setDeleteReason('')
    setActionPriority(issue?.priority || 'medium')
    setSelectedStaffId('')
    setAdminInstructions('')
    setActionModal({ type, issue })
  }

    const submitAction = async event => {
    event.preventDefault()

    if (!actionModal || actionSaving) return

    const { type, issue } = actionModal

    if (type === 'verify' && actionNotes.trim().length < 5) {
      showNotice('Verification notes must contain at least 5 characters.', 'error')
      return
    }

    if (type === 'delete' && deleteReason.trim().length < 10) {
      showNotice('Deletion reason must contain at least 10 characters.', 'error')
      return
    }

    if (type === 'assign' && !selectedStaffId) {
      showNotice('Please select a maintenance staff member.', 'error')
      return
    }

    setActionSaving(true)

    try {
      if (type === 'review') {
        await api.post(`/admin/issues/${issue.id}/review`, {
          notes: actionNotes.trim() || null,
        })
        showNotice('Complaint reviewed successfully.')
      }

      if (type === 'assign') {
        await api.post(
          `/admin/work-orders/assign?issue_id=${issue.id}`,
          {
            assigned_to: Number(selectedStaffId),
            admin_instructions: adminInstructions.trim() || null,
          }
        )
        showNotice('Complaint assigned to maintenance staff successfully.')
      }

      if (type === 'priority') {
        await api.patch(`/admin/issues/${issue.id}/priority`, {
          priority: actionPriority,
          notes: actionNotes.trim() || null,
        })
        showNotice('Complaint priority updated.')
      }

      if (type === 'verify') {
        await api.post(`/admin/issues/${issue.id}/verify`, {
          notes: actionNotes.trim(),
        })
        showNotice('Repair verified successfully.')
      }

      if (type === 'delete') {
        await api.delete(`/admin/issues/${issue.id}/permanent`, {
          data: { reason: deleteReason.trim() },
        })
        showNotice('Complaint permanently deleted.')
        closeIssue()
      } else {
        setActionModal(null)
        setActionNotes('')
        setSelectedStaffId('')
        setAdminInstructions('')

        await loadIssues(true)

        if (selectedIssue?.id === issue.id) {
          const response = await api.get(`/admin/issues/${issue.id}`)
          setSelectedIssue(response.data)
        }
      }
    } catch (err) {
      showNotice(
        err.response?.data?.detail ||
        'The requested action could not be completed.',
        'error'
      )
    } finally {
      setActionSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navigation = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'complaints', label: 'Complaints', icon: ClipboardList },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'insights', label: 'Campus Insights', icon: ChartNoAxesCombined },
  ]

    const getActionButtons = issue => {
    return (
      <div className="flex flex-wrap gap-2">
        {['reported', 'reopened'].includes(issue.status) && (
          <button
            type="button"
            onClick={() => openAction('review', issue)}
            className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            <Check size={13} className="mr-1 inline" />
            Review
          </button>
        )}

        {issue.status === 'reviewed' && (
          <button
            type="button"
            onClick={() => openAction('assign', issue)}
            className="rounded-lg border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-400/20"
          >
            <Check size={13} className="mr-1 inline" />
            Assign Staff
          </button>
        )}

        <button
          type="button"
          onClick={() => openAction('priority', issue)}
          className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
        >
          <Zap size={13} className="mr-1 inline" />
          Priority
        </button>

        {issue.status === 'completed' && (
          <button
            type="button"
            onClick={() => openAction('verify', issue)}
            className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
          >
            <ShieldCheck size={13} className="mr-1 inline" />
            Verify
          </button>
        )}

        <button
          type="button"
          onClick={() => openAction('delete', issue)}
          className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/20"
        >
          <Trash2 size={13} className="mr-1 inline" />
          Delete
        </button>
      </div>
    )
  }

  const renderIssueTable = compact => (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] p-4 sm:p-5">
        <div>
          <h2 className="text-base font-bold text-white">
            {compact ? 'Recent complaints' : 'Complaint management'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {compact
              ? 'Latest complaints received by the system'
              : `${filteredIssues.length} matching complaint(s) in the latest loaded records`}
          </p>
        </div>

        {!compact && (
          <button
            type="button"
            onClick={() => loadIssues(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {!compact && (
        <div className="grid gap-3 border-b border-white/[0.08] p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search complaints..."
              className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </div>

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#111c2d] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="all">All statuses</option>
            {STATUSES.map(status => (
              <option key={status} value={status}>{label(status)}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#111c2d] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map(priority => (
              <option key={priority} value={priority}>{label(priority)}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#111c2d] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="all">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-base text-slate-400">
          <RefreshCw size={17} className="animate-spin text-cyan-300" />
          Loading complaints...
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <AlertCircle size={25} className="mx-auto text-rose-300" />
          <p className="mt-3 text-base text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => loadIssues()}
            className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      ) : (compact ? issues.slice(0, 5) : paginatedIssues).length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="No complaints found"
            description="New complaints will appear here when students submit them."
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-semibold">Complaint</th>
                  <th className="px-4 py-4 font-semibold">Location</th>
                  <th className="px-4 py-4 font-semibold">Priority</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Reported</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {(compact ? issues.slice(0, 5) : paginatedIssues).map(issue => (
                  <tr
                    key={issue.id}
                    className="border-b border-white/[0.05] transition hover:bg-white/[0.025]"
                  >
                    <td className="max-w-[280px] px-5 py-4">
                      <p className="truncate text-sm font-semibold text-slate-200">
                        {issue.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        #{issue.id} · {issue.category}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-300">
                        {issue.location?.name || 'Unknown location'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {issue.location?.code || '—'}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <PriorityBadge priority={issue.priority} />
                      {issue.is_safety_concern && (
                        <p className="mt-1 text-xs font-semibold text-rose-300">
                          Safety concern
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={issue.status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                      {formatDate(issue.created_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openIssue(issue)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-300"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!compact && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-4">
              <p className="text-sm text-slate-500">
                Showing {filteredIssues.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                {' '}– {Math.min(currentPage * pageSize, filteredIssues.length)}
                {' '}of {filteredIssues.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(page => page - 1)}
                  className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="text-sm text-slate-400">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(page => page + 1)}
                  className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="admin-dashboard min-h-screen bg-[#080f1c] text-slate-200">
      <style>{`
        .admin-dashboard .text-xs {
          font-size: 0.8125rem;
          line-height: 1.25rem;
        }

        .admin-dashboard [class~="text-[9px]"],
        .admin-dashboard [class~="text-[10px]"],
        .admin-dashboard [class~="text-[11px]"] {
          font-size: 0.75rem;
          line-height: 1.15rem;
        }

        .admin-sidebar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
        }

        .admin-sidebar::-webkit-scrollbar {
          width: 6px;
        }

        .admin-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .admin-sidebar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 999px;
        }

        .admin-sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/[0.08] blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.06] blur-[130px]" />
      </div>

      <div className="relative flex min-h-screen">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}

        <aside
          className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r border-white/[0.08] bg-[#0c1625] transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Branding */}
          <div className="shrink-0 border-b border-white/[0.08] px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
                <ShieldCheck size={21} />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wide text-white">
                  KDC FixFlow
                </h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Administration
                </p>
              </div>
            </div>
          </div>

          {/* Admin Profile */}
          <button
            type="button"
            onClick={openProfile}
            className="mx-4 mt-4 mb-2 w-[calc(100%-2rem)] shrink-0 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3 text-left transition hover:bg-cyan-300/[0.10]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-400/15 text-sm font-bold text-cyan-300">
                {profile?.profile_photo ? (
                  <img
                    src={imageUrl(profile.profile_photo)}
                    alt="Admin profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile?.full_name || user?.full_name || 'Admin')
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(part => part[0])
                    .join('')
                    .toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {profile?.full_name || user?.full_name || 'Administrator'}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  System Administrator
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  View and edit profile
                </p>
              </div>

              <Pencil size={15} className="shrink-0 text-cyan-300" />
            </div>
          </button>

          {/* Navigation */}
          <div className="shrink-0 px-4 py-4">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Control center
            </p>

            <nav className="space-y-1">
              {navigation.map(item => {
                const Icon = item.icon
                const active = activeTab === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                      active
                        ? 'border border-cyan-300/15 bg-cyan-300/[0.09] text-cyan-200'
                        : 'border border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}

                    {item.id === 'complaints' && issues.length > 0 && (
                      <span className="ml-auto rounded-md bg-white/[0.07] px-2 py-1 text-xs font-semibold text-slate-300">
                        {issues.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Sign Out */}
          <div className="mt-auto shrink-0 border-t border-white/[0.08] p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-300"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-[#080f1c]/85 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-9">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  KDC FixFlow / Administration
                </p>
                <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
                  {activeTab === 'overview'
                    ? 'Command Center'
                    : navigation.find(item => item.id === activeTab)?.label || 'Administration'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">
                  Admin session
                </span>
              </div>

              <button
                type="button"
                onClick={() => loadIssues(true)}
                disabled={refreshing}
                className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-cyan-300 disabled:opacity-50"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-9">
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  notice.type === 'error'
                    ? 'border-rose-400/20 bg-rose-400/10 text-rose-300'
                    : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                }`}
              >
                {notice.type === 'error'
                  ? <AlertCircle size={16} />
                  : <CheckCircle2 size={16} />}
                {notice.message}
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="ml-auto"
                >
                  <X size={15} />
                </button>
              </motion.div>
            )}

            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                      Administrator workspace
                    </p>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Good to see you, {user?.full_name?.split(' ')[0] || 'Admin'}
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                      Monitor campus complaints, review reports, manage priorities
                      and verify completed maintenance work.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('complaints')}
                    className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    <ClipboardList size={15} className="mr-2 inline" />
                    Manage complaints
                  </button>
                </div>

                <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard
                    title="Loaded complaints"
                    value={statistics.total}
                    description="Latest records returned by the API"
                    icon={ClipboardList}
                    accent="text-cyan-300"
                  />
                  <StatCard
                    title="Awaiting review"
                    value={statistics.reported}
                    description="Reported complaints"
                    icon={Clock3}
                    accent="text-amber-300"
                  />
                  <StatCard
                    title="Active maintenance"
                    value={statistics.active}
                    description="Assigned or in progress"
                    icon={Activity}
                    accent="text-blue-300"
                  />
                  <StatCard
                    title="Completed / resolved"
                    value={statistics.completed}
                    description="Completed, verified or closed"
                    icon={CheckCircle2}
                    accent="text-emerald-300"
                  />
                  <StatCard
                    title="Critical priority"
                    value={statistics.critical}
                    description="Critical-priority complaints"
                    icon={AlertTriangle}
                    accent="text-rose-300"
                  />
                  <StatCard
                    title="Safety concerns"
                    value={statistics.safety}
                    description="Reports marked as safety concerns"
                    icon={ShieldAlert}
                    accent="text-orange-300"
                  />
                </div>

                <div className="mb-7 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                  <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          Administration overview
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Current complaint workload
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {[
                        { title: 'Reported', value: statistics.reported, color: 'bg-amber-400' },
                        { title: 'Active', value: statistics.active, color: 'bg-cyan-400' },
                        { title: 'Completed / resolved', value: statistics.completed, color: 'bg-emerald-400' },
                      ].map(item => {
                        const percentage = statistics.total
                          ? (item.value / statistics.total) * 100
                          : 0

                        return (
                          <div key={item.title}>
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="text-slate-400">{item.title}</span>
                              <span className="font-semibold text-white">{item.value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.7 }}
                                className={`h-full rounded-full ${item.color}`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-cyan-400/[0.08] to-blue-500/[0.03] p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={21} className="text-cyan-300" />
                      <h2 className="text-base font-bold text-white">
                        Admin responsibilities
                      </h2>
                    </div>

                    <div className="mt-5 space-y-4">
                      {[
                        ['Review', 'Examine newly reported campus issues.'],
                        ['Prioritize', 'Set the urgency of each complaint.'],
                        ['Verify', 'Check repair evidence before verification.'],
                        ['Audit', 'Keep administrative actions accountable.'],
                      ].map(([title, description], index) => (
                        <div key={title} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-xs font-bold text-cyan-300">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {renderIssueTable(true)}
              </motion.div>
            )}

            {activeTab === 'complaints' && (
              <motion.div
                key="complaints"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                    Issue lifecycle control
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    Complaint Management
                  </h1>
                  <p className="mt-2 text-sm text-slate-400">
                    Review reports, update urgency, inspect repair evidence and
                    verify completed work.
                  </p>
                </div>

                {renderIssueTable(false)}
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <StaffManagement />
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Notifications />
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CampusInsights />
              </motion.div>
            )}

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] py-5 text-xs text-slate-500">
              <span>KDC FixFlow · Administrator Control Center</span>
              <span>Secure administration workspace</span>
            </footer>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selectedIssue && (
          <Modal
            title={`Complaint #${selectedIssue.id}`}
            subtitle="Complete complaint information and administrative actions"
            onClose={closeIssue}
            wide
          >
            {detailLoading ? (
              <div className="py-12 text-center text-base text-slate-400">
                <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-cyan-300" />
                Loading complaint details...
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedIssue.status} />
                    <PriorityBadge priority={selectedIssue.priority} />
                    {selectedIssue.is_safety_concern && (
                      <span className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                        Safety concern
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-white">
                    {selectedIssue.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedIssue.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Category', selectedIssue.category],
                    ['Severity', label(selectedIssue.severity)],
                    ['Location', selectedIssue.location?.name],
                    ['Location code', selectedIssue.location?.code],
                    ['Affected students', selectedIssue.affected_count],
                    ['Recurring issue', selectedIssue.is_recurring ? 'Yes' : 'No'],
                    ['Reported at', formatDate(selectedIssue.created_at)],
                    ['Last updated', formatDate(selectedIssue.updated_at)],
                  ].map(([title, value]) => (
                    <div key={title} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <p className="text-xs text-slate-500">{title}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-200">
                        {value ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>

                <section className="rounded-xl border border-white/[0.07] p-4">
                  <h4 className="text-sm font-bold text-white">Reported by</h4>
                  <p className="mt-3 text-base font-semibold text-slate-200">
                    {selectedIssue.reporter?.full_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedIssue.reporter?.email}
                  </p>
                </section>

                <section>
                  <h4 className="mb-3 text-sm font-bold text-white">
                    Complaint photographs
                  </h4>

                  {selectedIssue.photos?.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {selectedIssue.photos.map(photo => (
                        <a
                          key={photo.id}
                          href={imageUrl(photo.image_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                        >
                          <img
                            src={imageUrl(photo.image_url)}
                            alt="Complaint evidence"
                            className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <p className="px-3 py-2 text-xs text-slate-400">
                            {label(photo.photo_type)} · {formatDate(photo.created_at)}
                          </p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">
                      No photographs attached.
                    </p>
                  )}
                </section>

                <section className="border-t border-white/10 pt-5">
                  <h4 className="mb-3 text-sm font-bold text-white">
                    Administrative actions
                  </h4>
                  {getActionButtons(selectedIssue)}
                </section>
              </div>
            )}
          </Modal>
        )}

       
        {actionModal && (
          <Modal
            title={
              actionModal.type === 'review'
                ? 'Review complaint'
                : actionModal.type === 'assign'
                  ? 'Assign maintenance staff'
                  : actionModal.type === 'priority'
                    ? 'Update complaint priority'
                    : actionModal.type === 'verify'
                      ? 'Verify completed repair'
                      : 'Permanently delete complaint'
            }
            subtitle={`Complaint #${actionModal.issue.id} · ${actionModal.issue.title}`}
            onClose={() => !actionSaving && setActionModal(null)}
          >
            <form onSubmit={submitAction} className="space-y-5">

              {actionModal.type === 'assign' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Select maintenance staff
                    </label>

                    <select
                      required
                      value={selectedStaffId}
                      onChange={event => setSelectedStaffId(event.target.value)}
                      disabled={staffLoading || staffList.length === 0}
                      className="w-full rounded-xl border border-white/10 bg-[#0b1422] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/40"
                    >
                      <option value="">
                        {staffLoading
                          ? 'Loading staff...'
                          : staffList.length === 0
                            ? 'No active maintenance staff available'
                            : 'Choose maintenance staff'}
                      </option>

                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name} ({staff.employee_id || staff.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Work instructions (optional)
                    </label>

                    <textarea
                      maxLength={3000}
                      rows={4}
                      value={adminInstructions}
                      onChange={event => setAdminInstructions(event.target.value)}
                      placeholder="Describe the repair work or instructions for the maintenance staff..."
                      className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-400/40"
                    />
                  </div>
                </>
              )}

              {actionModal.type === 'priority' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    New priority
                  </label>
                  <select
                    value={actionPriority}
                    onChange={event => setActionPriority(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1422] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority} value={priority}>
                        {label(priority)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actionModal.type === 'delete' ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Reason for permanent deletion
                  </label>
                  <textarea
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={4}
                    value={deleteReason}
                    onChange={event => setDeleteReason(event.target.value)}
                    placeholder="Explain why this complaint must be permanently deleted..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-rose-400/40"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Minimum 10 characters. This action cannot be undone.
                  </p>
                </div>
              ) : actionModal.type !== 'assign' ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    {actionModal.type === 'verify'
                      ? 'Verification notes (required)'
                      : 'Administrative notes (optional)'}
                  </label>
                  <textarea
                    required={actionModal.type === 'verify'}
                    minLength={actionModal.type === 'verify' ? 5 : undefined}
                    maxLength={1000}
                    rows={4}
                    value={actionNotes}
                    onChange={event => setActionNotes(event.target.value)}
                    placeholder={
                      actionModal.type === 'verify'
                        ? 'Describe what you checked before verifying the repair...'
                        : 'Add notes for the administrative record...'
                    }
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                  />
                  {actionModal.type === 'verify' && (
                    <p className="mt-2 text-xs text-slate-400">
                      Minimum 5 characters. Repair evidence must exist before verification.
                    </p>
                  )}
                </div>
              ) : null}

              {actionModal.type === 'delete' && (
                <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-sm leading-5 text-rose-300">
                  This permanently deletes the complaint and its associated records
                  and photographs. The action is audit-logged.
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled={actionSaving}
                  onClick={() => setActionModal(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    actionSaving ||
                    (actionModal.type === 'assign' &&
                      (staffLoading || staffList.length === 0))
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold text-slate-950 transition disabled:opacity-50 ${
                    actionModal.type === 'delete'
                      ? 'bg-rose-400 hover:bg-rose-300'
                      : 'bg-cyan-400 hover:bg-cyan-300'
                  }`}
                >
                  {actionSaving ? 'Processing...' : (
                    actionModal.type === 'delete'
                      ? 'Permanently delete'
                      : actionModal.type === 'verify'
                        ? 'Verify repair'
                        : actionModal.type === 'review'
                          ? 'Confirm review'
                          : actionModal.type === 'assign'
                            ? 'Assign work'
                            : 'Save priority'
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}


        {/* Admin Profile Modal */}
        {profileModal && (
          <Modal
            title="Admin Profile"
            subtitle="Manage your administrator information"
            onClose={() => !profileSaving && !photoSaving && setProfileModal(false)}
          >
            <div className="space-y-5">
              {/* Profile photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-400/30 bg-cyan-400/10 text-3xl font-bold text-cyan-300">
                  {profile?.profile_photo ? (
                    <img
                      src={imageUrl(profile.profile_photo)}
                      alt="Admin profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (profile?.full_name || 'Admin')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map(part => part[0])
                      .join('')
                      .toUpperCase()
                  )}
                </div>

                <p className="text-sm font-semibold text-white">
                  {profile?.full_name || 'Administrator'}
                </p>

                <p className="text-xs text-slate-400">
                  {photoSaving
                    ? 'Uploading photo...'
                    : 'JPG, PNG or WebP · Maximum 5 MB'}
                </p>

                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={photoSaving}
                  className="flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={16} />
                  {photoSaving ? 'Uploading...' : 'Upload Photo'}
                </button>

                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProfilePhotoChange}
                  disabled={photoSaving}
                  className="hidden"
                />
              </div>

              {/* Edit profile */}
              <form onSubmit={saveProfile} className="space-y-4 border-t border-white/10 pt-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={150}
                    value={editName}
                    onChange={event => setEditName(event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={editBio}
                    onChange={event => setEditBio(event.target.value)}
                    placeholder="Write something about yourself..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {editBio.length}/500
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setProfileModal(false)}
                    disabled={profileSaving || photoSaving}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={profileSaving || photoSaving}
                    className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
