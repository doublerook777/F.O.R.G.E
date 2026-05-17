import { useEffect, Suspense, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import { machinesAPI } from '../services/api'
import { useSSEStream } from '../hooks/useSSEStream'

import Scene from '../canvas/Scene'
import MachineCard from '../components/MachineCard'
import RiskGauge from '../components/RiskGauge'
import AIAlertLog from '../components/AIAlertLog'
import ControlPanel from '../components/ControlPanel'
import ProfileMenu from '../components/ProfileMenu'
import { Activity, ArrowLeft } from 'lucide-react'

// ── Connection status indicator
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
      <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}

function SimulationView({ machine }) {
  const { dataRef } = useSSEStream(machine.machine_id)
  const riskScore   = useTelemetryStore((s) => s.riskScores[machine.machine_id] || 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-up">
      {/* Left: Massive 3D Digital Twin (Takes up 2 columns) */}
      <div
        className="lg:col-span-2 glass rounded-2xl overflow-hidden relative shadow-2xl"
        style={{ minHeight: 500 }}
      >
        <div className="absolute top-4 left-4 z-10 glass px-3 py-1.5 rounded-lg border border-slate-700/50">
          <span className="text-xs font-mono font-bold text-slate-300">{machine.name} — DIGITAL TWIN</span>
        </div>
        <div className="absolute top-4 right-4 z-10 glass px-3 py-1.5 rounded-lg border border-slate-700/50">
          <StatusDot machineId={machine.machine_id} />
        </div>
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm animate-pulse">
            Loading Physics Engine & 3D Assets...
          </div>
        }>
          <Scene dataRef={dataRef} machineType={machine.type} />
        </Suspense>
      </div>

      {/* Center: Live Metrics & Risk */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
          <span className="text-xs font-mono font-bold tracking-widest text-slate-400">
            ML RISK ASSESSMENT
          </span>
          <RiskGauge score={riskScore} machineId={machine.machine_id} />
        </div>
        <MachineCard dataRef={dataRef} machineId={machine.machine_id} />
      </div>

      {/* Right: AI Alert Log & Controls */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <AIAlertLog machineId={machine.machine_id} />
        <ControlPanel machineId={machine.machine_id} />
      </div>
    </div>
  )
}

export default function ComponentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const machines = useTelemetryStore((s) => s.machines)
  const setMachines = useTelemetryStore((s) => s.setMachines)
  const [loading, setLoading] = useState(machines.length === 0)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    if (machines.length === 0) {
      const loadMeta = async () => {
        try {
          const mRes = await machinesAPI.list()
          setMachines(mRes.data)
        } catch (e) {
          console.error('Failed to load machine metadata:', e)
        } finally {
          setLoading(false)
        }
      }
      loadMeta()
    } else {
      setLoading(false)
    }
  }, [machines.length, setMachines])

  const machine = machines.find((m) => m.machine_id === id)

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
              <p className="text-xs font-mono text-slate-600" style={{ fontSize: 9 }}>SIMULATION VIEW</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 pl-6 border-l border-slate-800/60">
            <button onClick={() => navigate('/components')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">COMPONENTS</button>
            <button onClick={() => navigate('/engineer')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">ENGINEER</button>
            <button onClick={() => navigate('/operator')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">OPERATOR</button>
          </nav>
        </div>
        <ProfileMenu />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          <button 
            onClick={() => navigate('/components')}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-400 text-sm font-mono font-bold mb-6 transition-colors group w-max"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            BACK TO FLEET
          </button>

          {loading ? (
            <div className="text-center py-20 text-slate-500 font-mono animate-pulse">
              Loading component data...
            </div>
          ) : !machine ? (
            <div className="text-center py-20 text-red-400 font-mono">
              Component not found.
            </div>
          ) : (
            <SimulationView machine={machine} />
          )}
        </div>
      </main>
    </div>
  )
}
