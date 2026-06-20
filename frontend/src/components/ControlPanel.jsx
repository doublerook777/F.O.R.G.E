// components/ControlPanel.jsx — Fault Injection Control Panel

import { useState, useEffect } from 'react'
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
  const setFaultTypes = useTelemetryStore((s) => s.setFaultTypes)
  const [loading, setLoading]     = useState(null)
  const [activeMsg, setActiveMsg] = useState(null)
  const [error, setError]         = useState(null)

  useEffect(() => {
    if (faultTypes.length === 0) {
      machinesAPI.faults().then((res) => setFaultTypes(res.data)).catch(console.error)
    }
  }, [faultTypes.length, setFaultTypes])

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
    } catch {
      setError('Failed to clear fault.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3c4043] pb-2.5">
        <h3 className="text-[11px] font-bold tracking-wider text-[#ee675c] uppercase flex items-center gap-1.5">
          <span>⚠</span> FAULT INJECTION CONTROL
        </h3>
        <button
          id="clear-fault-btn"
          onClick={handleClear}
          disabled={loading === '__clear__'}
          className="ripple text-[10px] px-3 py-1.5 rounded-xl font-bold transition-all duration-200 cursor-pointer disabled:opacity-40
                     bg-[rgba(137,180,248,0.08)] border border-[rgba(138,180,248,0.2)] text-[#8ab4f8] hover:bg-[rgba(138,180,248,0.15)]"
        >
          {loading === '__clear__' ? 'CLEARING...' : '✕ CLEAR FAULT'}
        </button>
      </div>

      {/* Feedback banners */}
      {activeMsg && (
        <div className="text-[11px] px-3.5 py-2.5 rounded-xl bg-[rgba(253,214,99,0.08)] border border-[rgba(253,214,99,0.25)] text-[#fdd663] animate-fade-up leading-relaxed">
          {activeMsg}
        </div>
      )}
      {error && (
        <div className="text-[11px] px-3.5 py-2.5 rounded-xl bg-[rgba(238,103,92,0.08)] border border-[rgba(238,103,92,0.25)] text-[#ee675c] leading-relaxed">
          {error}
        </div>
      )}

      {/* Fault buttons */}
      <div className="grid grid-cols-1 gap-2">
        {faultTypes.map((fault) => {
          const Icon = FAULT_ICONS[fault.name] || Wrench
          const isInjecting = loading === fault.name
          return (
            <button
              key={fault.name}
              id={`inject-${fault.name}-btn`}
              onClick={() => handleInject(fault.name)}
              disabled={!!loading}
              className="ripple flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer disabled:opacity-40 group
                         bg-[#202124] border border-[#3c4043] hover:bg-[#3c4043] hover:border-[rgba(238,103,92,0.3)]"
            >
              <span className="flex items-center justify-center p-2 rounded-xl bg-[#303134] text-[#9aa0a6] group-hover:text-[#e8eaed] transition-colors">
                <Icon size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold tracking-wide transition-colors ${
                  isInjecting ? 'text-[#ee675c]' : 'text-[#e8eaed] group-hover:text-[#ee675c]'
                }`}>
                  {isInjecting ? 'INJECTING FAULT...' : fault.label.toUpperCase()}
                </div>
                <div className="text-[10px] text-[#9aa0a6] mt-0.5">{fault.duration_s}s active duration</div>
              </div>
              <span className="text-[#ee675c] opacity-0 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all text-xs">
                ▶
              </span>
            </button>
          )
        })}

        {faultTypes.length === 0 && (
          <div className="text-xs text-[#9aa0a6] text-center py-6 animate-pulse">
            Retrieving safety profiles...
          </div>
        )}
      </div>
    </div>
  )
}
