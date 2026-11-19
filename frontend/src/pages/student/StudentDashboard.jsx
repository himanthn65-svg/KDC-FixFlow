import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { motion, AnimatePresence } from 'framer-motion'

import {

  Activity, LayoutDashboard, ClipboardList, Bell, LogOut, RefreshCw,

  Clock3, CheckCircle2, AlertCircle, MapPin, ShieldAlert, Sparkles,

  GraduationCap, UserRound, Camera, Upload, Pencil, X, Plus,

  ImagePlus, Trash2, Eye, Check, RotateCcw, CalendarDays, ChevronRight,

  LoaderCircle, FileText, AlertTriangle, CheckCheck

} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'

import api from '../../services/api'



const ACTIVE_STATUSES = ['reported', 'reviewed', 'assigned', 'in_progress', 'reopened']

const RESOLVED_STATUSES = ['completed', 'verified', 'closed']

const SEVERITIES = ['low', 'medium', 'high', 'critical']

const MAX_PHOTOS = 5

const MAX_FILE_SIZE = 5 * 1024 * 1024



const API_ORIGIN = (api.defaults.baseURL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')


function imageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}



function formatDate(value) {

  if (!value) return 'Date unavailable'

  const date = new Date(value)

  return Number.isNaN(date.getTime())

    ? 'Date unavailable'

    : date.toLocaleString('en-IN', {

        day: '2-digit', month: 'short', year: 'numeric',

        hour: '2-digit', minute: '2-digit'

      })

}



function statusLabel(status = '') {

  return status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

}



function statusStyle(status) {

  if (RESOLVED_STATUSES.includes(status)) return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'

  if (['in_progress', 'assigned'].includes(status)) return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'

  if (status === 'reopened') return 'border-rose-400/20 bg-rose-400/10 text-rose-300'

  return 'border-amber-400/20 bg-amber-400/10 text-amber-300'

}



function priorityStyle(priority) {

  if (priority === 'critical' || priority === 'high') return 'text-rose-300'

  if (priority === 'medium') return 'text-amber-300'

  return 'text-slate-400'

}



function initials(name = 'Student') {

  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

}



function StatCard({ title, value, detail, icon: Icon, accent, delay }) {

  return (

    <motion.div

      initial={{ opacity: 0, y: 18 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.4, delay }}

      className="glass-card rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/20 sm:p-6"

    >

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-slate-400">{title}</p>

          <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>

          <p className="mt-2 text-xs text-slate-500">{detail}</p>

        </div>

        <div className={`rounded-xl border border-white/10 p-3 ${accent}`}>

          <Icon size={21} />

        </div>

      </div>

    </motion.div>

  )

}



function Modal({ title, subtitle, onClose, children, wide = false }) {

  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-md sm:p-6">

      <motion.div

        initial={{ opacity: 0, y: 20, scale: 0.98 }}

        animate={{ opacity: 1, y: 0, scale: 1 }}

        className={`my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-3xl border border-white/10 bg-[#0b1425]/95 p-5 shadow-2xl shadow-cyan-950/30 sm:p-7`}

      >

        <div className="mb-6 flex items-start justify-between gap-4">

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">KDC FixFlow</p>

            <h2 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">{title}</h2>

            {subtitle && <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>}

          </div>

          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Close">

            <X size={18} />

          </button>

        </div>

        {children}

      </motion.div>

    </div>

  )

}



