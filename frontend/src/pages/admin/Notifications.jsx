
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

import api from '../../services/api'

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function notificationLabel(value = '') {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function getNotificationList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.notifications)) return data.notifications
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  return []
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadNotifications = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)

    setError('')
    setNotice('')

    try {
      const [notificationResult, countResult] = await Promise.allSettled([
        api.get('/notifications', {
          params: { skip: 0, limit: 50 },
        }),
        api.get('/notifications/unread-count'),
      ])

      if (notificationResult.status === 'rejected') {
        throw notificationResult.reason
      }

      const items = getNotificationList(notificationResult.value.data)

      setNotifications(items)

      if (countResult.status === 'fulfilled') {
        const count = Number(
          countResult.value.data?.unread_count
        )

        setUnreadCount(
          Number.isFinite(count)
            ? count
            : items.filter(item => !item.is_read).length
        )
      } else {
        setUnreadCount(items.filter(item => !item.is_read).length)
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to load notifications.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(item => !item.is_read)
    }

    if (filter === 'read') {
      return notifications.filter(item => item.is_read)
    }

    return notifications
  }, [notifications, filter])

  const markAsRead = async notification => {
    if (notification.is_read || updatingId !== null) return

    setUpdatingId(notification.id)
    setNotice('')

    try {
      await api.patch(`/notifications/${notification.id}/read`)

      setNotifications(current =>
        current.map(item =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      )

      setUnreadCount(current => Math.max(0, current - 1))
      setNotice('Notification marked as read.')
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to mark notification as read.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return

    setMarkingAll(true)
    setError('')
    setNotice('')

    try {
      await api.patch('/notifications/read-all')

      setNotifications(current =>
        current.map(item => ({ ...item, is_read: true }))
      )

      setUnreadCount(0)
      setNotice('All notifications marked as read.')
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to mark all notifications as read.'
      )
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-7"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            Administration updates
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Stay informed about new complaints and campus maintenance activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadNotifications(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck size={16} />
            {markingAll ? 'Updating...' : 'Mark all read'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Total notifications</p>
            <Bell size={19} className="text-cyan-300" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Unread</p>
            <AlertCircle size={19} className="text-cyan-300" />
          </div>
          <p className="mt-3 text-3xl font-bold text-cyan-300">
            {unreadCount}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Read</p>
            <CheckCircleIcon />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-300">
            {notifications.filter(item => item.is_read).length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">
            Notification history
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest notifications from your account.
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'unread', 'read'].map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                filter === value
                  ? 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20'
                  : 'border border-white/10 text-slate-400 hover:bg-white/[0.05]'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] py-16 text-center">
          <RefreshCw size={25} className="mx-auto animate-spin text-cyan-300" />
          <p className="mt-4 text-sm text-slate-400">
            Loading notifications...
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-16 text-center">
          <Inbox size={36} className="mx-auto text-slate-600" />

          <h3 className="mt-4 text-lg font-semibold text-slate-300">
            {filter === 'unread'
              ? 'No unread notifications'
              : filter === 'read'
                ? 'No read notifications'
                : 'No notifications yet'}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            New campus updates will appear here when available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <motion.article
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.25) }}
              className={`rounded-2xl border p-5 transition ${
                notification.is_read
                  ? 'border-white/[0.07] bg-white/[0.025]'
                  : 'border-cyan-300/20 bg-cyan-300/[0.045]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 rounded-xl p-3 ${
                  notification.is_read
                    ? 'bg-white/[0.05] text-slate-400'
                    : 'bg-cyan-400/10 text-cyan-300'
                }`}>
                  <Bell size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {notification.title}
                    </h3>

                    {!notification.is_read && (
                      <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        New
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {notification.message}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} />
                      {formatDate(notification.created_at)}
                    </span>

                    {notification.issue_id && (
                      <span>
                        Complaint #{notification.issue_id}
                      </span>
                    )}

                    {notification.notification_type && (
                      <span>
                        {notificationLabel(notification.notification_type)}
                      </span>
                    )}
                  </div>
                </div>

                {!notification.is_read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification)}
                    disabled={updatingId === notification.id}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-300/10 disabled:opacity-50"
                  >
                    {updatingId === notification.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </motion.section>
  )
}

function CheckCircleIcon() {
  return <CheckCheck size={19} className="text-emerald-300" />
}
