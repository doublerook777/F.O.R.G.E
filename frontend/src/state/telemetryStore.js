// state/telemetryStore.js — UI-level telemetry state (NOT the hot path)
// High-frequency raw data flows through useRef in useSSEStream.
// This store holds ONLY: connection status, active machine, risk score thresholds.
import { create } from 'zustand'

const useTelemetryStore = create((set) => ({
  // Which machine is currently selected in the UI
  activeMachineId: 'cnc_mill_01',
  setActiveMachine: (id) => set({ activeMachineId: id }),

  // SSE connection state per machine
  connectionStatus: {},   // { machine_id: 'connecting' | 'connected' | 'error' | 'disconnected' }
  setConnectionStatus: (machineId, status) =>
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [machineId]: status },
    })),

  // Risk score (updated on threshold crossing, not every tick)
  riskScores: {},   // { machine_id: number }
  setRiskScore: (machineId, score) =>
    set((state) => ({
      riskScores: { ...state.riskScores, [machineId]: score },
    })),

  // Machines metadata from /api/machines
  machines: [],
  setMachines: (machines) => set({ machines }),

  // Available fault types from /api/faults
  faultTypes: [],
  setFaultTypes: (faults) => set({ faultTypes: faults }),
}))

export default useTelemetryStore
