import { useState, useRef, useEffect } from 'react'
import { User, Server, LogOut, ShieldAlert, Settings } from 'lucide-react'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import { useNavigate } from 'react-router-dom'

export default function ProfileMenu({ variant = 'avatar' }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  const machines = useTelemetryStore((s) => s.machines)
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus)

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Determine overall system health
  const isAnyError = machines.some(m => connectionStatus[m.machine_id] === 'error' || connectionStatus[m.machine_id] === 'disconnected')
  const statusColor = isAnyError ? '#ef4444' : '#10b981'

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={variant === 'logo' ? "focus:outline-none hover:scale-105 transition-transform" : "flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700 relative"}
      >
        {variant === 'avatar' ? (
          <>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User size={18} />
            </div>
            {/* Status Badge */}
            <div 
              className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-slate-900"
              style={{ background: statusColor }}
            />
          </>
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0e7490)' }}>
            <Settings className="w-5 h-5 text-white" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${variant === 'logo' ? 'left-0' : 'right-0'} top-full mt-2 w-80 bg-[#2b2d31] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden z-50 flex flex-col font-sans`}>
          {/* Header - Hero Section */}
          <div className="p-4">
            <div className="bg-[#1e1f22] rounded-xl flex flex-col items-center justify-center py-6 px-4 shadow-inner">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center text-white mb-3 shadow-lg ring-2 ring-emerald-500/20">
                <User size={32} />
              </div>
              <span className="text-lg font-semibold text-slate-200 tracking-wide">{user?.username || 'User'}</span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase mt-1 tracking-widest">{user?.role || 'OPERATOR'}</span>
            </div>
          </div>
          
          <div className="w-full h-px bg-slate-700/50" />

          {/* Machine Statuses */}
          <div className="p-4 flex flex-col">
            <div className="text-xs font-bold text-slate-300 mb-3 ml-2 tracking-wide">
              System Statuses
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600">
              {machines.map(m => {
                const status = connectionStatus[m.machine_id] || 'disconnected'
                const isOk = status === 'connected'
                const color = isOk ? '#10b981' : (status === 'error' ? '#ef4444' : '#f59e0b')
                
                return (
                  <button key={m.machine_id} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-700/40 text-left transition-colors group">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${color}22`, border: `1px solid ${color}55` }}>
                       <Server size={12} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-300 truncate block">{m.name}</span>
                    </div>
                  </button>
                )
              })}
              {machines.length === 0 && (
                 <div className="text-sm text-slate-500 ml-2 flex items-center gap-2">
                   <ShieldAlert size={14} /> No machines connected
                 </div>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-slate-700/50" />

          {/* Footer Actions */}
          <div className="p-2 flex flex-col gap-1">
             <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-700/40 text-left transition-colors">
                <Settings size={16} className="text-slate-400" />
                <span className="text-sm text-slate-300">Manage preferences</span>
             </button>
             <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-700/40 text-left transition-colors group"
             >
                <LogOut size={16} className="text-slate-400 group-hover:text-red-400 transition-colors" />
                <span className="text-sm text-slate-300 group-hover:text-red-400 transition-colors">Logout</span>
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
