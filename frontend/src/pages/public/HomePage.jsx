import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, GraduationCap, Wrench, ShieldCheck, ArrowRight,
  Camera, Activity, Bell, ChartNoAxesCombined, CheckCircle2,
  Menu, X, Eye, EyeOff, Sparkles, ChevronDown, LockKeyhole
} from 'lucide-react'
import CampusHeroScene from '../../three/CampusHeroScene'
import { useAuth } from '../../context/AuthContext'

const nav = [
  ['Home', 'home'],
  ['About', 'about'],
  ['Features', 'features'],
  ['How It Works', 'how-it-works'],
  ['User Roles', 'roles'],
  ['FAQ', 'faq'],
  ['Contact', 'contact'],
]

const features = [
  [Camera, 'Easy Issue Reporting', 'Submit maintenance reports with descriptions, campus locations and photographs.'],
  [Activity, 'Live Progress Tracking', 'Follow complaints from reporting through assignment, repair and verification.'],
  [Sparkles, 'Smart Priority System', 'Rule-based priority suggestions help identify urgent maintenance and safety concerns.'],
  [Bell, 'Notifications', 'Receive updates about assignments, progress and complaint status.'],
  [ChartNoAxesCombined, 'Campus Analytics', 'Administrators can review complaint trends, priorities and staff workload.'],
  [CheckCircle2, 'Verified Resolution', 'Repair evidence and administrator verification support accountable resolution.'],
]

const workflow = [
  ['01', 'Report', 'Students submit an issue with its location and details.'],
  ['02', 'Review', 'Administrators review reports and suggested priorities.'],
  ['03', 'Assign', 'Work is assigned to the appropriate maintenance staff.'],
  ['04', 'Repair', 'Staff complete the work and submit repair evidence.'],
  ['05', 'Verify', 'Administrators verify the repair and students confirm resolution.'],
]

const faq = [
  ['What is KDC FixFlow?', 'A campus maintenance and safety response platform for reporting, assigning, tracking and verifying college maintenance issues.'],
  ['Who can report issues?', 'Registered students can report campus maintenance and safety concerns.'],
  ['Can staff register themselves?', 'No. Maintenance staff accounts are created by an authorized administrator.'],
  ['How can students track a complaint?', 'Students can sign in to view complaint status, progress history and resolution updates.'],
  ['How is a repair verified?', 'Staff submit completion evidence. The administrator verifies the repair before the student confirms resolution.'],
]

