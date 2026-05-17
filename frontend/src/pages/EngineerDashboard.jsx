// pages/EngineerDashboard.jsx — Primary Engineer View
// Full-featured: 3D Digital Twin + Live Metrics + Risk Gauge + Alert Log + Fault Controls

import { useEffect, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import useAlertStore from '../state/alertStore'
import { useSSEStream } from '../hooks/useSSEStream'
import { machinesAPI } from '../services/api'

import Scene from '../canvas/Scene'
import MachineCard from '../components/MachineCard'
import RiskGauge from '../components/RiskGauge'
import AIAlertLog from '../components/AIAlertLog'
import ControlPanel from '../components/ControlPanel'
import ProfileMenu from '../components/ProfileMenu'
import { Activity } from 'lucide-react'

// ── Connection status indicator ──────────────────────────────────────────────
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

// ── Machine tab selector ─────────────────────────────────────────────────────
function MachineTab({ machine, isActive, onClick }) {
  return (
    <button
      id={`machine-tab-${machine.machine_id}`}
      onClick={onClick}
      className={`flex flex-col px-4 py-2.5 rounded-xl border transition-all duration-200 text-left
        ${isActive
          ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
          : 'border-slate-700/40 bg-slate-800/20 text-slate-500 hover:border-slate-600 hover:text-slate-300'
        }`}
    >
      <span className="text-xs font-bold font-mono tracking-wider">
        {machine.name}
      </span>
      <span className="text-xs font-mono opacity-60">{machine.location}</span>
    </button>
  )
}

// ── Stream consumer sub-component (so hook runs per active machine) ──────────
function MachineStreamConsumer({ machineId, machineType }) {
  const { dataRef } = useSSEStream(machineId)
  const riskScore   = useTelemetryStore((s) => s.riskScores[machineId] || 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up">
      {/* Left: 3D Digital Twin */}
      <div
        className="lg:col-span-1 glass rounded-2xl overflow-hidden relative"
        style={{ minHeight: 300 }}
      >
        <div className="absolute top-3 left-3 z-10 glass px-2 py-1 rounded-lg">
          <span className="text-xs font-mono text-slate-400">DIGITAL TWIN</span>
        </div>
        <div className="absolute top-3 right-3 z-10">
          <StatusDot machineId={machineId} />
        </div>
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
            Loading 3D engine...
          </div>
        }>
          <Scene dataRef={dataRef} machineType={machineType} />
        </Suspense>
      </div>

      {/* Center: Metrics + Risk */}
      <div className="flex flex-col gap-4">
        {/* Risk gauge */}
        <div className="glass rounded-2xl p-4 flex flex-col items-center gap-2">
          <span className="text-xs font-mono font-bold tracking-widest text-slate-400">
            ML RISK ASSESSMENT
          </span>
          <RiskGauge score={riskScore} machineId={machineId} />
        </div>

        {/* Live metric cards */}
        <MachineCard dataRef={dataRef} machineId={machineId} />
      </div>

      {/* Right: Alert log + Controls */}
      <div className="flex flex-col gap-4">
        <AIAlertLog machineId={machineId} />
        <ControlPanel machineId={machineId} />
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function EngineerDashboard() {
  const navigate        = useNavigate()
  const { user, logout, token } = useAuthStore()
  const activeMachineId = useTelemetryStore((s) => s.activeMachineId)
  const setActiveMachine = useTelemetryStore((s) => s.setActiveMachine)
  const machines         = useTelemetryStore((s) => s.machines)
  const setMachines      = useTelemetryStore((s) => s.setMachines)
  const setFaultTypes    = useTelemetryStore((s) => s.setFaultTypes)
  const unreadCount      = useAlertStore((s) => s.unreadCount)

  // Auth guard
  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  // Load machines and fault types on mount
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [mRes, fRes] = await Promise.all([
          machinesAPI.list(),
          machinesAPI.faults(),
        ])
        setMachines(mRes.data)
        setFaultTypes(fRes.data)
        if (mRes.data.length > 0) setActiveMachine(mRes.data[0].machine_id)
      } catch (e) {
        console.error('Failed to load machine metadata:', e)
      }
    }
    loadMeta()
  }, [setMachines, setFaultTypes, setActiveMachine])

  const activeMachine = machines.find((m) => m.machine_id === activeMachineId)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Top Navigation Bar ──────────────────────────────────────── */}
      <header className="glass border-b border-slate-800/60 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0e7490)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">F.O.R.G.E</h1>
              <p className="text-xs font-mono text-slate-600" style={{ fontSize: 9 }}>
                ENGINEER DASHBOARD
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 pl-6 border-l border-slate-800/60">
            <button onClick={() => navigate('/components')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">COMPONENTS</button>
            <button onClick={() => navigate('/engineer')} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs font-bold border border-blue-500/20">ENGINEER</button>
            <button onClick={() => navigate('/operator')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">OPERATOR</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Alert badge */}
          {unreadCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-blink" />
              <span className="text-xs font-bold text-red-400 font-mono">{unreadCount} ALERT{unreadCount !== 1 ? 'S' : ''}</span>
            </div>
          )}

          {/* User info & Machine Status */}
          <ProfileMenu />
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="flex-1 p-6 flex flex-col gap-5">
        {/* Machine selector tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-500 tracking-widest">MACHINES:</span>
          {machines.map((m) => (
            <MachineTab
              key={m.machine_id}
              machine={m}
              isActive={m.machine_id === activeMachineId}
              onClick={() => setActiveMachine(m.machine_id)}
            />
          ))}
          {machines.length === 0 && (
            <span className="text-xs font-mono text-slate-600 animate-pulse">
              Connecting to backend...
            </span>
          )}
        </div>

        {/* Active machine stream */}
        {activeMachineId && (
          <MachineStreamConsumer
            key={activeMachineId}
            machineId={activeMachineId}
            machineType={activeMachine?.type || 'cnc_mill'}
          />
        )}
      </main>

      {/* ── Status Footer ───────────────────────────────────────────── */}
      <footer className="px-6 py-2 border-t border-slate-800/40 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-700">
          F.O.R.G.E v1.0 · Phase 1 · SQLite WAL · Isolation Forest
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-700">SSE @ 10 Hz</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </footer>
    </div>
  )
}
