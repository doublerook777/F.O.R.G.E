// components/TelemetryChart.jsx — Real-time Time-Series Telemetry (Recharts)
// Displays last 30 seconds of data for a single machine.

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

/**
 * TelemetryChart — 2D line chart of telemetry metrics
 * 
 * @param {Array} data - Array of { timestamp, rpm, temperature, vibration, current }
 * @param {number} width - Chart width in pixels (optional, uses ResponsiveContainer by default)
 * @param {number} height - Chart height in pixels (default: 300)
 */
export default function TelemetryChart({ data = [], height = 300 }) {
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

  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs font-bold tracking-widest text-cyan-400 font-mono mb-3">
        📊 TELEMETRY HISTORY (30s)
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
          <Line
            type="monotone"
            dataKey="rpm"
            stroke="#3b82f6"
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
          />
          
          {/* Temperature line */}
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#f59e0b"
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
          />
          
          {/* Vibration line */}
          <Line
            type="monotone"
            dataKey="vibration"
            stroke="#14b8a6"
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
          />
          
          {/* Current line */}
          <Line
            type="monotone"
            dataKey="current"
            stroke="#a855f7"
            dot={false}
            isAnimationActive={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
