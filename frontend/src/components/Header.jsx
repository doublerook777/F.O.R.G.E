// components/Header.jsx — F.O.R.G.E App Header
// Premium Google Material Design 3 Header with automated active route highlights,
// clean status indicators, and integrated profile and notifications.

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useTelemetryStore from '../state/telemetryStore'
import useAlertStore from '../state/alertStore'
import ProfileMenu from '../components/ProfileMenu'
import { Activity, Palette } from 'lucide-react'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus)
  const unreadCount = useAlertStore((s) => s.unreadCount)

  // Theme support
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('forge_theme') || 'cyber-industrial'
  })

  useEffect(() => {
    if (theme === 'cyber-industrial') {
      document.documentElement.classList.add('theme-cyber-industrial')
    } else {
      document.documentElement.classList.remove('theme-cyber-industrial')
    }
    localStorage.setItem('forge_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'cyber-industrial' ? 'material' : 'cyber-industrial'))
  }

  // Count active live connections
  const connectedCount = Object.values(connectionStatus).filter((s) => s === 'connected').length
  
  // Detect active path
  const currentPath = location.pathname
  const isComponents = currentPath.includes('/components')
  const isEngineer = currentPath.includes('/engineer')
  const isOperator = currentPath.includes('/operator')
  const isAdmin = currentPath.includes('/admin')

  return (
    <header className="sticky top-0 z-50 px-6 md:px-8 py-3.5 flex items-center justify-between shadow-md select-none border-b animate-scanlines" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-8">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #3870e0 0%, #1e4eb8 100%)' }}
          >
            <Activity className="w-5 h-5 text-[#e8eaed]" />
          </div>
          <div>
            <h1 className="text-[15px] font-black tracking-tight text-[#e8eaed] group-hover:text-[#8ab4f8] transition-colors leading-none">
              F.O.R.G.E
            </h1>
            <span className="text-[9px] font-semibold text-[#9aa0a6] tracking-wider uppercase block mt-1">
              Predictive Diagnostics
            </span>
          </div>
        </div>

        {/* Material Style Nav Bar */}
        <nav className="hidden md:flex items-center gap-1.5 pl-6 border-l border-[#3c4043]">
          <button
            onClick={() => navigate('/components')}
            className={`ripple px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              isComponents
                ? 'bg-[rgba(138,180,248,0.08)] text-[#8ab4f8] border border-[rgba(138,180,248,0.25)] shadow-sm'
                : 'text-[#9aa0a6] border border-transparent hover:bg-[#303134] hover:text-[#e8eaed]'
            }`}
          >
            COMPONENTS
          </button>
          
          <button
            onClick={() => navigate('/engineer')}
            className={`ripple px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              isEngineer
                ? 'bg-[rgba(138,180,248,0.08)] text-[#8ab4f8] border border-[rgba(138,180,248,0.25)] shadow-sm'
                : 'text-[#9aa0a6] border border-transparent hover:bg-[#303134] hover:text-[#e8eaed]'
            }`}
          >
            ENGINEER
          </button>

          <button
            onClick={() => navigate('/operator')}
            className={`ripple px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              isOperator
                ? 'bg-[rgba(138,180,248,0.08)] text-[#8ab4f8] border border-[rgba(138,180,248,0.25)] shadow-sm'
                : 'text-[#9aa0a6] border border-transparent hover:bg-[#303134] hover:text-[#e8eaed]'
            }`}
          >
            OPERATOR
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="ripple px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer bg-[rgba(197,138,249,0.08)] text-[#c58af9] border border-[rgba(197,138,249,0.25)] shadow-sm"
            >
              ADMIN
            </button>
          )}
        </nav>
      </div>

      {/* Status Indicators & Profile Actions */}
      <div className="flex items-center gap-4">
        {/* Stream Status Dot */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#303134] border border-[#3c4043] shadow-inner">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: connectedCount > 0 ? '#81c995' : '#ee675c',
              boxShadow: connectedCount > 0 ? '0 0 4px rgba(129,201,149,0.4)' : 'none',
            }}
          />
          <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-wider">
            {connectedCount} Live Stream{connectedCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Dynamic Alerts Pill */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(238,103,92,0.08)] border border-[rgba(238,103,92,0.25)] shadow-sm">
            <span className="w-1.5 h-1.5 bg-[#ee675c] rounded-full animate-blink" />
            <span className="text-[10px] font-bold text-[#ee675c] tracking-wider">
              {unreadCount} UNRESOLVED ALERT{unreadCount !== 1 ? 'S' : ''}
            </span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'cyber-industrial' ? 'Material Dark' : 'Cyber Industrial'} Theme`}
          className="ripple w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer shadow-md select-none bg-[#303134] border-[#3c4043] hover:border-[#8ab4f8]/50 hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#8ab4f8]"
        >
          <Palette className="w-5 h-5" />
        </button>

        {/* Profile Avatar Menu */}
        <ProfileMenu />
      </div>
    </header>
  )
}

