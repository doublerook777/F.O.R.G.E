// pages/Admin.jsx — Admin Control Panel (Stub)

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import ProfileMenu from '../components/ProfileMenu'
import { Activity, Wrench } from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const { user, logout, token } = useAuthStore()

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
    if (user?.role !== 'admin') navigate('/operator', { replace: true })
  }, [token, user, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass border-b border-slate-800/60 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0e7490)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">F.O.R.G.E ADMIN</h1>
              <p className="text-xs font-mono text-slate-600">System Configuration</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 pl-6 border-l border-slate-800/60">
            <button onClick={() => navigate('/components')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">COMPONENTS</button>
            <button onClick={() => navigate('/engineer')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">ENGINEER</button>
            <button onClick={() => navigate('/operator')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">OPERATOR</button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ProfileMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-2xl text-center">
          <div className="flex justify-center mb-4 text-slate-400">
            <Wrench size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Admin Panel</h2>
          <p className="text-slate-400 font-mono text-sm mb-6">
            System configuration and user management coming in Phase 2.
          </p>
          <button
            onClick={() => navigate('/engineer')}
            className="px-6 py-2 rounded-lg text-sm font-bold font-mono
                       border border-blue-500/50 text-blue-400
                       hover:bg-blue-500/10 transition-all"
          >
            BACK TO DASHBOARD →
          </button>
        </div>
      </main>
    </div>
  )
}
