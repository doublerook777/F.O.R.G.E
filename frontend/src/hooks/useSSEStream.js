// hooks/useSSEStream.js — Zero-Lag SSE Consumer
//
// CRITICAL DESIGN: Raw telemetry (10 Hz) is written directly to a mutable
// useRef object, bypassing React's reconciler entirely. This prevents
// browser freezing from 600 state updates per minute.
//
// Only risk score changes that CROSS a threshold trigger a Zustand update
// (which causes a React re-render). All other data is consumed by the R3F
// canvas via direct ref access.

import { useRef, useEffect, useCallback } from 'react'
import { createSSEConnection } from '../services/stream'
import useTelemetryStore from '../state/telemetryStore'
import useAlertStore from '../state/alertStore'

// Risk score change threshold to trigger a Zustand update (avoid 10Hz re-renders)
const RISK_UPDATE_THRESHOLD = 2.0   // Only update store if risk changes by ≥2%

/**
 * useSSEStream — Subscribe to live telemetry for a machine.
 *
 * @param {string} machineId - Machine to stream.
 * @returns {{ dataRef: React.MutableRefObject }} - dataRef.current holds live telemetry.
 *
 * Usage in R3F canvas:
 *   const { dataRef } = useSSEStream('cnc_mill_01')
 *   useFrame(() => {
 *     meshRef.current.rotation.y = dataRef.current.rpm / 3200 * Math.PI
 *   })
 */
export function useSSEStream(machineId) {
  // ── The critical bypass ref — raw telemetry lives here, NOT in state ──
  const dataRef = useRef({
    machine_id:  machineId,
    rpm:         0,
    temperature: 0,
    vibration:   0,
    current:     0,
    risk_score:  0,
    fault_active: null,
    timestamp:   null,
    _frameCount: 0,
  })

  const lastRiskRef       = useRef(0)
  const connectionRef     = useRef(null)

  const setConnectionStatus = useTelemetryStore((s) => s.setConnectionStatus)
  const setRiskScore        = useTelemetryStore((s) => s.setRiskScore)
  const addAlert            = useAlertStore((s) => s.addAlert)
  const incrementUnread     = useAlertStore((s) => s.incrementUnread)

  const handleMessage = useCallback((data) => {
    // ── HOT PATH: Direct ref write — zero React overhead ──────────────
    dataRef.current.rpm          = data.rpm
    dataRef.current.temperature  = data.temperature
    dataRef.current.vibration    = data.vibration
    dataRef.current.current      = data.current
    dataRef.current.risk_score   = data.risk_score
    dataRef.current.fault_active = data.fault_active
    dataRef.current.timestamp    = data.timestamp
    dataRef.current._frameCount += 1

    // ── THRESHOLD GATE: Only push to Zustand if risk changed meaningfully ──
    const delta = Math.abs(data.risk_score - lastRiskRef.current)
    if (delta >= RISK_UPDATE_THRESHOLD) {
      lastRiskRef.current = data.risk_score
      setRiskScore(machineId, data.risk_score)
    }
  }, [machineId, setRiskScore])

  const handleConnect = useCallback(() => {
    setConnectionStatus(machineId, 'connected')
  }, [machineId, setConnectionStatus])

  const handleError = useCallback(() => {
    setConnectionStatus(machineId, 'error')
  }, [machineId, setConnectionStatus])

  useEffect(() => {
    if (!machineId) return

    setConnectionStatus(machineId, 'connecting')

    connectionRef.current = createSSEConnection(machineId, {
      onMessage: handleMessage,
      onConnect: handleConnect,
      onError:   handleError,
    })

    return () => {
      connectionRef.current?.close()
      setConnectionStatus(machineId, 'disconnected')
    }
  }, [machineId, handleMessage, handleConnect, handleError, setConnectionStatus])

  return { dataRef }
}

export default useSSEStream
