// components/MachineCard.jsx — Live Metric Card
// Reads from dataRef via polling interval (requestAnimationFrame-based).
// Updates DOM directly to avoid React re-renders for high-frequency data.

import { useEffect, useRef } from 'react'
import { Settings, Thermometer, Activity, Zap } from 'lucide-react'

const METRIC_CONFIGS = {
  rpm: {
    label: 'SPINDLE RPM',
    unit: 'RPM',
    icon: Settings,
    decimals: 0,
    color: '#3b82f6',
  },
  temperature: {
    label: 'TEMPERATURE',
    unit: '°C',
    icon: Thermometer,
    decimals: 1,
    color: '#f59e0b',
  },
  vibration: {
    label: 'VIBRATION',
    unit: 'g',
    icon: Activity,
    decimals: 3,
    color: '#14b8a6',
  },
  current: {
    label: 'CURRENT DRAW',
    unit: 'A',
    icon: Zap,
    decimals: 2,
    color: '#a855f7',
  },
}

function MetricDisplay({ sensorKey, dataRef }) {
  const cfg     = METRIC_CONFIGS[sensorKey]
  const valRef  = useRef(null)
  const barRef  = useRef(null)
  const rafRef  = useRef(null)

  useEffect(() => {
    // RAF loop: reads from dataRef and writes directly to DOM (no React state)
    const tick = () => {
      const val = dataRef?.current?.[sensorKey] ?? 0
      if (valRef.current) {
        valRef.current.textContent = val.toFixed(cfg.decimals)
      }
      // Animate bar width (normalized per sensor)
      if (barRef.current) {
        const pct = Math.min(100, Math.max(0,
          sensorKey === 'rpm'         ? ((val - 2800) / 800) * 100 :
          sensorKey === 'temperature' ? ((val - 50)   / 45) * 100  :
          sensorKey === 'vibration'   ? (val / 4.5)   * 100        :
          sensorKey === 'current'     ? ((val - 7)    / 13) * 100  : 0
        ))
        barRef.current.style.width = `${pct}%`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [sensorKey, dataRef, cfg.decimals])

  const Icon = cfg.icon;

  return (
    <div
      className="glass rounded-xl p-4 flex flex-col gap-2"
      style={{ borderColor: `${cfg.color}22` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest font-mono" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="text-base flex items-center justify-center">
          <Icon size={18} color={cfg.color} />
        </span>
      </div>

      {/* Value */}
      <div className="flex items-end gap-1">
        <span
          ref={valRef}
          className="font-mono font-bold leading-none"
          style={{ fontSize: '1.75rem', color: cfg.color }}
        >
          0
        </span>
        <span className="text-xs font-mono mb-1" style={{ color: `${cfg.color}88` }}>
          {cfg.unit}
        </span>
      </div>

      {/* Activity bar */}
      <div className="h-1.5 rounded-full" style={{ background: `${cfg.color}18` }}>
        <div
          ref={barRef}
          className="h-full rounded-full transition-none"
          style={{ width: '0%', background: cfg.color, transition: 'width 0.1s linear' }}
        />
      </div>
    </div>
  )
}

export default function MachineCard({ dataRef, machineName, machineId }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {Object.keys(METRIC_CONFIGS).map((key) => (
          <MetricDisplay key={key} sensorKey={key} dataRef={dataRef} />
        ))}
      </div>
    </div>
  )
}
