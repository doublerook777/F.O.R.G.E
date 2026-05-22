import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import { machinesAPI } from '../services/api'
import Header from '../components/Header'
import { Cpu, ArrowRight, ActivitySquare, ShieldCheck, AlertTriangle } from 'lucide-react'

// Connection status badge without raw neon glows, using Material pastels
function StatusBadge({ machineId }) {
  const status = useTelemetryStore((s) => s.connectionStatus[machineId] || 'disconnected')
  const configs = {
    connected:    { color: '#81c995', label: 'LIVE',         bg: 'rgba(129, 201, 149, 0.08)', border: 'rgba(129, 201, 149, 0.25)' },
    connecting:   { color: '#fdd663', label: 'CONNECTING..', bg: 'rgba(253, 214, 99, 0.08)',  border: 'rgba(253, 214, 99, 0.25)'  },
    error:        { color: '#ee675c', label: 'CONN ERROR',   bg: 'rgba(238, 103, 92, 0.08)',  border: 'rgba(238, 103, 92, 0.25)'  },
    disconnected: { color: '#9aa0a6', label: 'OFFLINE',      bg: 'rgba(154, 160, 166, 0.08)', border: 'rgba(154, 160, 166, 0.25)' },
  }
  const cfg = configs[status] || configs.disconnected
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border shadow-inner`} style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: cfg.color,
          animation: status === 'connected' || status === 'error' ? 'blink 1.4s ease-in-out infinite' : 'none',
        }}
      />
      <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}

function MachineCard({ m, onClick }) {
  const riskScore = useTelemetryStore((s) => s.riskScores[m.machine_id] || 0)
  
  // Severity assessment using Google pastel codes
  const isDanger   = riskScore >= 85
  const isHigh     = riskScore >= 70 && riskScore < 85
  const isMedium   = riskScore >= 40 && riskScore < 70
  
  const severityColor = isDanger ? '#ee675c' : (isHigh ? '#f28b82' : (isMedium ? '#fdd663' : '#81c995'))

  return (
    <div 
      onClick={onClick}
      className="ripple rounded-2xl p-6 cursor-pointer transition-all duration-300 group relative overflow-hidden flex flex-col h-full bg-[#303134] border border-[#3c4043] hover:border-[#8ab4f8]/50 hover:bg-[#3c4043] shadow-md hover:shadow-lg hover:-translate-y-0.5 select-none"
    >
      {/* Decorative Icon */}
      <div className="absolute top-4 right-4 opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-105 transition-all duration-300 text-[#e8eaed]">
        <Cpu size={120} strokeWidth={1} />
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6 relative z-10 gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#e8eaed] tracking-tight mb-2 group-hover:text-[#8ab4f8] transition-colors">{m.name}</h3>
          <span className="text-[9px] font-bold tracking-widest text-[#8ab4f8] bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.25)] px-2.5 py-1 rounded-md shadow-inner">
            {m.type.toUpperCase().replace('_', ' ')}
          </span>
        </div>
        <StatusBadge machineId={m.machine_id} />
      </div>
      
      {/* Meta info */}
      <div className="flex-1 space-y-3 mb-8 relative z-10 mt-2">
        <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[#202124] border border-[#3c4043]">
          <span className="text-[9px] font-bold text-[#9aa0a6] tracking-wider">LOCATION</span>
          <span className="text-xs font-bold text-[#e8eaed] flex items-center gap-2">
            <span className="w-1 h-3.5 rounded-full bg-[#5f6368]"></span>
            {m.location.replace('â€”', '—')}
          </span>
        </div>
        
        <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[#202124] border border-[#3c4043]">
          <span className="text-[9px] font-bold text-[#9aa0a6] tracking-wider">MACHINE ID</span>
          <span className="text-xs font-mono font-semibold text-[#9aa0a6]">{m.machine_id}</span>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="pt-4 border-t border-[#3c4043] flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          {isDanger || isHigh ? <AlertTriangle size={15} style={{ color: severityColor }} className={isDanger ? 'animate-pulse' : ''} /> : 
           isMedium ? <ActivitySquare size={15} style={{ color: severityColor }} /> : 
                      <ShieldCheck size={15} style={{ color: severityColor }} />}
          <span className="text-xs font-bold tracking-wide" style={{ color: severityColor }}>
            RISK: {riskScore.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center text-xs font-bold tracking-wider text-[#8ab4f8] group-hover:text-[#8ab4f8]/80 transition-colors">
          SIMULATE <ArrowRight size={13} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
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
    <div className="h-screen overflow-hidden flex flex-col relative" style={{ background: 'var(--bg-primary)' }}>
      {/* Global animated ambient background */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[rgba(138,180,248,0.03)] rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[rgba(129,201,149,0.03)] rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      <Header />

      {/* Main Content */}
      <main className="flex-1 p-8 relative z-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-10 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.25)] mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-pulse" />
              <span className="text-[9px] font-bold text-[#8ab4f8] tracking-wider uppercase">LIVE FLEET MONITORING</span>
            </div>
            <h2 className="text-3xl font-black text-[#e8eaed] tracking-tight mb-3">Active Machine Fleet</h2>
            <p className="text-[#9aa0a6] max-w-2xl text-sm leading-relaxed font-medium">
              Select a machine component below to initialize its real-time 3D digital twin. 
              The system actively monitors telemetry and applies isolated anomaly detection to localized parts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {machines.map((m, index) => (
              <div 
                key={m.machine_id} 
                className="animate-fade-up" 
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <MachineCard m={m} onClick={() => navigate(`/components/${m.machine_id}`)} />
              </div>
            ))}
          </div>
          
          {machines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
              <div className="w-12 h-12 border-4 border-[rgba(138,180,248,0.15)] border-t-[#8ab4f8] rounded-full animate-spin mb-6" />
              <div className="text-[#8ab4f8] font-bold tracking-wider text-xs uppercase">
                INITIALIZING FLEET CONNECTIVITY...
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
