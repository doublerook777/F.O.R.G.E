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
import Header from '../components/Header'

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
      <div className="flex items-center gap-6 w-full">
        <div className="shrink-0">
          <RiskGauge score={riskScore} machineId={machineId} />
        </div>
        <div className="flex-1">
          <MachineCard dataRef={dataRef} machineId={machineId} />
        </div>
      </div>
    </div>
  )
}

export default function OperatorDashboard() {
  const navigate    = useNavigate()
  const { token } = useAuthStore()
  const machines    = useTelemetryStore((s) => s.machines)
  const setMachines = useTelemetryStore((s) => s.setMachines)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  useEffect(() => {
    machinesAPI.list().then((r) => setMachines(r.data)).catch(() => {})
  }, [setMachines])

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-1 p-3 flex flex-col min-h-0">
        <div className="max-w-[1800px] mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 h-full">
          <div className="lg:col-span-2 flex flex-col gap-3 h-full overflow-y-auto min-h-0 pr-1">
            {machines.map((m) => (
              <div key={m.machine_id} className="shrink-0">
                <OperatorMachinePanel machineId={m.machine_id} />
              </div>
            ))}
            {machines.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center text-slate-600 font-mono text-sm shrink-0">
                Connecting to FORGE backend...
              </div>
            )}
          </div>
          <div className="lg:col-span-1 flex flex-col h-full min-h-0">
            <AIAlertLog />
          </div>
        </div>
      </main>
    </div>
  )
}