export default function HomePage() {
  const navigate = useNavigate()
  const { login, adminLogin } = useAuth()
  const [role, setRole] = useState('student')
  const [switchingRole, setSwitchingRole] = useState(false)
  const [savedEmails, setSavedEmails] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kdc_fixflow_recent_emails') || '[]')
    } catch {
      return []
    }
  })
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const destinations = {
    student: '/student/dashboard',
    maintenance_staff: '/staff/dashboard',
    admin: '/admin/dashboard',
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const credentials = {
        email: form.email.trim(),
        password: form.password,
      }

      if (role === 'admin') {
        await adminLogin(credentials)
      } else {
        await login({ ...credentials, login_as: role })
      }

      if (role !== 'admin') {
        const email = credentials.email.toLowerCase()
        const updatedEmails = [email, ...savedEmails.filter(item => item !== email)].slice(0, 6)
        localStorage.setItem('kdc_fixflow_recent_emails', JSON.stringify(updatedEmails))
        setSavedEmails(updatedEmails)
      }

      navigate(destinations[role], { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  function selectRole(value) {
    if (value === role) return

    setSwitchingRole(true)
    setRole(value)
    setForm({ email: '', password: '' })
    setError('')
    setShowPassword(false)

    window.setTimeout(() => {
      setSwitchingRole(false)
    }, 650)
  }

  return (
    <main className="liquid-page">
      <div className="ambient-scene" aria-hidden="true">
        <div className="ambient-orb orb-cyan" />
        <div className="ambient-orb orb-violet" />
        <div className="ambient-orb orb-blue" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <nav className="glass-nav mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
          <a href="#home" className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-cyan-300">
              <Building2 size={22} />
            </span>
            <span>
              <span className="block font-display text-lg font-bold">KDC <span className="text-gradient">FixFlow</span></span>
              <span className="block text-[9px] tracking-[.18em] text-slate-400">KUPPAM DEGREE COLLEGE</span>
            </span>
          </a>

          <div className="hidden items-center gap-7 2xl:gap-8 xl:flex">
            {nav.map(([label, id]) => (
              <a key={id} href={`#${id}`} className="nav-link text-base text-slate-300 transition hover:text-cyan-300">{label}</a>
            ))}
          </div>

          <a href="#login" className="glass-button hidden !px-4 !py-2.5 text-xs sm:inline-flex">
            Login <ArrowRight size={15} />
          </a>

          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl border border-white/10 p-2 xl:hidden" aria-label="Toggle menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="glass-panel mx-auto mt-2 max-w-7xl p-4 xl:hidden">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nav.map(([label, id]) => (
                <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="nav-mobile-link rounded-xl p-3 text-sm text-slate-300 hover:bg-white/10">{label}</a>
              ))}
            </div>
          </div>
        )}
      </header>

      <section id="home" className="mx-auto grid max-w-7xl scroll-mt-28 items-center gap-8 px-5 pb-16 pt-32 sm:px-8 lg:grid-cols-2 lg:pt-40">
        <motion.div initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .8 }}>
          <span className="glass-chip mb-7 text-xs"><Sparkles size={14} /> SMART CAMPUS ECOSYSTEM</span>
          <p className="section-kicker mb-4">Kuppam Degree College</p>
          <h1 className="font-display text-5xl font-bold leading-[1.1] sm:text-6xl xl:text-7xl">
            A better campus<br />starts with<br /><span className="text-gradient">one action.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
            Report campus problems, coordinate maintenance and help create a safer, better learning environment through one connected platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#login" className="glass-button">Get Started <ArrowRight size={17} /></a>
            <a href="#how-it-works" className="glass-button glass-button-secondary">Explore the Process</a>
          </div>
          <div className="mt-10 flex gap-8 border-t border-white/10 pt-7">
            <div><p className="font-display text-xl font-bold">Report</p><p className="mt-1 text-xs text-slate-500">Campus issues</p></div>
            <div><p className="font-display text-xl font-bold">Track</p><p className="mt-1 text-xs text-slate-500">Live progress</p></div>
            <div><p className="font-display text-xl font-bold">Resolve</p><p className="mt-1 text-xs text-slate-500">Verified repairs</p></div>
          </div>
        </motion.div>

        <motion.div
  initial={{ opacity: 0, scale: 0.92 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 1 }}
  className="relative isolate min-w-0"
>
  <div className="pointer-events-none absolute inset-10 rounded-full bg-cyan-400/10 blur-[100px]" />
  <div className="pointer-events-none absolute inset-16 rounded-full bg-violet-500/10 blur-[120px]" />
  <div className="relative z-10">
    <CampusHeroScene />
  </div>
