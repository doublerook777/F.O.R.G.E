// components/AIAlertLog.jsx — Scrolling AI Diagnosis Alert Feed

import { useEffect, useRef } from 'react'
import useAlertStore from '../state/alertStore'
import { alertsAPI } from '../services/api'

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function severityConfig(severity) {
  switch (severity) {
    case 'critical': return { color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  border: 'rgba(220,38,38,0.3)', icon: '🔴', label: 'CRITICAL' }
    case 'warning':  return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '🟡', label: 'WARNING'  }
    default:         return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: '🔵', label: 'INFO'     }
  }
}

function AlertItem({ alert }) {
  const cfg  = severityConfig(alert.severity)
  const diag = alert.diagnosis_json ? (
    typeof alert.diagnosis_json === 'string'
      ? JSON.parse(alert.diagnosis_json)
      : alert.diagnosis_json
  ) : null

  return (
    <div
      className="rounded-lg p-3 border flex flex-col gap-1.5 animate-slide-in"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{cfg.icon}</span>
          <span className="text-xs font-bold font-mono tracking-wider" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-xs font-mono text-slate-500">
            [{alert.machine_id}]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>
            {Math.round(alert.risk_score)}%
          </span>
          <span className="text-xs text-slate-600 font-mono">
            {formatTime(alert.timestamp)}
          </span>
        </div>
      </div>

      {/* Summary message */}
      <p className="text-xs text-slate-300 leading-relaxed">
        {diag?.summary || alert.message}
      </p>

      {/* Recommended action */}
      {diag?.recommended_action && (
        <div className="text-xs font-mono px-2 py-1 rounded" style={{ background: `${cfg.color}18`, color: cfg.color }}>
          ▶ {diag.recommended_action}
        </div>
      )}
    </div>
  )
}

export default function AIAlertLog({ machineId }) {
  const alerts        = useAlertStore((s) => s.alerts)
  const setAlerts     = useAlertStore((s) => s.setAlerts)
  const markAllRead   = useAlertStore((s) => s.markAllRead)
  const scrollRef     = useRef(null)

  // Load initial alerts from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await (machineId
          ? alertsAPI.machine(machineId)
          : alertsAPI.all())
        setAlerts(res.data)
      } catch (e) {
        // silently fail — alerts will appear from SSE triggers
      }
    }
    load()
    markAllRead()
  }, [machineId, setAlerts, markAllRead])

  // Poll for new alerts every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await (machineId
          ? alertsAPI.machine(machineId, 50)
          : alertsAPI.all(50))
        setAlerts(res.data)
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [machineId, setAlerts])

  const filteredAlerts = machineId
    ? alerts.filter((a) => a.machine_id === machineId)
    : alerts

  return (
    <div className="glass rounded-xl flex flex-col" style={{ maxHeight: 360 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
        <h3 className="text-xs font-bold tracking-widest text-cyan-400 font-mono">
          🤖 AI DIAGNOSTIC LOG
        </h3>
        <span className="text-xs font-mono text-slate-500">
          {filteredAlerts.length} event{filteredAlerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-xs text-slate-500 font-mono">All systems nominal</p>
            <p className="text-xs text-slate-600">Alerts appear here when Risk Score ≥ 85%</p>
          </div>
        ) : (
          filteredAlerts.map((alert, i) => (
            <AlertItem key={alert._localId || alert.id || i} alert={alert} />
          ))
        )}
      </div>
    </div>
  )
}
