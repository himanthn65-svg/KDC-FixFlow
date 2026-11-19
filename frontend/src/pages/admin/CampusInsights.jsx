
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import {
  Activity,
  AlertTriangle,
  Clock3,
  RefreshCw,
  Target,
  TrendingUp,
  MapPin,
  Users,
  CheckCircle2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import api from '../../services/api'

const COLORS = ['#22d3ee', '#818cf8', '#34d399', '#f59e0b', '#f87171']

const panelClass =
  'rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg'

const chartTooltipStyle = {
  backgroundColor: '#101c2d',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: '#fff',
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className={panelClass}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-3 text-3xl font-semibold text-white">
            {value ?? 0}
          </h3>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function Building({ position, height, label, count }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[1.5, height, 1.5]} />
        <meshStandardMaterial
          color="#164e63"
          emissive="#0891b2"
          emissiveIntensity={0.25}
          roughness={0.35}
          metalness={0.35}
        />
      </mesh>

      <mesh position={[0, height + 0.08, 0]}>
        <boxGeometry args={[1.65, 0.12, 1.65]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>

      <Text
        position={[0, height + 0.65, 0]}
        fontSize={0.24}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        textAlign="center"
      >
        {label}
      </Text>

      <Text
        position={[0, height + 0.35, 0]}
        fontSize={0.2}
        color="#67e8f9"
        anchorX="center"
        anchorY="middle"
      >
        {`${count} complaints`}
      </Text>
    </group>
  )
}

function CampusActivityScene({ locations }) {
  const buildings = locations.length
    ? locations
    : [{ location: 'No location data', total: 0 }]

  return (
    <Canvas
      camera={{ position: [7, 6, 9], fov: 45 }}
      shadows
      style={{ height: '360px', width: '100%' }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={2}
        castShadow
      />

      <gridHelper args={[16, 16, '#155e75', '#1e293b']} />

      {buildings.map((item, index) => {
        const count = Number(item.total || 0)
        const height = Math.max(0.5, Math.min(count, 10) * 0.65)

        return (
          <Building
            key={`${item.location}-${index}`}
            position={[
              (index - (buildings.length - 1) / 2) * 3,
              0,
              0,
            ]}
            height={height}
            label={item.location}
            count={count}
          />
        )
      })}

      <OrbitControls
        enablePan
        enableZoom
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  )
}

export default function CampusInsights() {
  const [analytics, setAnalytics] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        overviewRes,
        trendsRes,
        priorityRes,
        categoryRes,
        locationRes,
        workloadRes,
        resolutionRes,
        campusLocationsRes,
      ] = await Promise.all([
        api.get('/admin/analytics/overview'),
        api.get('/admin/analytics/complaint-trends'),
        api.get('/admin/analytics/priority-distribution'),
        api.get('/admin/analytics/category-distribution'),
        api.get('/admin/analytics/location-distribution'),
        api.get('/admin/analytics/staff-workload'),
        api.get('/admin/analytics/resolution-metrics'),
        api.get('/locations'),
      ])

      setAnalytics({
        overview: overviewRes.data,
        trends: trendsRes.data,
        priorities: priorityRes.data,
        categories: categoryRes.data,
        locationDistribution: locationRes.data,
        workload: workloadRes.data,
        resolution: resolutionRes.data,
      })

      setLocations(
        Array.isArray(campusLocationsRes.data)
          ? campusLocationsRes.data.filter((location) => location.is_active)
          : []
      )
    } catch (err) {
      console.error('Campus Insights loading error:', err)
      setError(
        err.response?.data?.detail ||
          'Unable to load campus analytics. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const locationActivity = useMemo(() => {
    const distribution = analytics?.locationDistribution?.distribution || []

    return distribution.map((item) => ({
      location: item.location,
      total: Number(item.total || 0),
    }))
  }, [analytics])

  const trendData = useMemo(
    () =>
      (analytics?.trends?.trends || []).map((item) => ({
        date: item.date?.slice(5) || '',
        complaints: Number(item.total_complaints || 0),
      })),
    [analytics]
  )

  const priorityData = analytics?.priorities?.distribution || []
  const categoryData = analytics?.categories?.distribution || []
  const workloadData = analytics?.workload?.staff_workload || []

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-cyan-300">
        <RefreshCw className="mr-3 animate-spin" size={22} />
        Loading campus insights...
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 text-red-400" size={30} />
        <p className="text-red-300">{error}</p>
        <button
          onClick={loadInsights}
          className="mt-5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950"
        >
          Retry
        </button>
      </div>
    )
  }

  const overview = analytics?.overview || {}
  const resolution = analytics?.resolution || {}

  return (
    <div className="space-y-6 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Campus Insights</h2>
          <p className="mt-1 text-sm text-slate-400">
            Campus complaints, performance and location analytics
          </p>
        </div>

        <button
          onClick={loadInsights}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-cyan-300 transition hover:bg-white/10"
        >
          <RefreshCw size={16} />
          Refresh data
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Complaints"
          value={overview.total_complaints}
          subtitle="All recorded complaints"
          icon={Activity}
          color="#22d3ee"
        />
        <StatCard
          title="High Priority"
          value={overview.high_priority_complaints}
          subtitle={`${overview.critical_complaints || 0} critical complaints`}
          icon={AlertTriangle}
          color="#fb7185"
        />
        <StatCard
          title="Active Staff"
          value={overview.active_staff}
          subtitle="Available staff accounts"
          icon={Users}
          color="#a78bfa"
        />
        <StatCard
          title="Work Orders"
          value={overview.total_work_orders}
          subtitle="Total work orders created"
          icon={Target}
          color="#34d399"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={panelClass}>
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp className="text-cyan-400" size={19} />
            <h3 className="font-semibold text-white">Complaint Trends</h3>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="complaintGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="complaints"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  fill="url(#complaintGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panelClass}>
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={19} />
            <h3 className="font-semibold text-white">Priority Distribution</h3>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="total"
                  nameKey="priority"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  innerRadius={55}
                  paddingAngle={3}
                >
                  {priorityData.map((item, index) => (
                    <Cell
                      key={item.priority}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend formatter={(value) => (
                  <span className="text-slate-300">{value}</span>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={panelClass}>
          <div className="mb-5 flex items-center gap-2">
            <Target className="text-indigo-400" size={19} />
            <h3 className="font-semibold text-white">Complaint Categories</h3>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={100}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="total" fill="#818cf8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panelClass}>
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="text-cyan-400" size={19} />
            <h3 className="font-semibold text-white">Location Distribution</h3>
          </div>

          {locationActivity.length ? (
            <div className="space-y-4">
              {locationActivity.map((item) => {
                const max = Math.max(
                  ...locationActivity.map((location) => location.total),
                  1
                )
                return (
                  <div key={item.location}>
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="text-slate-300">{item.location}</span>
                      <span className="font-semibold text-cyan-300">
                        {item.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${(item.total / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              No location complaint data available yet.
            </p>
          )}
        </section>
      </div>

      <section className={panelClass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">3D Campus Activity</h3>
            <p className="mt-1 text-xs text-slate-400">
              Interactive location activity visualization · Drag to rotate, scroll to zoom
            </p>
          </div>
          <span className="rounded-lg bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
            {locations.length} active campus locations
          </span>
        </div>

        <div className="overflow-hidden rounded-xl bg-[#081321]">
          <CampusActivityScene locations={locationActivity} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          This is a 3D activity visualization, not a geographic campus map.
          Building positions are illustrative because the location API does not
          provide physical coordinates.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={panelClass}>
          <div className="mb-5 flex items-center gap-2">
            <Users className="text-violet-400" size={19} />
            <h3 className="font-semibold text-white">Staff Workload</h3>
          </div>

          <div className="space-y-4">
            {workloadData.map((staff) => (
              <div
                key={staff.staff_id}
                className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
              >
                <div className="mb-3 flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{staff.staff_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      ID: {staff.employee_id}
                    </p>
                  </div>
                  <span className="text-sm text-cyan-300">
                    {staff.total_assigned} assigned
                  </span>
                </div>

                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-400">
                    {staff.completed} completed
                  </span>
                  <span className="text-amber-400">
                    {staff.in_progress} in progress
                  </span>
                </div>
              </div>
            ))}

            {!workloadData.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                No staff workload data available.
              </p>
            )}
          </div>
        </section>

        <section className={panelClass}>
          <div className="mb-5 flex items-center gap-2">
            <Clock3 className="text-emerald-400" size={19} />
            <h3 className="font-semibold text-white">Resolution Performance</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.035] p-4">
              <CheckCircle2 className="mb-3 text-emerald-400" size={20} />
              <p className="text-2xl font-semibold text-white">
                {resolution.resolved_complaints ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">Resolved complaints</p>
            </div>

            <div className="rounded-xl bg-white/[0.035] p-4">
              <AlertTriangle className="mb-3 text-amber-400" size={20} />
              <p className="text-2xl font-semibold text-white">
                {resolution.unresolved_complaints ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">Unresolved complaints</p>
            </div>

            <div className="rounded-xl bg-white/[0.035] p-4">
              <Clock3 className="mb-3 text-cyan-400" size={20} />
              <p className="text-2xl font-semibold text-white">
                {resolution.average_resolution_hours ?? 0}
                <span className="ml-1 text-sm font-normal text-slate-400">hrs</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">Average resolution time</p>
            </div>

            <div className="rounded-xl bg-white/[0.035] p-4">
              <Activity className="mb-3 text-violet-400" size={20} />
              <p className="text-2xl font-semibold text-white">
                {resolution.recurring_complaints ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">Recurring complaints</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