</motion.div>
      </section>

      <section id="login" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="section-kicker mb-4">Your campus workspace</p>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">One platform.<br /><span className="text-gradient">Three dedicated roles.</span></h2>
            <p className="mt-5 max-w-lg leading-8 text-slate-400">Choose your role to access the right workspace. Your account is authenticated and authorized by the server.</p>
            <div className="mt-8 space-y-5">
              {[
                [GraduationCap, 'Students', 'Report problems and follow repairs.'],
                [Wrench, 'Maintenance Staff', 'Manage assigned work and submit evidence.'],
                [ShieldCheck, 'Administrators', 'Coordinate operations and verify resolutions.'],
              ].map(([Icon, title, description]) => (
                <div key={title} className="flex items-center gap-4">
                  <span className="glass-card rounded-xl p-3 text-cyan-300"><Icon size={21} /></span>
                  <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-400">{description}</p></div>
                </div>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-panel login-panel p-5 sm:p-8">
            <div className="mb-7 flex items-center justify-between">
              <div><p className="section-kicker mb-2">Secure portal</p><h3 className="font-display text-2xl font-bold">Welcome back</h3><p className="mt-2 text-xs text-slate-400">Select your account type to continue.</p></div>
              <span className="rounded-xl bg-cyan-300/10 p-3 text-cyan-300"><LockKeyhole size={23} /></span>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Login as
              </p>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
                {[
                  ['student', 'Student', GraduationCap],
                  ['maintenance_staff', 'Staff', Wrench],
                  ['admin', 'Admin', ShieldCheck],
                ].map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectRole(value)}
                    aria-pressed={role === value}
                    className={`role-tab flex flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition ${role === value ? 'border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>
              {switchingRole && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-center text-xs text-cyan-300"
                >
                  Switching to {role === 'student' ? 'Student' : role === 'maintenance_staff' ? 'Staff' : 'Administrator'} portal...
                </motion.p>
              )}
            </div>
<motion.form key={role} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label htmlFor="portal-email" className="mb-2 block text-xs font-semibold text-slate-300">
                  Email Address
                </label>
                <input
                  id="portal-email"
                  className="glass-input"
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your registered email"
                  value={form.email}
                  onChange={e => {
                    setForm({ ...form, email: e.target.value })
                    setShowEmailSuggestions(true)
                  }}
                  onFocus={() => setShowEmailSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowEmailSuggestions(false), 160)}
                  required
                />

                {role !== 'admin' && showEmailSuggestions && savedEmails.filter(email => email.toLowerCase().includes(form.email.toLowerCase())).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -7, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="email-suggestions absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl p-2"
                  >
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
                      Recently used accounts
                    </p>
                    {savedEmails
                      .filter(email => email.toLowerCase().includes(form.email.toLowerCase()))
                      .map(email => (
                        <button
                          key={email}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setForm({ ...form, email })
                            setShowEmailSuggestions(false)
                          }}
                          className="email-suggestion-item flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-slate-200"
                        >
                          {email}
                        </button>
                      ))}
                  </motion.div>
                )}
              </div><div>
                <label htmlFor="portal-password" className="mb-2 block text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <input id="portal-password" className="glass-input pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
              <button type="submit" disabled={loading} className="glass-button w-full">
                {loading ? 'Authenticating...' : `Continue as ${role === 'maintenance_staff' ? 'Staff' : role === 'admin' ? 'Administrator' : 'Student'}`}
                {!loading && <ArrowRight size={17} />}
              </button>
            </motion.form>

            {role === 'student' && <p className="mt-6 text-center text-xs text-slate-400">New student? <a href="/register" className="font-semibold text-cyan-300 hover:text-cyan-100">Create an account</a></p>}
            {role === 'maintenance_staff' && <p className="mt-6 text-center text-xs text-slate-500">Staff accounts are created by the college administrator.</p>}
            {role === 'admin' && <p className="mt-6 text-center text-xs text-slate-500">Restricted administrator access. No public registration.</p>}
          </motion.div>
        </div>
      </section>

      <section id="about" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div><p className="section-kicker mb-4">About KDC FixFlow</p><h2 className="font-display text-4xl font-bold sm:text-5xl">Making campus care <span className="text-gradient">more connected.</span></h2></div>
          <p className="leading-8 text-slate-400">KDC FixFlow brings students, maintenance teams and college administrators into one coordinated workflow. Campus issues can be recorded, prioritized, assigned, monitored and verified through a single platform.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            ['Visibility', 'Give every reported issue a trackable status and history.'],
            ['Coordination', 'Connect students, staff and administrators through clear responsibilities.'],
            ['Accountability', 'Record assignments, repair evidence and verification actions.'],
          ].map(([title, text]) => <article key={title} className="glass-card glass-hover p-7"><Sparkles className="mb-5 text-cyan-300" /><h3 className="font-display text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></article>)}
        </div>
      </section>

      <section id="features" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center"><p className="section-kicker mb-4">Platform capabilities</p><h2 className="font-display text-4xl font-bold sm:text-5xl">Everything works <span className="text-gradient">together.</span></h2></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, text]) => <article key={title} className="glass-card glass-hover p-7"><span className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/5 p-3 text-cyan-300"><Icon size={23} /></span><h3 className="font-display text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center"><p className="section-kicker mb-4">Simple workflow</p><h2 className="font-display text-4xl font-bold">From report to <span className="text-gradient">resolution.</span></h2></div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflow.map(([number, title, text]) => <article key={number} className="glass-card glass-hover p-6"><p className="font-display text-3xl font-bold text-cyan-300">{number}</p><div className="my-5 h-px bg-gradient-to-r from-cyan-300/50 to-transparent" /><h3 className="font-display text-lg font-semibold">{title}</h3><p className="mt-3 text-xs leading-6 text-slate-400">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="roles" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center"><p className="section-kicker mb-4">Designed around responsibility</p><h2 className="font-display text-4xl font-bold">The right tools for <span className="text-gradient">every role.</span></h2></div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              [GraduationCap, 'Student', 'Report campus issues, track complaints and confirm completed repairs.'],
              [Wrench, 'Maintenance Staff', 'View assigned work, update repair progress and submit evidence.'],
              [ShieldCheck, 'Administrator', 'Manage complaints, staff, locations, verification and analytics.'],
            ].map(([Icon, title, text]) => <article key={title} className="glass-card glass-hover p-8"><Icon size={28} className="mb-6 text-cyan-300" /><h3 className="font-display text-2xl font-semibold">{title}</h3><p className="mt-4 text-sm leading-7 text-slate-400">{text}</p><a href="#login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Access portal <ArrowRight size={16} /></a></article>)}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center"><p className="section-kicker mb-4">Need some help?</p><h2 className="font-display text-4xl font-bold">Frequently asked <span className="text-gradient">questions.</span></h2></div>
          <div className="space-y-3">
            {faq.map(([question, answer]) => <details key={question} className="glass-card group p-5 sm:p-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-200">{question}<ChevronDown size={19} className="shrink-0 text-cyan-300 transition group-open:rotate-180" /></summary><p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-slate-400">{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 px-5 py-20 sm:px-8">
        <div className="glass-panel relative mx-auto max-w-7xl overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div><p className="section-kicker mb-4">Kuppam Degree College</p><h2 className="font-display text-3xl font-bold sm:text-4xl">A better campus is <span className="text-gradient">a shared effort.</span></h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">For college-related assistance or account access, contact the appropriate college administration or maintenance team.</p></div>
            <a href="#login" className="glass-button shrink-0">Open FixFlow <ArrowRight size={17} /></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/20 px-5 py-9 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div><p className="font-display text-xl font-bold">KDC <span className="text-gradient">FixFlow</span></p><p className="mt-2 text-xs text-slate-500">Smart Campus Maintenance & Safety Response System</p><p className="mt-1 text-xs text-slate-500">Kuppam Degree College</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-400">{nav.map(([label, id]) => <a key={id} href={`#${id}`} className="hover:text-cyan-300">{label}</a>)}</div>
        </div>
        <div className="glass-divider mx-auto my-7 max-w-7xl" />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 text-center text-sm text-slate-400"><p>© 2026 KDC FixFlow. All rights reserved.</p><p>Designed for a smarter and safer campus.</p></div>
      </footer>
    </main>
  )
}