export default function StudentDashboard() {

  const { user, logout } = useAuth()

  const navigate = useNavigate()



  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)

  const [complaints, setComplaints] = useState([])

  const [notifications, setNotifications] = useState([])

    const [unreadCount, setUnreadCount] = useState(0)

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')

  const [notice, setNotice] = useState(null)



  const [profileModal, setProfileModal] = useState(false)

  const [editName, setEditName] = useState('')

  const [editBio, setEditBio] = useState('')

  const [profileSaving, setProfileSaving] = useState(false)

  const [photoSaving, setPhotoSaving] = useState(false)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)



  const [complaintModal, setComplaintModal] = useState(false)

  const [complaintSaving, setComplaintSaving] = useState(false)

  const [form, setForm] = useState({

    title: '', description: '', category: '', location_name: '',

    severity: 'medium', is_safety_concern: false

  })

  const [evidence, setEvidence] = useState([])



  const [selectedComplaint, setSelectedComplaint] = useState(null)

  const [complaintHistory, setComplaintHistory] = useState([])

  const [detailLoading, setDetailLoading] = useState(false)

  const [reopenReason, setReopenReason] = useState('')

  const [actionSaving, setActionSaving] = useState(false)

  const [selectedNotification, setSelectedNotification] = useState(null)



  const showNotice = (message, type = 'success') => {

    setNotice({ message, type })

    window.setTimeout(() => setNotice(null), 4500)

  }



  const loadDashboard = useCallback(async (isRefresh = false) => {

    if (isRefresh) setRefreshing(true)

    else setLoading(true)



    setError('')



    const results = await Promise.allSettled([

      api.get('/users/student-profile'),

      api.get('/complaints', { params: { skip: 0, limit: 100 } }),

      api.get('/notifications', { params: { skip: 0, limit: 100 } }),

      api.get('/notifications/unread-count')

    ])



    const [profileResult, complaintsResult, notificationsResult, unreadResult] = results



    if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data)



    if (complaintsResult.status === 'fulfilled') {

      setComplaints(Array.isArray(complaintsResult.value.data) ? complaintsResult.value.data : [])

    } else {

      setError(complaintsResult.reason?.response?.data?.detail || 'Unable to load your complaints.')

    }



    if (notificationsResult.status === 'fulfilled') {

      setNotifications(Array.isArray(notificationsResult.value.data) ? notificationsResult.value.data : [])

    }



    if (unreadResult.status === 'fulfilled') {

      setUnreadCount(unreadResult.value.data?.unread_count || 0)

    }



    setLoading(false)

    setRefreshing(false)

  }, [])



  useEffect(() => {

    loadDashboard()

  }, [loadDashboard])



  useEffect(() => {

    if (profile) {

      setEditName(profile.full_name || '')

      setEditBio(profile.bio || '')

    }

  }, [profile])



  useEffect(() => {

    return () => evidence.forEach(item => URL.revokeObjectURL(item.preview))

  }, [evidence])


  useEffect(() => {
    if (!cameraOpen) return undefined

    let cancelled = false
    setCameraLoading(true)
    setCameraError('')

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not supported by this browser. Use HTTPS or localhost.')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        if (!cancelled) setCameraError(err.message || 'Unable to access the camera. Check browser permissions.')
      } finally {
        if (!cancelled) setCameraLoading(false)
      }
    }

    startCamera()
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [cameraOpen])

  function closeCamera() {
    setCameraOpen(false)
    setCameraLoading(false)
  }

  function captureEvidencePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet. Please wait a moment.')
      return
    }
    if (evidence.length >= MAX_PHOTOS) {
      showNotice(`You can attach up to ${MAX_PHOTOS} photos.`, 'error')
      closeCamera()
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) {
        setCameraError('Unable to capture this photo. Please try again.')
        return
      }
      const file = new File([blob], `campus-evidence-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setEvidence(current => {
        if (current.length >= MAX_PHOTOS) {
          showNotice(`You can attach up to ${MAX_PHOTOS} photos.`, 'error')
          return current
        }
        return [...current, { file, preview: URL.createObjectURL(file) }]
      })
      closeCamera()
      showNotice('Photo captured and added to evidence.')
    }, 'image/jpeg', 0.9)
  }



  const stats = useMemo(() => ({

    total: complaints.length,

    active: complaints.filter(item => ACTIVE_STATUSES.includes(item.status)).length,

    resolved: complaints.filter(item => RESOLVED_STATUSES.includes(item.status)).length

  }), [complaints])



  const displayName = profile?.full_name || user?.full_name || 'Student'

  const firstName = displayName.trim().split(/\s+/)[0]



  function handleLogout() {

    logout()

    navigate('/', { replace: true })

  }



  function openProfileEditor() {

    setEditName(profile?.full_name || '')

    setEditBio(profile?.bio || '')

    setProfileModal(true)

  }



  async function saveProfile(event) {

    event.preventDefault()

    setProfileSaving(true)

    try {

      const response = await api.patch('/users/student-profile', {

        full_name: editName.trim(),

        bio: editBio.trim()

      })

      setProfile(response.data)

      setProfileModal(false)

      showNotice('Your profile has been updated.')

    } catch (err) {

      showNotice(err.response?.data?.detail || 'Unable to update your profile.', 'error')

    } finally {

      setProfileSaving(false)

    }

  }



  async function uploadProfilePhoto(file) {

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {

      showNotice('Choose a JPG, PNG or WebP image.', 'error')

      return

    }

    if (file.size > MAX_FILE_SIZE) {

      showNotice('Profile photo must be 5 MB or smaller.', 'error')

      return

    }



    const data = new FormData()

    data.append('photo', file)

    setPhotoSaving(true)

    try {

      await api.post('/users/student-profile/photo', data, {

        headers: { 'Content-Type': 'multipart/form-data' }

      })

      const response = await api.get('/users/student-profile')

      setProfile(response.data)

      showNotice('Profile photo updated.')

    } catch (err) {

      showNotice(err.response?.data?.detail || 'Unable to upload profile photo.', 'error')

    } finally {

      setPhotoSaving(false)

    }

  }



  function addEvidence(event) {

    const incoming = Array.from(event.target.files || [])

    event.target.value = ''



    if (!incoming.length) return



    const valid = []

    for (const file of incoming) {

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {

        showNotice(`${file.name}: use JPG, PNG or WebP.`, 'error')

        continue

      }

      if (file.size > MAX_FILE_SIZE) {

        showNotice(`${file.name}: image must be 5 MB or smaller.`, 'error')

        continue

      }

      valid.push(file)

    }



    setEvidence(current => {

      const remaining = MAX_PHOTOS - current.length

      if (valid.length > remaining) {

        showNotice(`You can attach up to ${MAX_PHOTOS} photos.`, 'error')

      }

      return [

        ...current,

        ...valid.slice(0, remaining).map(file => ({

          file,

          preview: URL.createObjectURL(file)

        }))

      ]

    })

  }



  function removeEvidence(index) {

    setEvidence(current => {

      const item = current[index]

      if (item) URL.revokeObjectURL(item.preview)

      return current.filter((_, i) => i !== index)

    })

  }



  async function submitComplaint(event) {

    event.preventDefault()



    if (!form.location_name.trim()) {

      showNotice('Please enter the campus location.', 'error')

      return

    }



    setComplaintSaving(true)

    let createdIssue = null



    try {

      const response = await api.post('/complaints', {

        ...form,

        location_name: form.location_name.trim(),

        severity: form.severity

      })

      createdIssue = response.data



      let uploaded = 0

      for (const item of evidence) {

        const data = new FormData()

        data.append('photo', item.file)

        await api.post(`/complaints/${createdIssue.id}/photos`, data, {

          headers: { 'Content-Type': 'multipart/form-data' }

        })

        uploaded += 1

      }



      setComplaintModal(false)

      setForm({

        title: '', description: '', category: '', location_name: '',

        severity: 'medium', is_safety_concern: false

      })

      setEvidence([])

      await loadDashboard(true)

      showNotice(`Complaint #${createdIssue.id} submitted${uploaded ? ` with ${uploaded} photo(s)` : ''}.`)

    } catch (err) {

      if (createdIssue) {

        await loadDashboard(true)

        showNotice(

          `Complaint #${createdIssue.id} was created, but photo upload failed: ${err.response?.data?.detail || err.message}. Open the complaint to check its attachments.`,

          'error'

        )

        setComplaintModal(false)

      } else {

        showNotice(err.response?.data?.detail || 'Unable to submit your complaint.', 'error')

      }

    } finally {

      setComplaintSaving(false)

    }

  }



  async function openComplaint(issueId) {

    setSelectedNotification(null)

    setSelectedComplaint(null)

    setComplaintHistory([])

    setReopenReason('')

    setDetailLoading(true)



    try {

      const [detail, history] = await Promise.all([

        api.get(`/complaints/${issueId}`),

        api.get(`/complaints/${issueId}/history`)

      ])

      setSelectedComplaint(detail.data)

      setComplaintHistory(Array.isArray(history.data) ? history.data : [])

    } catch (err) {

      showNotice(err.response?.data?.detail || 'Unable to load complaint details.', 'error')

    } finally {

      setDetailLoading(false)

    }

  }



  async function handleNotificationClick(notification) {
    try {
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification.id}/read`)
        setNotifications(current => current.map(item =>
          item.id === notification.id ? { ...item, is_read: true } : item
        ))
        setUnreadCount(current => Math.max(0, current - 1))
      }
      setSelectedNotification({ ...notification, is_read: true })
    } catch (err) {
      showNotice(err.response?.data?.detail || 'Unable to open notification.', 'error')
    }
  }


  async function markAllRead() {

    try {

      await api.patch('/notifications/read-all')

      setNotifications(current => current.map(item => ({ ...item, is_read: true })))

      setUnreadCount(0)

      showNotice('All notifications marked as read.')

    } catch (err) {

      showNotice(err.response?.data?.detail || 'Unable to update notifications.', 'error')

    }

  }



  async function complaintAction(action) {

    if (!selectedComplaint) return

    setActionSaving(true)

    try {

      let response

      if (action === 'resolve') {

        response = await api.post(`/complaints/${selectedComplaint.id}/confirm-resolved`)

      } else {

        if (reopenReason.trim().length < 10) {

          showNotice('Please explain the unresolved issue in at least 10 characters.', 'error')

          setActionSaving(false)

          return

        }

        response = await api.post(`/complaints/${selectedComplaint.id}/reopen`, {

          reason: reopenReason.trim()

        })

      }



      setSelectedComplaint(response.data)

      await loadDashboard(true)

      const history = await api.get(`/complaints/${selectedComplaint.id}/history`)

      setComplaintHistory(history.data || [])

      setReopenReason('')

      showNotice(action === 'resolve'

        ? 'You confirmed that this complaint is resolved.'

        : 'Your reopening request has been submitted.')

    } catch (err) {

      showNotice(err.response?.data?.detail || 'Unable to complete this action.', 'error')

    } finally {

      setActionSaving(false)

    }

  }



  return (

    <main className="liquid-page relative min-h-screen overflow-hidden text-slate-100">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="ambient-orb orb-cyan absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[110px]" />

        <div className="ambient-orb orb-violet absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="ambient-orb orb-blue absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-500/10 blur-[110px]" />

      </div>



      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px]">

        <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-slate-950/25 px-5 py-7 backdrop-blur-xl lg:flex lg:flex-col">

          <a href="/" className="flex items-center gap-3 px-2">

            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-200"><Activity size={22} /></div>

            <div>

              <p className="font-display text-lg font-bold tracking-wide text-white">KDC <span className="text-cyan-300">FixFlow</span></p>

              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Student portal</p>

            </div>

          </a>



          <div className="mt-12 flex flex-1 flex-col">
            <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Student workspace</p>
            <nav className="space-y-2">
              {[
                { id: 'profile', label: 'Profile', icon: UserRound },
                { id: 'complaints', label: 'My Complaints', icon: ClipboardList },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'help', label: 'Help & Support', icon: Sparkles },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${activeTab === id ? 'border-cyan-300/20 bg-cyan-300/[0.09] text-cyan-100' : 'border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>
                  <Icon size={18} />
                  <span>{label}</span>
                  {id === 'notifications' && unreadCount > 0 && <span className="ml-auto rounded-full bg-cyan-300/15 px-2 py-0.5 text-[10px] text-cyan-200">{unreadCount}</span>}
                </button>
              ))}
            </nav>
            <div className="mt-auto pt-8">
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-sm font-medium text-rose-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-300/10 hover:shadow-lg hover:shadow-rose-950/20">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </aside>



        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 sm:py-7 lg:px-10">

          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-6">

            <div className="flex items-center gap-3 lg:hidden">

              <div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-200"><Activity size={20} /></div>

              <span className="font-display font-bold text-white">KDC <span className="text-cyan-300">FixFlow</span></span>

            </div>



            <div className="hidden lg:block">

              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student workspace</p>

              <p className="mt-1 text-sm text-slate-300">{({ profile: 'Your personal space', complaints: 'Your campus reports', notifications: 'Campus updates', help: 'Guidance and support' })[activeTab]}</p>

            </div>



            <div className="ml-auto flex items-center gap-2 sm:gap-3">

              <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing || loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200 disabled:opacity-50">

                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>

              </button>



            </div>

          </header>
          <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:hidden">
            {[
              { id: 'profile', label: 'Profile', icon: UserRound },
              { id: 'complaints', label: 'Complaints', icon: ClipboardList },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'help', label: 'Help', icon: Sparkles },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${activeTab === id ? 'border-cyan-300/20 bg-cyan-300/[0.09] text-cyan-100' : 'border-white/[0.07] bg-white/[0.025] text-slate-400 hover:text-white'}`}>
                <Icon size={15} /> {label}
                {id === 'notifications' && unreadCount > 0 && <span className="rounded-full bg-cyan-300/15 px-1.5 py-0.5 text-[9px] text-cyan-200">{unreadCount}</span>}
              </button>
            ))}
            <button type="button" onClick={handleLogout} className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-3 py-2.5 text-xs font-medium text-rose-200 sm:col-span-4">
              <LogOut size={15} /> Logout
            </button>
          </nav>



          <div className="pt-8">
            {activeTab === 'profile' && (
              <section id="profile" className="scroll-mt-8">
                <div className="mb-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Personal space</p>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">My Profile</h1>
                  <p className="mt-2 text-sm text-slate-400">Your personal and college information.</p>
                </div>
                <div className="mx-auto max-w-3xl">
            <div className="mt-8 flex justify-center">

  <div className="w-full max-w-2xl rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 text-center shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-cyan-950/30 sm:p-8">



    <div className="flex flex-col items-center">

      <div className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-cyan-300/50 bg-cyan-300/10 shadow-xl shadow-cyan-950/40 transition-all duration-300 hover:scale-[1.03] hover:shadow-cyan-900/50 sm:h-48 sm:w-48">

        {profile?.profile_photo

          ? <img

              src={imageUrl(profile.profile_photo)}

              alt="Your profile"

              className="h-full w-full object-cover"

            />

          : <span className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-cyan-200">

              {initials(displayName)}

            </span>}



        {photoSaving && (

          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">

            <LoaderCircle className="animate-spin text-cyan-200" />

          </div>

        )}

      </div>



      <h2 className="mt-5 break-words font-display text-2xl font-bold text-white sm:text-3xl">

        {displayName}

      </h2>



      <p className="mt-2 break-all text-sm text-slate-400">

        {profile?.email || user?.email || 'Student account'}

      </p>



      <p className="mt-2 text-xs text-slate-500">

        {profile?.student_id || 'Student'}

        {profile?.department ? ` · ${profile.department}` : ''}

      </p>



      <div className="mt-6 flex flex-wrap justify-center gap-2">

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200">

          <Upload size={15} /> Upload photo

          <input

            type="file"

            accept="image/jpeg,image/png,image/webp"

            className="hidden"

            disabled={photoSaving}

            onChange={event => {

              uploadProfilePhoto(event.target.files?.[0])

              event.target.value = ''

            }}

          />

        </label>



        <button

          type="button"

          onClick={openProfileEditor}

          className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2.5 text-xs text-cyan-100 transition hover:bg-cyan-300/15"

        >

          <Pencil size={14} /> Edit profile

        </button>

      </div>



      {profile?.bio && (

        <div className="mt-6 w-full rounded-2xl border border-white/[0.07] bg-black/10 p-4 text-left">

          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">

            About me

          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">

            {profile.bio}

          </p>

        </div>

      )}

    </div>

  </div>

</div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/20">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Email address</p>
                      <p className="mt-2 break-all text-sm font-medium text-white">{profile?.email || user?.email || 'Not available'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/20">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Student ID</p>
                      <p className="mt-2 text-sm font-medium text-white">{profile?.student_id || 'Not available'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/20 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Department</p>
                      <p className="mt-2 text-sm font-medium text-white">{profile?.department || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'complaints' && (
              <div className="scroll-mt-8">
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Your reports</p>
                    <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">My Complaints</h1>
                    <p className="mt-2 text-sm text-slate-400">Track the status and progress of your campus complaints.</p>
                  </div>
                  <button type="button" onClick={() => setComplaintModal(true)} className="flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"><Plus size={17} /> Raise a complaint</button>
                </div>
                {error && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-200">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div><p>{error}</p><button type="button" onClick={() => loadDashboard(true)} className="mt-2 underline underline-offset-4">Try again</button></div>
                  </div>
                )}
                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  <StatCard title="Total complaints" value={loading ? '—' : stats.total} detail="Submitted by you" icon={ClipboardList} accent="bg-cyan-300/10 text-cyan-200" delay={0.08} />
                  <StatCard title="Active complaints" value={loading ? '—' : stats.active} detail="Being handled or reviewed" icon={Clock3} accent="bg-amber-300/10 text-amber-200" delay={0.16} />
                  <StatCard title="Resolved complaints" value={loading ? '—' : stats.resolved} detail="Completed or verified" icon={CheckCircle2} accent="bg-emerald-300/10 text-emerald-200" delay={0.24} />
                </div>
              <section id="complaints" className="glass-panel scroll-mt-8 min-w-0 rounded-2xl p-5 sm:p-6">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-[0.17em] text-cyan-300">Your activity</p>

                    <h2 className="mt-2 font-display text-xl font-bold text-white">My complaints</h2>

                  </div>

                  <button type="button" onClick={() => setComplaintModal(true)} className="flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"><Plus size={14} /> New complaint</button>

                </div>



                <div className="mt-5 space-y-3">

                  {loading ? <div className="py-12 text-center text-sm text-slate-500">Loading your complaints...</div>

                    : complaints.length === 0 ? (

                      <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">

                        <ClipboardList size={27} className="mx-auto text-slate-500" />

                        <p className="mt-3 text-sm font-medium text-slate-300">No complaints yet</p>

                        <p className="mt-1 text-xs text-slate-500">Report your first campus issue to get started.</p>

                        <button type="button" onClick={() => setComplaintModal(true)} className="mt-4 rounded-lg bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-300/15">Raise a complaint</button>

                      </div>

                    ) : complaints.map((item, index) => (

                      <motion.button

                        type="button"

                        key={item.id}

                        initial={{ opacity: 0, x: 10 }}

                        animate={{ opacity: 1, x: 0 }}

                        transition={{ delay: index * 0.035 }}

                        onClick={() => openComplaint(item.id)}

                        className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.045]"

                      >

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="text-[10px] uppercase tracking-wider text-slate-500">Complaint #{item.id} · {item.category}</p>

                            <h3 className="mt-1 break-words text-sm font-semibold text-slate-100">{item.title}</h3>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">

                              <span className="flex items-center gap-1"><MapPin size={12} />{item.location?.name || 'Campus location'}</span>

                              <span>{formatDate(item.created_at)}</span>

                              {item.photos?.length > 0 && <span className="flex items-center gap-1"><ImagePlus size={12} />{item.photos.length} photo(s)</span>}

                            </div>

                          </div>

                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusStyle(item.status)}`}>{statusLabel(item.status)}</span>

                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[11px]">

                          <span className="text-slate-500">Priority</span>

                          <span className={`font-semibold uppercase ${priorityStyle(item.priority)}`}>{item.priority || '—'}</span>

                          {item.is_safety_concern && <span className="ml-auto flex items-center gap-1 text-rose-300"><ShieldAlert size={13} /> Safety concern</span>}

                          <ChevronRight size={15} className="ml-auto text-slate-500" />

                        </div>

                      </motion.button>

                    ))}

                </div>

              </section>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="scroll-mt-8">
                <div className="mb-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Updates from campus</p>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Notifications</h1>
                  <p className="mt-2 text-sm text-slate-400">Messages and updates about your reports.</p>
                </div>
              <section id="notifications" className="glass-panel scroll-mt-8 rounded-2xl p-5 sm:p-6">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-[0.17em] text-violet-300">Stay informed</p>

                    <h2 className="mt-2 font-display text-xl font-bold text-white">Notifications</h2>

                    <p className="mt-1 text-xs text-slate-500">{unreadCount} unread update(s)</p>

                  </div>

                  <div className="relative rounded-xl border border-violet-300/15 bg-violet-300/[0.07] p-3 text-violet-200">

                    <Bell size={19} />

                    {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-400 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}

                  </div>

                </div>



                {unreadCount > 0 && (

                  <button type="button" onClick={markAllRead} className="mt-4 flex items-center gap-1.5 text-[11px] text-cyan-300 transition hover:text-cyan-100"><CheckCheck size={14} /> Mark all as read</button>

                )}



                <div className="mt-4 space-y-3">

                  {loading ? <div className="py-10 text-center text-sm text-slate-500">Loading notifications...</div>

                    : notifications.length === 0 ? (

                      <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">

                        <Bell size={25} className="mx-auto text-slate-500" />

                        <p className="mt-3 text-sm text-slate-300">You're all caught up</p>

                        <p className="mt-1 text-xs text-slate-500">New updates will appear here.</p>

                      </div>

                    ) : notifications.map(notification => (

                      <button

                        type="button"

                        key={notification.id}

                        onClick={() => handleNotificationClick(notification)}

                        className={`w-full rounded-xl border p-4 text-left transition hover:border-violet-300/30 hover:bg-white/[0.05] ${notification.is_read ? 'border-white/[0.06] bg-white/[0.02]' : 'border-cyan-300/15 bg-cyan-300/[0.045]'}`}

                      >

                        <div className="flex items-start gap-3">

                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-slate-600' : 'bg-cyan-300 shadow-[0_0_10px_rgba(66,221,245,.6)]'}`} />

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <h3 className="text-sm font-semibold text-slate-200">{notification.title}</h3>

                              {!notification.is_read && <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">New</span>}

                            </div>

                            <p className="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>

                            <div className="mt-2 flex items-center justify-between gap-2">

                              <p className="text-[10px] text-slate-600">{formatDate(notification.created_at)}</p>

                              <span className="flex items-center gap-1 text-[10px] text-violet-300">Read notification <ChevronRight size={12} /></span>

                            </div>

                          </div>

                        </div>

                      </button>

                    ))}

                </div>

              </section>
              </div>
            )}

            {activeTab === 'help' && (
              <section id="help" className="scroll-mt-8">
                <div className="mb-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Student guide</p>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Help & Support</h1>
                  <p className="mt-2 text-sm text-slate-400">Quick guidance for using KDC FixFlow.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="glass-panel rounded-2xl p-6">
                    <FileText className="text-cyan-300" size={22} />
                    <h2 className="mt-4 text-base font-semibold text-white">How do I report an issue?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Open My Complaints, select Raise a complaint, enter a clear title, category, exact campus location and description. You can attach up to five evidence photos.</p>
                  </div>
                  <div className="glass-panel rounded-2xl p-6">
                    <Activity className="text-violet-300" size={22} />
                    <h2 className="mt-4 text-base font-semibold text-white">How do I track progress?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Visit My Complaints and open any report to see its current status, updates, evidence and complaint history.</p>
                  </div>
                  <div className="glass-panel rounded-2xl p-6">
                    <Bell className="text-amber-300" size={22} />
                    <h2 className="mt-4 text-base font-semibold text-white">Where do I find updates?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">The Notifications section shows messages about complaint progress. Open a notification to read its full message and mark it as read.</p>
                  </div>
                  <div className="glass-panel rounded-2xl p-6">
                    <ShieldAlert className="text-rose-300" size={22} />
                    <h2 className="mt-4 text-base font-semibold text-white">What if an issue is urgent?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Mark the Safety concern option while submitting a complaint if the issue could put students or staff at risk. For immediate danger, contact campus authorities directly.</p>
                  </div>
                </div>
              </section>
            )}

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] py-5 text-xs text-slate-500">
              <p>© 2026 KDC FixFlow. All rights reserved.</p>
              <p className="flex items-center gap-1.5"><GraduationCap size={14} /> Kuppam Degree College</p>
            </footer>
          </div>

        </section>

      </div>



      <AnimatePresence>

        {notice && (

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`fixed bottom-5 right-5 z-[150] flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${notice.type === 'error' ? 'border-rose-400/25 bg-rose-950/90 text-rose-100' : 'border-cyan-300/25 bg-slate-900/95 text-cyan-100'}`}>

            {notice.type === 'error' ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}

            <span>{notice.message}</span>

            <button type="button" onClick={() => setNotice(null)} className="ml-2 text-slate-400 hover:text-white"><X size={15} /></button>

          </motion.div>

        )}

      </AnimatePresence>



      {cameraOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Take evidence photo">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#0b1527] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">Take a photo</h2>
                <p className="mt-1 text-xs text-slate-400">Position the camera and capture the campus issue.</p>
              </div>
              <button type="button" onClick={closeCamera} className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close camera"><X size={18} /></button>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="max-h-[65vh] min-h-64 w-full object-contain" />
              {cameraLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-cyan-100"><LoaderCircle className="mr-2 animate-spin" size={18} /> Starting camera…</div>}
              {cameraError && <div className="absolute inset-x-4 bottom-4 rounded-xl border border-rose-300/20 bg-rose-950/90 p-3 text-xs leading-5 text-rose-100">{cameraError}</div>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 p-4">
              <button type="button" onClick={closeCamera} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.06]">Cancel</button>
              <button type="button" onClick={captureEvidencePhoto} disabled={cameraLoading || Boolean(cameraError)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40"><Camera size={16} /> Capture photo</button>
            </div>
          </div>
        </div>
      )}

      {profileModal && (

        <Modal title="Edit your profile" subtitle="Update the name and bio displayed in your student workspace." onClose={() => setProfileModal(false)}>

          <form onSubmit={saveProfile} className="space-y-5">

            <div>

              <label className="mb-2 block text-xs font-medium text-slate-300">Full name</label>

              <input value={editName} onChange={event => setEditName(event.target.value)} minLength={2} maxLength={150} required className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40" />

            </div>

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-xs font-medium text-slate-300">About me / Bio</label>

                <span className="text-[10px] text-slate-500">{editBio.length}/500</span>

              </div>

              <textarea value={editBio} onChange={event => setEditBio(event.target.value)} maxLength={500} rows={4} placeholder="Write a short introduction about yourself..." className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40" />

            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-slate-500">

              Your student ID, department and academic year are managed by the college and cannot be changed here.

            </div>

            <button disabled={profileSaving} className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-50">

              {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Save profile

            </button>

          </form>

        </Modal>

      )}



      {complaintModal && (

        <Modal title="Raise a campus complaint" subtitle="Describe the issue clearly. You can attach up to five photos as evidence." onClose={() => !complaintSaving && setComplaintModal(false)} wide>

          <form onSubmit={submitComplaint} className="space-y-5">

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-slate-300">Complaint title *</label>

                <input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} minLength={5} maxLength={200} required placeholder="e.g. Broken ceiling fan in classroom" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40" />

                <p className="mt-1 text-[10px] text-slate-600">5–200 characters</p>

              </div>



              <div>

                <label className="mb-2 block text-xs font-medium text-slate-300">Category *</label>

                <input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} minLength={2} maxLength={100} required placeholder="e.g. Electrical, Plumbing, Cleanliness" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40" />

              </div>



              <div>

                <label className="mb-2 block text-xs font-medium text-slate-300">Campus location *</label>
                <input
                  type="text"
                  value={form.location_name}
                  onChange={event => setForm(current => ({ ...current, location_name: event.target.value }))}
                  minLength={2}
                  maxLength={150}
                  required
                  placeholder="e.g. CSB Block, Room 204"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                />

              </div>



              <div>

                <label className="mb-2 block text-xs font-medium text-slate-300">Severity *</label>

                <select value={form.severity} onChange={event => setForm(current => ({ ...current, severity: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#111c30] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40">

                  {SEVERITIES.map(level => <option key={level} value={level}>{statusLabel(level)}</option>)}

                </select>

              </div>



              <div className="flex items-end">

                <label className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.045] p-3">

                  <input type="checkbox" checked={form.is_safety_concern} onChange={event => setForm(current => ({ ...current, is_safety_concern: event.target.checked }))} className="mt-0.5 accent-rose-400" />

                  <span><span className="flex items-center gap-1.5 text-xs font-medium text-rose-200"><ShieldAlert size={14} /> Safety concern</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">Check if this issue may put people at risk.</span></span>

                </label>

              </div>



              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-slate-300">Detailed description *</label>

                <textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} minLength={10} maxLength={5000} required rows={5} placeholder="Explain what happened, where exactly it is, when you noticed it, and how it affects students..." className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40" />

                <p className="mt-1 text-right text-[10px] text-slate-600">{form.description.length}/5000</p>

              </div>

            </div>



            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">

              <div className="flex flex-wrap items-center justify-between gap-2">

                <div>

                  <p className="flex items-center gap-2 text-sm font-semibold text-white"><ImagePlus size={17} className="text-cyan-300" /> Photo evidence</p>

                  <p className="mt-1 text-[11px] text-slate-500">JPG, PNG or WebP · Max 5 MB each · Up to 5 photos</p>

                </div>

                <span className="text-xs text-cyan-200">{evidence.length}/{MAX_PHOTOS}</span>

              </div>



              <div className="mt-4 flex flex-wrap gap-2">

                <button type="button" onClick={() => { setCameraError(''); setCameraOpen(true) }} disabled={evidence.length >= MAX_PHOTOS} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2.5 text-xs text-cyan-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-300/15 hover:shadow-lg hover:shadow-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-40">

                  <Camera size={15} /> Take photo

                </button>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:text-cyan-100">

                  <Upload size={15} /> Choose from device

                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={evidence.length >= MAX_PHOTOS} onChange={addEvidence} />

                </label>

              </div>



              {evidence.length > 0 && (

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">

                  {evidence.map((item, index) => (

                    <div key={`${item.file.name}-${index}`} className="group relative overflow-hidden rounded-xl border border-white/10">

                      <img src={item.preview} alt={`Evidence ${index + 1}`} className="h-24 w-full object-cover" />

                      <button type="button" onClick={() => removeEvidence(index)} className="absolute right-1 top-1 rounded-lg bg-slate-950/80 p-1.5 text-rose-200 opacity-100 transition hover:bg-rose-500/30 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Remove photo"><Trash2 size={13} /></button>

                      <p className="truncate bg-slate-950/80 px-2 py-1 text-[9px] text-slate-400">{item.file.name}</p>

                    </div>

                  ))}

                </div>

              )}

            </div>



            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

              <button type="button" disabled={complaintSaving} onClick={() => setComplaintModal(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05]">Cancel</button>

              <button type="submit" disabled={complaintSaving} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50">

                {complaintSaving ? <><LoaderCircle size={16} className="animate-spin" /> Submitting...</> : <><Plus size={16} /> Submit complaint</>}

              </button>

            </div>

          </form>

        </Modal>

      )}



      {(detailLoading || selectedComplaint) && (

        <Modal title={detailLoading ? 'Loading complaint...' : `Complaint #${selectedComplaint.id}`} subtitle={detailLoading ? 'Retrieving complaint details and history.' : `${selectedComplaint.category} · ${selectedComplaint.location?.name || 'Campus location'}`} onClose={() => { setSelectedComplaint(null); setDetailLoading(false) }} wide>

          {detailLoading ? (

            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400"><LoaderCircle className="animate-spin text-cyan-300" /> Loading complaint details...</div>

          ) : (

            <div className="space-y-6">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusStyle(selectedComplaint.status)}`}>{statusLabel(selectedComplaint.status)}</span>

                <span className="text-xs text-slate-500">Submitted {formatDate(selectedComplaint.created_at)}</span>

              </div>



              <div>

                <h3 className="text-lg font-semibold text-white">{selectedComplaint.title}</h3>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{selectedComplaint.description}</p>

              </div>



              <div className="grid gap-3 sm:grid-cols-3">

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Severity</p><p className="mt-1 text-sm font-semibold capitalize text-white">{selectedComplaint.severity}</p></div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Priority</p><p className={`mt-1 text-sm font-semibold capitalize ${priorityStyle(selectedComplaint.priority)}`}>{selectedComplaint.priority}</p></div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Affected students</p><p className="mt-1 text-sm font-semibold text-white">{selectedComplaint.affected_count}</p></div>

              </div>



              {selectedComplaint.is_safety_concern && (

                <div className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-3 text-xs text-rose-200"><ShieldAlert size={16} /> This complaint was reported as a safety concern.</div>

              )}



              <div>

                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><ImagePlus size={16} className="text-cyan-300" /> Evidence photos</h3>

                {selectedComplaint.photos?.length ? (

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {selectedComplaint.photos.map(photo => (

                      <a key={photo.id} href={imageUrl(photo.image_url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-white/10 transition hover:border-cyan-300/30">

                        <img src={imageUrl(photo.image_url)} alt="Complaint evidence" className="h-28 w-full object-cover" />

                        <p className="px-2 py-1.5 text-[10px] text-slate-500">{photo.photo_type} · {formatDate(photo.created_at)}</p>

                      </a>

                    ))}

                  </div>

                ) : <p className="mt-2 text-xs text-slate-500">No evidence photos attached.</p>}

              </div>



              <div>

                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity size={16} className="text-violet-300" /> Complaint history</h3>

                <div className="mt-3 space-y-3">

                  {complaintHistory.length === 0 ? <p className="text-xs text-slate-500">No history available.</p> : complaintHistory.map(item => (

                    <div key={item.id} className="relative border-l border-cyan-300/20 pl-4">

                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-cyan-300" />

                      <p className="text-xs font-semibold text-slate-200">{statusLabel(item.new_status)}</p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.notes || 'Status updated.'}</p>

                      <p className="mt-1 text-[10px] text-slate-600">{formatDate(item.changed_at)}</p>

                    </div>

                  ))}

                </div>

              </div>



              {selectedComplaint.status === 'verified' && (

                <div className="space-y-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4">

                  <div>

                    <p className="text-sm font-semibold text-white">Has the issue actually been fixed?</p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">Confirm resolution if the repair worked. Otherwise, request that the complaint be reopened.</p>

                  </div>

                  <button type="button" disabled={actionSaving} onClick={() => complaintAction('resolve')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/15 disabled:opacity-50">

                    {actionSaving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Confirm issue resolved

                  </button>

                  <div>

                    <label className="mb-2 block text-xs font-medium text-slate-300">Reason for reopening</label>

                    <textarea value={reopenReason} onChange={event => setReopenReason(event.target.value)} minLength={10} maxLength={1000} rows={3} placeholder="Explain why the repair did not resolve the issue (at least 10 characters)..." className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs leading-5 text-white outline-none placeholder:text-slate-600 focus:border-rose-300/30" />

                  </div>

                  <button type="button" disabled={actionSaving || reopenReason.trim().length < 10} onClick={() => complaintAction('reopen')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/15 disabled:opacity-40">

                    <RotateCcw size={15} /> Request reopening

                  </button>

                </div>

              )}

            </div>

          )}

        </Modal>

      )}



      {selectedNotification && (

        <Modal title={selectedNotification.title} subtitle={`Notification · ${formatDate(selectedNotification.created_at)}`} onClose={() => setSelectedNotification(null)}>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">

            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{selectedNotification.message}</p>
            {selectedNotification.issue_id && <p className="mt-3 text-xs text-cyan-300">Related complaint #{selectedNotification.issue_id}</p>}

            <p className="mt-4 text-[10px] uppercase tracking-wider text-emerald-300">Read</p>

          </div>

          <button type="button" onClick={() => setSelectedNotification(null)} className="mt-5 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05]">Close</button>

        </Modal>

      )}

    </main>

  )

}
