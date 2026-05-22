// components/AIAlertLog.jsx — Scrolling AI Diagnosis Alert Feed

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAlertStore from '../state/alertStore'
import useTelemetryStore from '../state/telemetryStore'
import useAuthStore from '../state/authStore'
import { alertsAPI, machinesAPI } from '../services/api'

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function severityConfig(severity) {
  switch (severity) {
    case 'critical':
      return {
        colorClass: 'risk-critical',
        bgClass: 'risk-bg-critical',
        borderClass: 'risk-critical',
        icon: '🔴',
        label: 'CRITICAL',
        color: '#ee675c',
      };
    case 'warning':
      return {
        colorClass: 'risk-medium',
        bgClass: 'risk-bg-medium',
        borderClass: 'risk-medium',
        icon: '🟡',
        label: 'WARNING',
        color: '#fdd663',
      };
    default:
      return {
        colorClass: 'risk-low',
        bgClass: 'risk-bg-low',
        borderClass: 'risk-low',
        icon: '🔵',
        label: 'INFO',
        color: '#81c995',
      };
  }
}

function AlertItem({ alert }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [repairState, setRepairState] = useState('idle')
  const cfg  = severityConfig(alert.severity)
  const diag = alert.diagnosis_json ? (
    typeof alert.diagnosis_json === 'string'
      ? JSON.parse(alert.diagnosis_json)
      : alert.diagnosis_json
  ) : null

  const handleResolve = async (e) => {
    e.stopPropagation() // Prevent card click event bubbling
    if (repairState !== 'idle') return
    setRepairState('busy')
    try {
      await machinesAPI.clearFault(alert.machine_id)
      setRepairState('success')
      // Immediately notify Zustand store to reset risk scores and trigger UI chart flushing
      useTelemetryStore.getState().clearFaultSuccess(alert.machine_id)
      setTimeout(() => setRepairState('idle'), 4000)
    } catch (err) {
      console.error("Auto-repair failed:", err)
      setRepairState('idle')
    }
  }

  const handleCardClick = () => {
    if (alert.machine_id) {
      useTelemetryStore.getState().setActiveMachine(alert.machine_id)
      if (user?.role === 'operator') {
        navigate(`/components/${alert.machine_id}`)
      } else {
        navigate('/engineer')
      }
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-xl p-3 border flex flex-col gap-1.5 animate-slide-in cursor-pointer hover:brightness-110 hover:translate-y-[-1px] transition-all duration-200 glass ${cfg.bgClass}`}
      style={{ borderLeft: `3px solid var(--${cfg.borderClass})` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{cfg.icon}</span>
          <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: `var(--${cfg.colorClass})` }}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-mono text-[#9aa0a6] bg-white/5 px-1.5 py-0.5 rounded">
            {alert.machine_id}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: `var(--${cfg.colorClass})`, backgroundColor: `var(--${cfg.bgClass})` }}>
            {Math.round(alert.risk_score)}%
          </span>
          <span className="text-[10px] text-slate-500 font-mono tracking-wider">
            {formatTime(alert.timestamp)}
          </span>
        </div>
      </div>

      {/* Summary message */}
      <p className="text-[11px] text-[#e8eaed] leading-relaxed" style={{ color: `var(--${cfg.colorClass})` }}>
        {diag?.summary || alert.message}
      </p>

      {/* Recommended action */}
      {diag?.recommended_action && (
        <div className="mt-1 text-[11px] px-3 py-2 rounded-lg border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ background: `${cfg.color}08`, color: cfg.color }}>
          <div className="flex-1">
            <span className="font-bold opacity-80 mr-2">ACTION:</span>
            {diag.recommended_action}
          </div>
          <button
            onClick={handleResolve}
            disabled={repairState === 'busy'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all duration-200 border cursor-pointer select-none shrink-0 ${
              repairState === 'busy'
                ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                : repairState === 'success'
                ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 active:scale-95'
            }`}
          >
            {repairState === 'busy' && '⚡ REPAIRING...'}
            {repairState === 'success' && '✅ OPERATIONAL!'}
            {repairState === 'idle' && '🔧 AUTO-REPAIR'}
          </button>
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
      } catch {
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
      } catch {
        // ignore errors
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [machineId, setAlerts])

  const filteredAlerts = machineId
    ? alerts.filter((a) => a.machine_id === machineId)
    : alerts

  return (
    <div className="glass rounded-2xl flex flex-col flex-1 min-h-[150px] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <h3 className="text-[12px] font-bold tracking-wider text-[#8ab4f8] flex items-center gap-2">
          <span className="text-sm">🤖</span> AI Diagnostic Log
        </h3>
        <span className="text-[10px] font-medium text-[#9aa0a6] bg-white/5 px-2.5 py-1 rounded-full">
          {filteredAlerts.length} event{filteredAlerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-xs text-[#9aa0a6]">All systems nominal</p>
            <p className="text-xs text-[#80868b]">Alerts appear here when Risk Score ≥ 85%</p>
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
