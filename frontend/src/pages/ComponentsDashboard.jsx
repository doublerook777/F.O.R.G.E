import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import { machinesAPI } from '../services/api'
import ProfileMenu from '../components/ProfileMenu'
import { Activity, Server, ArrowRight } from 'lucide-react'

// Connection status dot
function StatusDot({ machineId }) {
  const status = useTelemetryStore((s) => s.connectionStatus[machineId] || 'disconnected')
  const configs = {
    connected:    { color: '#10b981', label: 'LIVE',         blink: true  },
    connecting:   { color: '#f59e0b', label: 'CONNECTING..', blink: false },
    error:        { color: '#ef4444', label: 'CONN ERROR',   blink: true  },
    disconnected: { color: '#475569', label: 'OFFLINE',      blink: false },
  }
  const cfg = configs[status] || configs.disconnected
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.color}`,
          animation: cfg.blink ? 'blink 1.4s ease-in-out infinite' : 'none',
        }}
      />
      <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}

export default function ComponentsDashboard() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const machines = useTelemetryStore((s) => s.machines)
  const setMachines = useTelemetryStore((s) => s.setMachines)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const mRes = await machinesAPI.list()
        setMachines(mRes.data)
      } catch (e) {
        console.error('Failed to load machine metadata:', e)
      }
    }
    loadMeta()
  }, [setMachines])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass border-b border-slate-800/60 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0e7490)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">F.O.R.G.E</h1>
              <p className="text-xs font-mono text-slate-600" style={{ fontSize: 9 }}>FLEET DASHBOARD</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 pl-6 border-l border-slate-800/60">
            <button onClick={() => navigate('/components')} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs font-bold border border-blue-500/20">COMPONENTS</button>
            <button onClick={() => navigate('/engineer')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">ENGINEER</button>
            <button onClick={() => navigate('/operator')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">OPERATOR</button>
          </nav>
        </div>
        <ProfileMenu />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">Component Fleet</h2>
            <p className="text-sm font-mono text-slate-400 mt-1">Select a component to view its real-time 3D simulation and active telemetry.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((m) => (
              <div 
                key={m.machine_id}
                onClick={() => navigate(`/components/${m.machine_id}`)}
                className="glass rounded-2xl p-6 cursor-pointer hover:border-blue-500/40 hover:bg-slate-800/40 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Server size={64} />
                </div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-lg font-bold text-slate-200 font-mono">{m.name}</h3>
                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md mt-2 inline-block">
                      {m.type.toUpperCase()}
                    </span>
                  </div>
                  <StatusDot machineId={m.machine_id} />
                </div>
                
                <div className="space-y-2 mb-6 relative z-10">
                  <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                    <span className="text-slate-500 font-mono">LOCATION</span>
                    <span className="text-slate-300 font-mono">{m.location}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                    <span className="text-slate-500 font-mono">ID</span>
                    <span className="text-slate-300 font-mono">{m.machine_id}</span>
                  </div>
                </div>

                <div className="flex items-center text-sm font-bold text-blue-400 group-hover:text-blue-300 transition-colors relative z-10">
                  VIEW SIMULATION <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
          
          {machines.length === 0 && (
            <div className="text-center py-20 text-slate-500 font-mono animate-pulse">
              Loading fleet components...
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
