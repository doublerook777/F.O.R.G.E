// components/RiskGauge.jsx — Animated SVG Risk Score Gauge
// Reads from Zustand (updated at threshold intervals, not every tick).

// No react imports needed

function getRiskClass(score) {
  if (score >= 85) return { color: '#ee675c', label: 'CRITICAL', cls: 'risk-critical' }
  if (score >= 70) return { color: '#f28b82', label: 'HIGH',     cls: 'risk-high'     }
  if (score >= 40) return { color: '#fdd663', label: 'MEDIUM',   cls: 'risk-medium'   }
  return               { color: '#81c995', label: 'NORMAL',   cls: 'risk-low'      }
}

export default function RiskGauge({ score = 0 }) {
  const { color, label, cls } = getRiskClass(score)

  // SVG arc parameters
  const r           = 52
  const circumf     = 2 * Math.PI * r
  const arcLength   = circumf * 0.75          // 270° arc

  // Align start points perfectly by utilizing identical constant base offset
  const baseOffset  = -circumf * 0.125
  const activeLength = arcLength * (score / 100)

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
            stroke="#3c4043"
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumf}`}
            strokeDashoffset={baseOffset}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
          />
          {/* Filled arc (animated) */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke={score === 0 ? 'transparent' : color}
            strokeWidth="10"
            strokeDasharray={`${activeLength} ${circumf}`}
            strokeDashoffset={baseOffset}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
            style={{
              transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease',
              filter: isCritical ? `drop-shadow(0 0 8px ${color}44)` : 'none',
              opacity: score === 0 ? 0 : 1,
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
            fontFamily="'Inter', 'Roboto', sans-serif"
            style={{ transition: 'fill 0.4s ease' }}
          >
            {Math.round(score)}%
          </text>
          {/* Label text */}
          <text
            x="70" y="86"
            textAnchor="middle"
            fill="#9aa0a6"
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
        className={`px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wider border ${cls}`}
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
