// components/ControlPanel.jsx — Fault Injection Control Panel

import { useState } from 'react'
import { machinesAPI } from '../services/api'
import useTelemetryStore from '../state/telemetryStore'

import { Nut, Flame, Settings, Zap, Droplet, Wrench } from 'lucide-react'

const FAULT_ICONS = {
  bearing_failure:   Nut,
  thermal_runaway:   Flame,
  spindle_unbalance: Settings,
  electrical_surge:  Zap,
  coolant_loss:      Droplet,
}

export default function ControlPanel({ machineId }) {
  const faultTypes   = useTelemetryStore((s) => s.faultTypes)
  const [loading, setLoading]     = useState(null)
  const [activeMsg, setActiveMsg] = useState(null)
  const [error, setError]         = useState(null)

  const handleInject = async (faultName) => {
    setLoading(faultName)
    setError(null)
    setActiveMsg(null)
    try {
      const res = await machinesAPI.injectFault(machineId, faultName)
      setActiveMsg(res.data.message)
      setTimeout(() => setActiveMsg(null), 4000)
    } catch (e) {
      setError(e.response?.data?.error || 'Injection failed.')
    } finally {
      setLoading(null)
    }
  }

  const handleClear = async () => {
    setLoading('__clear__')
    setError(null)
    try {
      await machinesAPI.clearFault(machineId)
      setActiveMsg('Fault cleared — returning to normal operation.')
      setTimeout(() => setActiveMsg(null), 3000)
    } catch (e) {
      setError('Failed to clear fault.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-cyan-400 font-mono">
          ⚠ FAULT INJECTION
        </h3>
        <button
          id="clear-fault-btn"
          onClick={handleClear}
          disabled={loading === '__clear__'}
          className="text-xs px-3 py-1 rounded-lg font-mono font-bold
                     border border-slate-600 text-slate-400
                     hover:border-cyan-500 hover:text-cyan-400
                     transition-all duration-200 disabled:opacity-40"
        >
          {loading === '__clear__' ? '...' : '✕ CLEAR'}
        </button>
      </div>

      {/* Feedback banner */}
      {activeMsg && (
        <div className="text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono animate-fade-up">
          {activeMsg}
        </div>
      )}
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Fault buttons */}
      <div className="grid grid-cols-1 gap-2">
        {faultTypes.map((fault) => {
          const Icon = FAULT_ICONS[fault.name] || Wrench
          return (
            <button
              key={fault.name}
              id={`inject-${fault.name}-btn`}
              onClick={() => handleInject(fault.name)}
              disabled={!!loading}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                         border border-slate-700/60 bg-slate-800/30
                         hover:border-red-500/40 hover:bg-red-500/8
                         transition-all duration-200 group disabled:opacity-40"
            >
              <span className="flex items-center justify-center">
                <Icon size={20} className="text-slate-300" />
              </span>
              <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-200 font-mono truncate">
                {loading === fault.name ? 'INJECTING...' : fault.label.toUpperCase()}
              </div>
              <div className="text-xs text-slate-500 truncate">{fault.duration_s}s duration</div>
            </div>
            <span className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
              ▶
            </span>
          </button>
          )
        })}

        {faultTypes.length === 0 && (
          <div className="text-xs text-slate-500 font-mono text-center py-4">
            Loading fault types...
          </div>
        )}
      </div>
    </div>
  )
}
