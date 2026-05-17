// services/stream.js — SSE Connection Factory
// Creates and manages EventSource connections per machine.
// Reconnects automatically with exponential backoff.

const BASE_URL = import.meta.env.VITE_STREAM_BASE_URL || 'http://localhost:5000'

const INITIAL_RETRY_MS  = 1000
const MAX_RETRY_MS      = 15000
const BACKOFF_FACTOR    = 1.8

/**
 * Create an SSE connection for a machine.
 *
 * @param {string}   machineId    - Machine identifier
 * @param {Function} onMessage    - Called with parsed telemetry object on each event
 * @param {Function} onConnect    - Called when connection opens
 * @param {Function} onError      - Called on error with error event
 * @returns {{ close: Function }} - Object with close() to terminate the stream
 */
export function createSSEConnection(machineId, { onMessage, onConnect, onError }) {
  let eventSource = null
  let retryMs     = INITIAL_RETRY_MS
  let retryTimer  = null
  let closed      = false

  function connect() {
    if (closed) return

    const url = `${BASE_URL}/api/stream/${machineId}`
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      retryMs = INITIAL_RETRY_MS   // Reset backoff on successful connect
      onConnect?.()
    }

    eventSource.addEventListener('connected', () => {
      onConnect?.()
    })

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch (e) {
        console.warn('[SSE] Failed to parse event data:', event.data)
      }
    }

    eventSource.onerror = (err) => {
      onError?.(err)
      eventSource.close()
      eventSource = null

      if (!closed) {
        console.warn(`[SSE] Connection lost for '${machineId}'. Retrying in ${retryMs}ms...`)
        retryTimer = setTimeout(() => {
          retryMs = Math.min(retryMs * BACKOFF_FACTOR, MAX_RETRY_MS)
          connect()
        }, retryMs)
      }
    }
  }

  connect()

  return {
    close: () => {
      closed = true
      clearTimeout(retryTimer)
      eventSource?.close()
      eventSource = null
    },
  }
}
