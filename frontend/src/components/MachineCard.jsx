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
    color: '#8ab4f8',
  },
  temperature: {
    label: 'TEMPERATURE',
    unit: '°C',
    icon: Thermometer,
    decimals: 1,
    color: '#fdd663',
  },
  vibration: {
    label: 'VIBRATION',
    unit: 'g',
    icon: Activity,
    decimals: 3,
    color: '#81c995',
  },
  current: {
    label: 'CURRENT DRAW',
    unit: 'A',
    icon: Zap,
    decimals: 2,
    color: '#c58af9',
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
      className="rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all duration-200 hover:shadow-lg glass ripple"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid var(--color-${sensorKey})` }}
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
            {cfg.label}
          </span>
          <span className="flex items-center justify-center p-1.5 rounded-lg" style={{ background: `${cfg.color}15` }}>
            <Icon size={14} color={cfg.color} />
          </span>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5">
          <span
            ref={valRef}
            className="font-sans font-bold tracking-tight"
            style={{ fontSize: '1.75rem', color: 'var(--text-primary)', lineHeight: 1 }}
          >
            0
          </span>
          <span className="text-[11px] font-medium" style={{ color: '#9aa0a6' }}>
            {cfg.unit}
          </span>
        </div>
      </div>

      {/* Activity bar */}
      <div className="h-1 rounded-full mt-4" style={{ background: `${cfg.color}15` }}>
        <div
          ref={barRef}
          className="h-full rounded-full transition-none"
          style={{ width: '0%', background: `var(--color-${sensorKey})` }}
        />
      </div>
    </div>
  )
}

export default function MachineCard({ dataRef }) {
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
