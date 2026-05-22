// pages/EngineerDashboard.jsx — Primary Engineer View
// Full-featured: 3D Digital Twin + Live Metrics + Risk Gauge + Alert Log + Fault Controls

import { useState, useEffect, Suspense } from 'react'
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
import TweakPanel from '../components/TweakPanel'
import TweekToast from '../components/TweekToast'
import Header from '../components/Header'
import TelemetryChart from '../components/TelemetryChart'

// ── Connection status indicator ──────────────────────────────────────────────
function StatusDot({ machineId }) {
  const status = useTelemetryStore((s) => s.connectionStatus[machineId] || 'disconnected')
  const configs = {
    connected:    { color: '#81c995', label: 'LIVE',         blink: true  },
    connecting:   { color: '#fdd663', label: 'CONNECTING..', blink: false },
    error:        { color: '#ee675c', label: 'CONN ERROR',   blink: true  },
    disconnected: { color: '#9aa0a6', label: 'OFFLINE',      blink: false },
  }
  const cfg = configs[status] || configs.disconnected
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: cfg.color,
          animation: cfg.blink ? 'blink 1.4s ease-in-out infinite' : 'none',
        }}
      />
      <span className="text-[10px] font-bold tracking-wider" style={{ color: cfg.color }}>
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
      className={`ripple flex flex-col px-4 py-2 rounded-xl border transition-all duration-200 text-left cursor-pointer
        ${isActive
          ? 'bg-[rgba(138,180,248,0.08)] text-[#8ab4f8] border-[rgba(138,180,248,0.25)] shadow-sm'
          : 'bg-[#202124] text-[#9aa0a6] border-transparent hover:bg-[#3c4043] hover:text-[#e8eaed]'
        }`}
    >
      <span className="text-xs font-bold tracking-wide">
        {machine.name}
      </span>
      <span className="text-[10px] font-medium opacity-70 mt-0.5">{machine.location.replace('—', '—')}</span>
    </button>
  )
}

// ── Stream consumer sub-component (so hook runs per active machine) ──────────
function MachineStreamConsumer({ machineId, machineType }) {
  const { dataRef } = useSSEStream(machineId)
  const riskScore   = useTelemetryStore((s) => s.riskScores[machineId] || 0)
  const lastCleared = useTelemetryStore((s) => s.lastClearedAt[machineId])
  const [historyData, setHistoryData] = useState([])

  // Immediately flush chart history and telemetry ref risk metrics on repair or machine transition
  useEffect(() => {
    setHistoryData([])
    if (dataRef.current) {
      dataRef.current.risk_score = 0.0
    }
  }, [lastCleared, machineId, dataRef])

  useEffect(() => {
    // 1 Hz Throttled Sampler to push data from dataRef to the Recharts history list
    const interval = setInterval(() => {
      const cur = dataRef.current
      if (!cur || cur.timestamp === null) return

      const formatTime = (ts) => {
        if (!ts) return ''
        const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
        return date.toLocaleTimeString('en-US', {
          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
      }

      const newSample = {
        timestamp: formatTime(cur.timestamp),
        rpm: Math.round(cur.rpm),
        temperature: Number(cur.temperature.toFixed(1)),
        vibration: Number(cur.vibration.toFixed(3)),
        current: Number(cur.current.toFixed(2)),
      }

      setHistoryData((prev) => {
        const updated = [...prev, newSample]
        if (updated.length > 30) {
          return updated.slice(updated.length - 30)
        }
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [dataRef])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-fade-up flex-1 min-h-0">
      {/* Left: 3D Digital Twin & Telemetry Chart */}
      <div className="lg:col-span-1 flex flex-col gap-3 h-full min-h-0">
        <div
          className="flex-1 glass rounded-2xl overflow-hidden relative flex flex-col bg-[#303134] border border-[#3c4043] shadow-md min-h-[250px]"
        >
          <div className="absolute top-4 left-4 z-10 bg-[#202124] px-3.5 py-1.5 rounded-xl border border-[#3c4043] shadow-sm select-none">
            <span className="text-[9px] font-bold text-[#e8eaed] tracking-wider uppercase">Digital Twin Simulation</span>
          </div>
          <div className="absolute top-4 right-4 z-10 bg-[#202124] px-3.5 py-1.5 rounded-xl border border-[#3c4043] shadow-sm select-none">
            <StatusDot machineId={machineId} />
          </div>
          <Suspense fallback={
            <div className="h-full flex items-center justify-center text-[#9aa0a6] text-xs animate-pulse">
              Loading 3D Engine...
            </div>
          }>
            <Scene dataRef={dataRef} machineType={machineType} />
          </Suspense>
        </div>

        {/* Dynamic Telemetry Chart */}
        <div className="shrink-0">
          <TelemetryChart data={historyData} height={160} />
        </div>
      </div>

      {/* Center: Metrics + Controls */}
      <div className="flex flex-col gap-3 h-full overflow-y-auto min-h-0 pr-1">
        {/* Risk gauge */}
        <div className="glass bg-[#303134] border border-[#3c4043] rounded-2xl p-4 flex flex-col items-center gap-3 shrink-0 shadow-md">
          <span className="text-[9px] font-bold tracking-wider text-[#9aa0a6] uppercase bg-[#202124] px-2.5 py-1 rounded-full border border-[#3c4043]">
            ML RISK ASSESSMENT
          </span>
          <RiskGauge score={riskScore} machineId={machineId} />
        </div>

        {/* Live metric cards */}
        <div className="shrink-0">
          <MachineCard dataRef={dataRef} machineId={machineId} />
        </div>

        {/* Tweak Panel */}
        <div className="shrink-0 mt-1">
          <TweakPanel machineId={machineId} />
        </div>

        {/* Control Panel */}
        <div className="shrink-0 mt-1">
          <ControlPanel machineId={machineId} />
        </div>
      </div>

      {/* Right: Alert log */}
      <div className="flex flex-col h-full min-h-0">
        <AIAlertLog machineId={machineId} />
      </div>

      <TweekToast machineId={machineId} />
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function EngineerDashboard() {
  const navigate        = useNavigate()
  const { token } = useAuthStore()
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
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="flex-1 p-3 flex flex-col gap-3 max-w-[1800px] w-full mx-auto min-h-0">
        {/* Machine selector tabs */}
        <div className="flex items-center gap-4 flex-wrap bg-slate-900/30 p-3 rounded-2xl border border-slate-800/60 shadow-inner shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-500 tracking-widest ml-2">MACHINES:</span>
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
