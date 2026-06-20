import { useEffect, useState, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import useAlertStore from '../state/alertStore'
import useTelemetryStore from '../state/telemetryStore'

export default function TweekToast({ machineId }) {
  const alerts = useAlertStore((s) => s.alerts)
  const currentRisk = useTelemetryStore((s) => s.riskScores[machineId] || 0)
  const [activeTweek, setActiveTweek] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const criticalAlerts = alerts.filter(
      a => a.machine_id === machineId && a.risk_score > 85
    )
    
    if (criticalAlerts.length > 0 && currentRisk > 85) {
      const latest = criticalAlerts[0]
      const getId = (a) => a.id || a._localId
      
      // If we haven't shown this exact alert yet
      if (!activeTweek || getId(activeTweek) !== getId(latest)) {
        setActiveTweek(latest)
        setIsVisible(true)
        
        // Auto-hide after 10 seconds
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setIsVisible(false)
        }, 10000)
      }
    } else {
      setIsVisible(false)
    }
  }, [alerts, machineId, currentRisk, activeTweek])

  const handleClose = () => {
    setIsVisible(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  if (!activeTweek) return null

  // Parse the Gemini diagnosis if available
  const diag = activeTweek.diagnosis_json ? (
    typeof activeTweek.diagnosis_json === 'string'
      ? JSON.parse(activeTweek.diagnosis_json)
      : activeTweek.diagnosis_json
  ) : null

  return (
    <div
      className={`fixed top-24 right-6 z-50 w-96 max-w-[90vw] transition-all duration-500 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="glass-bright bg-[#303134] border border-[#3c4043] border-l-4 border-l-[#ee675c] rounded-2xl p-4 shadow-xl relative overflow-hidden select-none">
        {/* Subtle warning tint background */}
        <div className="absolute inset-0 bg-[rgba(238,103,92,0.03)] pointer-events-none" />
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 text-[#9aa0a6] hover:text-[#e8eaed] transition-colors z-20 p-1.5 cursor-pointer hover:bg-[#3c4043] rounded-full"
        >
          <X size={15} />
        </button>

        <div className="flex items-start gap-3.5 relative z-10">
          <div className="mt-0.5 p-2 bg-[rgba(238,103,92,0.08)] rounded-xl border border-[rgba(238,103,92,0.2)]">
            <AlertTriangle size={20} className="text-[#ee675c]" />
          </div>
          
          <div className="flex-1 pr-4">
            <h3 className="text-[#ee675c] font-bold tracking-wider text-[9px] uppercase mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ee675c] animate-pulse" />
              SYSTEM ANOMALY DIAGNOSIS
            </h3>
            
            <h4 className="text-[#e8eaed] font-bold text-[13px] mb-1.5 leading-snug">
              {diag?.fault_label || activeTweek.message}
            </h4>
            
            <p className="text-[#9aa0a6] text-[11px] mb-3 leading-relaxed">
              {diag?.summary || 'Machine is in a critical state.'}
            </p>
            
            {diag?.recommended_action && (
              <div className="bg-[rgba(238,103,92,0.08)] border border-[rgba(238,103,92,0.25)] rounded-xl p-2.5">
                <span className="block text-[9px] font-bold text-[#ee675c] mb-1 tracking-wider">RECOMMENDED MITIGATION</span>
                <span className="text-[11px] text-[#e8eaed] leading-relaxed">{diag.recommended_action}</span>
              </div>
            )}
            
            <div className="mt-3.5 flex items-center justify-between text-[10px] text-[#9aa0a6] font-mono">
              <span className="font-bold">Risk Level: {Math.round(activeTweek.risk_score)}%</span>
              <span>{new Date(activeTweek.timestamp * 1000).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
