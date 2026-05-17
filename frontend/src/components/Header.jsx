// components/Header.jsx — F.O.R.G.E App Header
// Logo, user info, connection status indicator, logout.

import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import ProfileMenu from '../components/ProfileMenu'
import { Activity } from 'lucide-react'

export default function Header() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Count connected machines
  const connectedCount = Object.values(connectionStatus).filter((s) => s === 'connected').length

  return (
    <header
      className="sticky top-0 z-50 glass-bright border-b"
      style={{ borderColor: 'rgba(99, 179, 237, 0.12)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center glow-blue"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0e7490 100%)' }}
          >
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white">
              F.O.R.G.E
            </h1>
            <p className="text-xs font-mono text-slate-500 -mt-1">
              Predictive Maintenance
            </p>
          </div>
        </div>

        {/* Connection Status & User Info */}
        <div className="flex items-center gap-6">
          {/* Connection indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/60">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connectedCount > 0 ? '#10b981' : '#ef4444',
                boxShadow: connectedCount > 0 ? '0 0 6px #10b981' : '0 0 6px #ef4444',
              }}
            />
            <span className="text-xs font-mono text-slate-400">
              {connectedCount} stream{connectedCount !== 1 ? 's' : ''} live
            </span>
          </div>

          {/* User Menu */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
