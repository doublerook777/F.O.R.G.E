// pages/Admin.jsx — Admin Control Panel
// Full-featured: Fleet Status + Live Machine Overrides + Fault Injection + ML Retraining

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../state/authStore'
import useTelemetryStore from '../state/telemetryStore'
import { machinesAPI } from '../services/api'
import Header from '../components/Header'
import { Wrench, Shield, Database, Activity, RefreshCw, Cpu, CheckCircle2, AlertTriangle, Play, Check } from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const machines = useTelemetryStore((s) => s.machines)
  const setMachines = useTelemetryStore((s) => s.setMachines)
  const faultTypes = useTelemetryStore((s) => s.faultTypes)
  const setFaultTypes = useTelemetryStore((s) => s.setFaultTypes)

  // Status and dynamic controls states
  const [machineStatuses, setMachineStatuses] = useState({}) // { machine_id: { ml_ready, fault } }
  const [tweaks, setTweaks] = useState({}) // { machine_id: { rpm, temperature, vibration, current } }
  const [selectedFaults, setSelectedFaults] = useState({}) // { machine_id: fault_name }
  const [actionStates, setActionStates] = useState({}) // { machine_id: { type: 'tweak' | 'inject' | 'clear' | 'retrain', state: 'idle' | 'busy' | 'success' } }
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Auth guard
  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
    if (user?.role !== 'admin') navigate('/operator', { replace: true })
  }, [token, user, navigate])

  // Load baseline machines & fault types
  const loadMeta = async () => {
    try {
      const [mRes, fRes] = await Promise.all([
        machinesAPI.list(),
        machinesAPI.faults(),
      ])
      setMachines(mRes.data)
      setFaultTypes(fRes.data)
      
      // Initialize tweaks from baseline values
      const initialTweaks = {}
      const initialFaults = {}
      mRes.data.forEach((m) => {
        initialTweaks[m.machine_id] = {
          rpm: m.rpm?.baseline || 0,
          temperature: m.temperature?.baseline || 0,
          vibration: m.vibration?.baseline || 0,
          current: m.current?.baseline || 0,
        }
        initialFaults[m.machine_id] = fRes.data[0]?.name || ''
      })
      setTweaks(initialTweaks)
      setSelectedFaults(initialFaults)
    } catch (e) {
      console.error('Failed to load baseline metadata:', e)
    }
  }

  // Poll active machine fault and ML readiness statuses
  const updateStatuses = async () => {
    if (machines.length === 0) return
    try {
      const statusPromises = machines.map((m) => 
        machinesAPI.status(m.machine_id).then((res) => ({
          machine_id: m.machine_id,
          ml_ready: res.data.ml_ready,
          fault: res.data.fault,
        }))
      )
      const results = await Promise.all(statusPromises)
      const statusMap = {}
      results.forEach((r) => {
        statusMap[r.machine_id] = {
          ml_ready: r.ml_ready,
          fault: r.fault,
        }
      })
      setMachineStatuses(statusMap)
    } catch (err) {
      console.error("Failed to fetch machine runtime statuses:", err)
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadMeta()
      setLoadingInitial(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (machines.length > 0) {
      updateStatuses()
      const interval = setInterval(updateStatuses, 4000)
      return () => clearInterval(interval)
    }
  }, [machines])

  // Handler helpers for actions
  const triggerAction = async (machineId, type, fn) => {
    setActionStates((prev) => ({
      ...prev,
      [machineId]: { type, state: 'busy' }
    }))
    try {
      await fn()
      setActionStates((prev) => ({
        ...prev,
        [machineId]: { type, state: 'success' }
      }))
      updateStatuses()
      setTimeout(() => {
        setActionStates((prev) => ({
          ...prev,
          [machineId]: null
        }))
      }, 3000)
    } catch (err) {
      console.error(`Action ${type} failed for ${machineId}:`, err)
      setActionStates((prev) => ({
        ...prev,
        [machineId]: null
      }))
    }
  }

  const handleTweakChange = (machineId, key, val) => {
    setTweaks((prev) => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [key]: val,
      }
    }))
  }

  const handleApplyTweaks = (machineId) => {
    const machineTweaks = tweaks[machineId]
    triggerAction(machineId, 'tweak', async () => {
      await machinesAPI.tweakProfile(machineId, machineTweaks)
    })
  }

  const handleInjectFault = (machineId) => {
    const fault = selectedFaults[machineId]
    if (!fault) return
    triggerAction(machineId, 'inject', async () => {
      await machinesAPI.injectFault(machineId, fault)
    })
  }

  const handleClearFault = (machineId) => {
    triggerAction(machineId, 'clear', async () => {
      await machinesAPI.clearFault(machineId)
    })
  }

  const handleRetrain = (machineId) => {
    triggerAction(machineId, 'retrain', async () => {
      await machinesAPI.retrain(machineId)
    })
  }

  // Compute overall stats
  const activeFaultsCount = Object.values(machineStatuses).filter(s => s.fault?.active).length
  const trainedModelsCount = Object.values(machineStatuses).filter(s => s.ml_ready).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-[1800px] w-full mx-auto flex flex-col gap-4 min-h-0">
        
        {/* Title Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8ab4f8]/10 flex items-center justify-center border border-[#8ab4f8]/20 shadow-md">
              <Shield className="text-[#8ab4f8] w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#e8eaed]">Admin Control Console</h1>
              <p className="text-[10px] text-[#9aa0a6] font-mono tracking-wider">SYSTEM CONFIGURATIONS & COMPONENT OVERRIDES</p>
            </div>
          </div>
          <button 
            onClick={updateStatuses}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 text-[10px] font-bold font-mono text-slate-300 hover:bg-white/10 active:scale-95 transition-all select-none cursor-pointer"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            REFRESH
          </button>
        </div>

        {/* Dashboard Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1 */}
          <div className="glass rounded-2xl p-4 border flex items-center justify-between bg-[#303134] shadow-md border-white/5 relative overflow-hidden">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">MONITORED SYSTEMS</span>
              <span className="text-3xl font-black font-mono text-[#e8eaed]">{machines.length}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
              <Activity className="text-[#81c995] w-6 h-6" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass rounded-2xl p-4 border flex items-center justify-between bg-[#303134] shadow-md border-white/5 relative overflow-hidden">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">ML MODELS READY</span>
              <span className="text-3xl font-black font-mono text-[#e8eaed]">
                {loadingInitial ? '...' : `${trainedModelsCount} / ${machines.length}`}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
              <Cpu className="text-[#8ab4f8] w-6 h-6 animate-pulse" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass rounded-2xl p-4 border flex items-center justify-between bg-[#303134] shadow-md border-white/5 relative overflow-hidden">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">ACTIVE FAULTS INJECTED</span>
              <span className={`text-3xl font-black font-mono ${activeFaultsCount > 0 ? 'text-[#ee675c]' : 'text-slate-500'}`}>
                {loadingInitial ? '...' : activeFaultsCount}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${activeFaultsCount > 0 ? 'bg-[#ee675c]/10 border-[#ee675c]/25 text-[#ee675c]' : 'bg-slate-800/60 border-slate-700/50 text-slate-500'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Machine Table Card */}
        <div className="glass rounded-2xl border border-white/5 bg-[#303134] shadow-md overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider text-[#8ab4f8] flex items-center gap-1.5">
              <Database size={14} /> FLEET OVERRIDES & FAULT SIMULATORS
            </h3>
            <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
              WAL database sync enabled
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingInitial ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse">
                Bootstrapping fleet variables...
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-900/10 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Component Details</th>
                    <th className="p-4">ML Engine</th>
                    <th className="p-4">Operational Status</th>
                    <th className="p-4 w-[280px]">Simulation Overrides</th>
                    <th className="p-4 text-right">Simulation Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => {
                    const status = machineStatuses[m.machine_id] || {}
                    const actState = actionStates[m.machine_id]
                    const currentTweaks = tweaks[m.machine_id] || {}

                    return (
                      <tr key={m.machine_id} className="border-b border-white/5 hover:bg-white/1 flex-row transition-colors">
                        {/* Name & Location */}
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-[#e8eaed]">{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{m.location}</span>
                            <span className="text-[9px] text-[#8ab4f8] font-mono uppercase bg-[#8ab4f8]/5 px-1.5 py-0.5 rounded w-max mt-1">
                              {m.type.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        {/* ML State */}
                        <td className="p-4">
                          {status.ml_ready ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#81c995] font-mono">
                              <CheckCircle2 size={12} /> CALIBRATED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#fdd663] font-mono animate-pulse">
                              <RefreshCw size={12} className="animate-spin-slow" /> RE-TRAINING...
                            </span>
                          )}
                        </td>

                        {/* Fault Status */}
                        <td className="p-4">
                          {status.fault?.active ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ee675c] font-mono bg-[#ee675c]/10 px-2 py-0.5 rounded-full border border-[#ee675c]/20 w-max">
                                ⚡ ANOMALY: {status.fault.label}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                                Elapsed: {Math.round(status.fault.elapsed_s)}s / {status.fault.duration_s}s
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 font-mono bg-slate-800/40 px-2 py-0.5 rounded-full border border-slate-700/30">
                              ● NOMINAL
                            </span>
                          )}
                        </td>

                        {/* Parameter Overrides */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 max-w-[280px]">
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="flex items-center justify-between bg-[#202124]/40 px-2 py-1 rounded border border-white/5">
                                <span className="text-[8px] font-mono text-slate-500">RPM:</span>
                                <input
                                  type="number"
                                  value={currentTweaks.rpm || 0}
                                  onChange={(e) => handleTweakChange(m.machine_id, 'rpm', e.target.value)}
                                  className="w-16 bg-transparent text-right font-mono text-[10px] text-[#e8eaed] focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-between bg-[#202124]/40 px-2 py-1 rounded border border-white/5">
                                <span className="text-[8px] font-mono text-slate-500">TEMP:</span>
                                <input
                                  type="number"
                                  value={currentTweaks.temperature || 0}
                                  onChange={(e) => handleTweakChange(m.machine_id, 'temperature', e.target.value)}
                                  className="w-16 bg-transparent text-right font-mono text-[10px] text-[#e8eaed] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="flex items-center justify-between bg-[#202124]/40 px-2 py-1 rounded border border-white/5">
                                <span className="text-[8px] font-mono text-slate-500">VIBE:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentTweaks.vibration || 0}
                                  onChange={(e) => handleTweakChange(m.machine_id, 'vibration', e.target.value)}
                                  className="w-16 bg-transparent text-right font-mono text-[10px] text-[#e8eaed] focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-between bg-[#202124]/40 px-2 py-1 rounded border border-white/5">
                                <span className="text-[8px] font-mono text-slate-500">CURR:</span>
                                <input
                                  type="number"
                                  value={currentTweaks.current || 0}
                                  onChange={(e) => handleTweakChange(m.machine_id, 'current', e.target.value)}
                                  className="w-16 bg-transparent text-right font-mono text-[10px] text-[#e8eaed] focus:outline-none"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleApplyTweaks(m.machine_id)}
                              disabled={actState?.type === 'tweak' && actState.state === 'busy'}
                              className={`w-full py-1 rounded text-[9px] font-bold font-mono tracking-wider uppercase border transition-all cursor-pointer ${
                                actState?.type === 'tweak' && actState.state === 'busy'
                                  ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                  : actState?.type === 'tweak' && actState.state === 'success'
                                  ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50'
                                  : 'text-slate-300 bg-white/5 border-white/10 hover:bg-white/10 active:scale-98'
                              }`}
                            >
                              {actState?.type === 'tweak' && actState.state === 'busy' && '⚡ Applying...'}
                              {actState?.type === 'tweak' && actState.state === 'success' && '✅ Baseline Applied'}
                              {(!actState || actState.type !== 'tweak') && '🔧 Apply Override Tweaks'}
                            </button>
                          </div>
                        </td>

                        {/* Interactive Controls */}
                        <td className="p-4">
                          <div className="flex flex-col gap-2 items-end justify-center">
                            {/* Fault Injector Dropdown Selection */}
                            <div className="flex items-center gap-1.5">
                              <select
                                value={selectedFaults[m.machine_id] || ''}
                                onChange={(e) => setSelectedFaults(prev => ({ ...prev, [m.machine_id]: e.target.value }))}
                                className="bg-[#202124] border border-[#3c4043] rounded-lg px-2 py-1.5 text-[10px] font-mono font-bold text-[#e8eaed] focus:outline-none shadow-inner"
                              >
                                {faultTypes.map((ft) => (
                                  <option key={ft.name} value={ft.name}>
                                    {ft.label}
                                  </option>
                                ))}
                              </select>
                              
                              <button
                                onClick={() => handleInjectFault(m.machine_id)}
                                disabled={status.fault?.active || (actState?.type === 'inject' && actState.state === 'busy')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase cursor-pointer select-none transition-all ${
                                  status.fault?.active
                                    ? 'text-slate-600 bg-slate-800/10 border-slate-800/20 cursor-not-allowed'
                                    : actState?.type === 'inject' && actState.state === 'busy'
                                    ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 active:scale-95'
                                }`}
                              >
                                <Play size={11} />
                                Inject
                              </button>
                            </div>

                            {/* Supplementary Actions Row */}
                            <div className="flex items-center gap-2">
                              {/* Clear Fault Button */}
                              {status.fault?.active && (
                                <button
                                  onClick={() => handleClearFault(m.machine_id)}
                                  disabled={actState?.type === 'clear' && actState.state === 'busy'}
                                  className="px-2.5 py-1 rounded text-[9px] font-bold uppercase border cursor-pointer select-none transition-all
                                             text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95"
                                >
                                  {actState?.type === 'clear' && actState.state === 'busy' ? '⚡ Clearing...' : '🔧 Reset System'}
                                </button>
                              )}

                              {/* ML Model Retraining Button */}
                              <button
                                onClick={() => handleRetrain(m.machine_id)}
                                disabled={actState?.type === 'retrain' && actState.state === 'busy'}
                                className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase border cursor-pointer select-none transition-all ${
                                  actState?.type === 'retrain' && actState.state === 'busy'
                                    ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                    : actState?.type === 'retrain' && actState.state === 'success'
                                    ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50'
                                    : 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20 active:scale-95'
                                }`}
                              >
                                {actState?.type === 'retrain' && actState.state === 'busy' && '⚡ Calibrating...'}
                                {actState?.type === 'retrain' && actState.state === 'success' && '✅ Calibrated!'}
                                {(!actState || actState.type !== 'retrain') && '🔄 Retrain ML Model'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Status Footer */}
      <footer className="px-6 py-2 border-t border-slate-800/40 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-700">
          F.O.R.G.E Admin Suite · Phase 2 · Core Telemetry Calibration · WAL-mode
        </span>
        <button 
          onClick={() => navigate('/engineer')}
          className="text-xs font-mono text-slate-500 hover:text-[#8ab4f8] transition-colors"
        >
          Exit Admin Mode
        </button>
      </footer>
    </div>
  )
}
