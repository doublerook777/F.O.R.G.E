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
import TweakPanel from '../components/TweakPanel'
import Header from '../components/Header'
import TweekToast from '../components/TweekToast'
import TelemetryChart from '../components/TelemetryChart'
import { ArrowLeft } from 'lucide-react'

// ── Connection status indicator
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

function SimulationView({ machine }) {
  const { dataRef } = useSSEStream(machine.machine_id)
  const riskScore   = useTelemetryStore((s) => s.riskScores[machine.machine_id] || 0)
  const lastCleared = useTelemetryStore((s) => s.lastClearedAt[machine.machine_id])
  const [historyData, setHistoryData] = useState([])

  // Immediately flush chart history and telemetry ref risk metrics on repair or machine transition
  useEffect(() => {
    setHistoryData([])
    if (dataRef.current) {
      dataRef.current.risk_score = 0.0
    }
  }, [lastCleared, machine.machine_id, dataRef])

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 animate-fade-up flex-1 min-h-0 h-full">
      {/* Left: Massive 3D Digital Twin & Telemetry Chart */}
      <div className="lg:col-span-2 flex flex-col gap-3 h-full min-h-0">
        <div
          className="flex-1 glass rounded-2xl overflow-hidden relative shadow-md flex flex-col border min-h-[250px]"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div 
            className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-xl border shadow-sm select-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            <span className="text-[9px] font-bold text-[#e8eaed] tracking-wider uppercase">{machine.name} — Digital Twin</span>
          </div>
          <div 
            className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-xl border shadow-sm select-none"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            <StatusDot machineId={machine.machine_id} />
          </div>
          <Suspense fallback={
            <div className="h-full flex items-center justify-center text-[#9aa0a6] text-xs animate-pulse">
              Loading Physics Engine & 3D Assets...
            </div>
          }>
            <Scene dataRef={dataRef} machineType={machine.type} />
          </Suspense>
        </div>

        {/* Historical Time-Series Chart */}
        <div className="shrink-0">
          <TelemetryChart data={historyData} height={180} />
        </div>
      </div>

      {/* Center: Live Metrics, Risk & Controls */}
      <div className="lg:col-span-1 flex flex-col gap-3 h-full overflow-y-auto min-h-0 pr-1">
        <div 
          className="glass rounded-2xl p-4 flex flex-col items-center gap-3 shrink-0 shadow-md border"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <span 
            className="text-[9px] font-bold tracking-wider text-[#9aa0a6] uppercase px-2.5 py-1 rounded-full border"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            ML RISK ASSESSMENT
          </span>
          <RiskGauge score={riskScore} machineId={machine.machine_id} />
        </div>
        <div className="shrink-0">
          <MachineCard dataRef={dataRef} machineId={machine.machine_id} />
        </div>
        <div className="shrink-0 mt-1">
          <TweakPanel machineId={machine.machine_id} />
        </div>
        <div className="shrink-0 mt-1">
          <ControlPanel machineId={machine.machine_id} />
        </div>
      </div>

      {/* Right: AI Alert Log */}
      <div className="lg:col-span-1 flex flex-col h-full min-h-0">
        <AIAlertLog machineId={machine.machine_id} />
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
    }
  }, [machines.length, setMachines])

  const machine = machines.find((m) => m.machine_id === id)

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      {/* Main Content */}
      <main className="flex-1 p-3 flex flex-col min-h-0">
        <div className="max-w-[1800px] mx-auto w-full flex flex-col h-full gap-3">
          <button 
            onClick={() => navigate('/components')}
            className="flex items-center gap-2 text-[#9aa0a6] hover:text-[#8ab4f8] text-[10px] font-bold tracking-wider uppercase transition-colors group w-max shrink-0 cursor-pointer select-none"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Fleet
          </button>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[#9aa0a6] text-xs animate-pulse">
              Loading component data...
            </div>
          ) : !machine ? (
            <div className="flex-1 flex items-center justify-center text-red-400 font-mono">
              Component not found.
            </div>
          ) : (
            <>
              <SimulationView machine={machine} />
              <TweekToast machineId={machine.machine_id} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
