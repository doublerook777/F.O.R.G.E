// components/RiskGauge.jsx — Animated SVG Risk Score Gauge
// Reads from Zustand (updated at threshold intervals, not every tick).

import { useEffect, useRef } from 'react'

function getRiskClass(score) {
  if (score >= 85) return { color: '#dc2626', label: 'CRITICAL', cls: 'risk-critical' }
  if (score >= 70) return { color: '#ef4444', label: 'HIGH',     cls: 'risk-high'     }
  if (score >= 40) return { color: '#f59e0b', label: 'MEDIUM',   cls: 'risk-medium'   }
  return               { color: '#10b981', label: 'NORMAL',   cls: 'risk-low'      }
}

export default function RiskGauge({ score = 0, machineId }) {
  const prevScoreRef = useRef(score)
  const { color, label, cls } = getRiskClass(score)

  // SVG arc parameters
  const r           = 52
  const circumf     = 2 * Math.PI * r
  const arcLength   = circumf * 0.75          // 270° arc
  const dashOffset  = arcLength * (1 - score / 100)

  const isCritical = score >= 85

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Pulse ring for critical state */}
        {isCritical && (
          <div
            className="absolute inset-0 rounded-full animate-pulse-ring"
            style={{ border: `2px solid ${color}`, opacity: 0.5 }}
          />
        )}

        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background arc */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumf}`}
            strokeDashoffset={-circumf * 0.125}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
          />
          {/* Filled arc (animated) */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumf}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
            style={{
              transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease',
              filter: isCritical ? `drop-shadow(0 0 6px ${color})` : 'none',
            }}
          />
          {/* Score text */}
          <text
            x="70" y="66"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize="22"
            fontWeight="700"
            fontFamily="'JetBrains Mono', monospace"
            style={{ transition: 'fill 0.4s ease' }}
          >
            {Math.round(score)}%
          </text>
          {/* Label text */}
          <text
            x="70" y="86"
            textAnchor="middle"
            fill="#64748b"
            fontSize="9"
            fontFamily="'Inter', sans-serif"
            letterSpacing="2"
          >
            RISK SCORE
          </text>
        </svg>
      </div>

      {/* Status badge */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest font-mono border ${cls}`}
        style={{
          background: `${color}18`,
          borderColor: `${color}40`,
          color,
          animation: isCritical ? 'blink 1.2s ease-in-out infinite' : 'none',
        }}
      >
        {label}
      </div>
    </div>
  )
}
