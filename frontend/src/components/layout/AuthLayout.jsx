import { motion } from 'framer-motion'
import { ShieldCheck, Sparkles, Building2 } from 'lucide-react'

export default function AuthLayout({ children, title, subtitle, admin = false }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-600/10 blur-[110px]" />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/65 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl lg:grid-cols-2"
      >
        <section className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-cyan-950/60 via-slate-950 to-blue-950/60 p-10 lg:flex">
          <div className="absolute -right-20 top-24 h-72 w-72 rounded-full border border-cyan-400/10" />
          <div className="absolute -right-10 top-34 h-52 w-52 rounded-full border border-blue-400/15" />
          <div className="absolute bottom-20 left-12 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10">
                <Building2 className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="font-bold tracking-wide text-white">KDC FixFlow</p>
                <p className="text-xs text-slate-400">Kuppam Degree College</p>
              </div>
            </div>

            <div className="mt-28">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Campus Ecosystem
              </div>
              <h1 className="max-w-md text-5xl font-bold leading-tight tracking-tight text-white">
                A smarter campus.
                <span className="mt-2 block text-gradient">A faster response.</span>
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-slate-400">
                Report campus issues, track maintenance progress and help build a safer, better learning environment.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            {admin ? 'Secure administrator access' : 'A connected campus maintenance platform'}
          </div>
        </section>

        <section className="flex min-h-[600px] items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <p className="text-sm font-bold text-white">KDC <span className="text-cyan-300">FixFlow</span></p>
              <p className="mt-1 text-xs text-slate-500">Kuppam Degree College</p>
            </div>

            <div className="mb-8">
              <p className="section-label mb-3">{admin ? 'Administration' : 'Welcome to KDC FixFlow'}</p>
              <h2 className="text-3xl font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
            </div>

            {children}
          </div>
        </section>
      </motion.div>
    </main>
  )
}
