// components/ProfileMenu.jsx — User Profile Dropdown Menu

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
  const statusColor = isAnyError ? '#ee675c' : '#81c995'

  return (
    <div className="relative font-sans" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={variant === 'logo' ? "focus:outline-none hover:scale-105 transition-transform" : "flex items-center gap-2 p-1 rounded-full hover:bg-[#303134] transition-all border border-transparent hover:border-[#3c4043] relative cursor-pointer"}
      >
        {variant === 'avatar' ? (
          <>
            <div className="w-8 h-8 rounded-full bg-[#3c4043] border border-[#5f6368] flex items-center justify-center text-[#e8eaed]">
              <User size={16} />
            </div>
            {/* Status Dot */}
            <div 
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#202124]"
              style={{ background: statusColor }}
            />
          </>
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md bg-[#3c4043]">
            <Settings className="w-4 h-4 text-[#e8eaed]" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${variant === 'logo' ? 'left-0' : 'right-0'} top-full mt-2 w-80 bg-[#303134] rounded-2xl border border-[#3c4043] shadow-2xl overflow-hidden z-50 flex flex-col`}>
          {/* Header - Hero Section */}
          <div className="p-4">
            <div className="bg-[#202124] rounded-xl flex flex-col items-center justify-center py-6 px-4 border border-[#3c4043] shadow-inner">
              <div className="w-14 h-14 rounded-full bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.25)] flex items-center justify-center text-[#8ab4f8] mb-2.5 shadow-sm">
                <User size={28} />
              </div>
              <span className="text-base font-bold text-[#e8eaed] tracking-wide">{user?.username || 'Operator'}</span>
              <span className="text-[9px] font-mono text-[#81c995] uppercase mt-1 tracking-widest font-bold bg-[rgba(129,201,149,0.08)] border border-[rgba(129,201,149,0.2)] px-2 py-0.5 rounded-md">
                {user?.role || 'OPERATOR'}
              </span>
            </div>
          </div>
          
          <div className="w-full h-px bg-[#3c4043]" />

          {/* Machine Statuses */}
          <div className="p-4 flex flex-col">
            <div className="text-[10px] font-bold text-[#9aa0a6] uppercase mb-2.5 tracking-wider ml-1">
              Active Fleet Nodes
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {machines.map(m => {
                const status = connectionStatus[m.machine_id] || 'disconnected'
                const isOk = status === 'connected'
                const color = isOk ? '#81c995' : (status === 'error' ? '#ee675c' : '#fdd663')
                
                return (
                  <button key={m.machine_id} className="ripple w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-[#3c4043] text-left transition-all group cursor-pointer">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}35` }}>
                       <Server size={11} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#e8eaed] truncate block">{m.name}</span>
                      <span className="text-[9px] text-[#9aa0a6] uppercase tracking-wider block mt-0.5">{status}</span>
                    </div>
                  </button>
                )
              })}
              {machines.length === 0 && (
                 <div className="text-xs text-[#9aa0a6] py-2 ml-1 flex items-center gap-2">
                   <ShieldAlert size={12} /> No active connections
                 </div>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-[#3c4043]" />

          {/* Footer Actions */}
          <div className="p-2 flex flex-col gap-0.5">
             <button className="ripple w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#3c4043] text-left transition-all cursor-pointer">
                <Settings size={14} className="text-[#9aa0a6]" />
                <span className="text-xs text-[#e8eaed]">Preferences</span>
             </button>
             <button
              onClick={() => { logout(); navigate('/login') }}
              className="ripple w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#3c4043] text-left transition-all group cursor-pointer"
             >
                <LogOut size={14} className="text-[#9aa0a6] group-hover:text-[#ee675c] transition-colors" />
                <span className="text-xs text-[#e8eaed] group-hover:text-[#ee675c] transition-colors">Sign out</span>
             </button>
          </div>
        </div>
      )}
    </div>
  )
}

