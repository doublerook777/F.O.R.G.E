// pages/OperatorDashboard.jsx — Simplified Operator View
// Basic view: connection status, risk score per machine, alert log only.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import { useSSEStream } from '../hooks/useSSEStream'
import { machinesAPI } from '../services/api'
import RiskGauge from '../components/RiskGauge'
import AIAlertLog from '../components/AIAlertLog'
import MachineCard from '../components/MachineCard'
import ProfileMenu from '../components/ProfileMenu'
import { Activity } from 'lucide-react'

function OperatorMachinePanel({ machineId }) {
  const { dataRef } = useSSEStream(machineId)
  const riskScore   = useTelemetryStore((s) => s.riskScores[machineId] || 0)
  const status      = useTelemetryStore((s) => s.connectionStatus[machineId] || 'disconnected')

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold font-mono text-slate-300 uppercase">
          {machineId.replace('_', ' ')}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full"
            style={{
              background: status === 'connected' ? '#10b981' : '#475569',
              boxShadow: status === 'connected' ? '0 0 6px #10b981' : 'none',
            }}
          />
          <span className="text-xs font-mono text-slate-500">
            {status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <RiskGauge score={riskScore} machineId={machineId} />
        <MachineCard dataRef={dataRef} machineId={machineId} />
      </div>
    </div>
  )
}

export default function OperatorDashboard() {
  const navigate    = useNavigate()
  const { user, logout, token } = useAuthStore()
  const machines    = useTelemetryStore((s) => s.machines)
  const setMachines = useTelemetryStore((s) => s.setMachines)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    machinesAPI.list().then((r) => setMachines(r.data)).catch(() => {})
  }, [setMachines])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass border-b border-slate-800/60 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #0e7490)' }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">F.O.R.G.E</h1>
              <p className="text-xs font-mono text-slate-600" style={{ fontSize: 9 }}>OPERATOR VIEW</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 pl-6 border-l border-slate-800/60">
            <button onClick={() => navigate('/components')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">COMPONENTS</button>
            <button onClick={() => navigate('/engineer')} className="px-3 py-1.5 rounded-lg text-slate-400 font-mono text-xs hover:bg-slate-800/50 hover:text-slate-200 transition-colors">ENGINEER</button>
            <button onClick={() => navigate('/operator')} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs font-bold border border-blue-500/20">OPERATOR</button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ProfileMenu />
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {machines.map((m) => (
            <OperatorMachinePanel key={m.machine_id} machineId={m.machine_id} />
          ))}
          {machines.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-slate-600 font-mono text-sm">
              Connecting to FORGE backend...
            </div>
          )}
        </div>
        <div>
          <AIAlertLog />
        </div>
      </main>
    </div>
  )
}
