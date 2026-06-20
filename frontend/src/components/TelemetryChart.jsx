// components/TelemetryChart.jsx — Real-time Time-Series Telemetry (Recharts)
// Displays last 30 seconds of data for a single machine.

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

/**
 * TelemetryChart — 2D line chart of telemetry metrics
 * 
 * @param {Array} data - Array of { timestamp, rpm, temperature, vibration, current }
 * @param {number} width - Chart width in pixels (optional, uses ResponsiveContainer by default)
 * @param {number} height - Chart height in pixels (default: 300)
 */
export default function TelemetryChart({ data = [], height = 300 }) {
  const [selectedMetric, setSelectedMetric] = useState('ALL')

  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <div
        className="glass rounded-xl p-6 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center text-slate-500 text-sm font-mono">
          <p>◦ Waiting for telemetry data...</p>
        </div>
      </div>
    )
  }

  const METRICS = [
    { id: 'ALL', label: 'ALL', colorVar: 'var(--accent-blue)' },
    { id: 'rpm', label: 'RPM', colorVar: 'var(--color-rpm)' },
    { id: 'temperature', label: 'TEMP', colorVar: 'var(--color-temperature)' },
    { id: 'vibration', label: 'VIB', colorVar: 'var(--color-vibration)' },
    { id: 'current', label: 'CURR', colorVar: 'var(--color-current)' }
  ]

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
        <div className="text-[10px] font-bold tracking-widest text-cyan-400 font-mono flex items-center gap-1.5 uppercase select-none">
          <span>📊</span> Telemetry History (30s)
        </div>
        
        {/* Glassmorphic Pill Selection Menu */}
        <div className="flex flex-wrap gap-1 p-0.5 bg-[rgba(0,0,0,0.18)] rounded-xl border border-[rgba(255,255,255,0.06)] w-max">
          {METRICS.map(m => {
            const active = selectedMetric === m.id
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id)}
                className={`ripple px-3 py-1 rounded-lg text-[9px] font-bold font-mono tracking-wider transition-all duration-200 cursor-pointer uppercase select-none ${
                  active 
                    ? 'bg-[rgba(255,255,255,0.05)] shadow-sm'
                    : 'text-[#9aa0a6] hover:text-[#e8eaed] bg-transparent border-transparent'
                }`}
                style={{
                  color: active ? m.colorVar : undefined,
                  border: active ? `1px solid ${m.colorVar}` : '1px solid transparent',
                  boxShadow: active ? '0 0 6px currentColor' : undefined
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.12)" />
          <XAxis
            dataKey="timestamp"
            stroke="#64748b"
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: '#64748b' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: '#64748b' }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(13, 20, 32, 0.95)',
              border: '1px solid rgba(99, 179, 237, 0.35)',
              borderRadius: '8px',
              padding: '8px',
            }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#e2e8f0', fontSize: '0.75rem' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px', fontSize: '0.75rem' }}
            iconType="line"
          />
          
          {/* RPM line */}
          {(selectedMetric === 'ALL' || selectedMetric === 'rpm') && (
            <Line
              type="monotone"
              dataKey="rpm"
              stroke="var(--color-rpm)"
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
              name="RPM (rpm)"
            />
          )}
          
          {/* Temperature line */}
          {(selectedMetric === 'ALL' || selectedMetric === 'temperature') && (
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="var(--color-temperature)"
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
              name="Temperature (°C)"
            />
          )}
          
          {/* Vibration line */}
          {(selectedMetric === 'ALL' || selectedMetric === 'vibration') && (
            <Line
              type="monotone"
              dataKey="vibration"
              stroke="var(--color-vibration)"
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
              name="Vibration (mm/s)"
            />
          )}
          
          {/* Current line */}
          {(selectedMetric === 'ALL' || selectedMetric === 'current') && (
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--color-current)"
              dot={false}
              isAnimationActive={false}
              strokeWidth={2}
              name="Current (A)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

