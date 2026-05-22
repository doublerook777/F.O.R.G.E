import { useState, useEffect } from 'react'
import { machinesAPI } from '../services/api'
import useTelemetryStore from '../state/telemetryStore'
import { Settings2, Save } from 'lucide-react'

export default function TweakPanel({ machineId }) {
  const machines = useTelemetryStore((s) => s.machines)
  const setMachines = useTelemetryStore((s) => s.setMachines)
  const machine = machines.find((m) => m.machine_id === machineId)

  const [tweaks, setTweaks] = useState({
    rpm: 0,
    temperature: 0,
    vibration: 0,
    current: 0
  })
  
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  // Initialize sliders with current baseline
  useEffect(() => {
    if (machine && machine.rpm) {
      setTweaks({
        rpm: machine.rpm.baseline,
        temperature: machine.temperature.baseline,
        vibration: machine.vibration.baseline,
        current: machine.current.baseline
      })
    }
  }, [machine])

  if (!machine || !machine.rpm) return null

  // Calculate dynamic boundaries for sliders
  const bounds = {
    rpm: { min: Math.max(0, machine.rpm.min - 1000), max: machine.rpm.max + 1000, step: 1 },
    temperature: { min: Math.max(0, machine.temperature.min - 20), max: machine.temperature.max + 50, step: 0.1 },
    vibration: { min: 0.01, max: machine.vibration.max + 2, step: 0.01 },
    current: { min: Math.max(0, machine.current.min - 5), max: machine.current.max + 20, step: 0.1 }
  }

  const handleChange = (key, val) => {
    setTweaks(prev => ({ ...prev, [key]: Number(val) }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await machinesAPI.tweakProfile(machineId, tweaks)
      setMsg("Overrides applied! Watch AI react.")
      setTimeout(() => setMsg(null), 3000)
      // Refetch machines
      const res = await machinesAPI.list()
      setMachines(res.data)
    } catch (e) {
      console.error("Failed to tweak", e)
      setMsg("Failed to apply overrides.")
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3c4043] pb-2.5">
        <h3 className="text-[11px] font-bold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-1.5">
          <Settings2 size={13} />
          MANUAL SENSOR OVERRIDE
        </h3>
        <button
          onClick={handleSave}
          disabled={loading}
          className="ripple text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-200 disabled:opacity-40
                     bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.25)] text-[#8ab4f8] hover:bg-[rgba(138,180,248,0.15)]"
        >
          <Save size={12} />
          {loading ? 'APPLYING...' : 'APPLY OVERRIDE'}
        </button>
      </div>

      {/* Message feedback */}
      {msg && (
        <div className="text-[11px] px-3.5 py-2.5 rounded-xl bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.25)] text-[#8ab4f8] animate-fade-up leading-relaxed">
          {msg}
        </div>
      )}

      {/* Sliders Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
        {Object.entries(tweaks).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
              <label className="text-[10px] uppercase font-bold text-[#9aa0a6] tracking-wider">
                {key}
              </label>
              <span className="text-[10px] font-mono text-[#e8eaed] font-bold bg-[#202124] px-2 py-0.5 rounded-lg border border-[#3c4043] shadow-inner">
                {value}
              </span>
            </div>
            <input
              type="range"
              min={bounds[key].min}
              max={bounds[key].max}
              step={bounds[key].step}
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full h-1.5 bg-[#202124] rounded-lg appearance-none cursor-pointer accent-[#8ab4f8] hover:accent-[#8ab4f8]/80 transition-all border border-[#3c4043]"
            />
            <div className="flex justify-between text-[9px] text-[#9aa0a6] font-mono mt-0.5">
              <span>{bounds[key].min}</span>
              <span>{bounds[key].max}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
