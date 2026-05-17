// state/alertStore.js — AI Alert Log State
import { create } from 'zustand'

const MAX_ALERTS = 100

const useAlertStore = create((set) => ({
  alerts: [],   // [{ id, machine_id, severity, risk_score, message, timestamp, diagnosis_json }]

  addAlert: (alert) =>
    set((state) => ({
      // Prepend newest, cap at MAX_ALERTS
      alerts: [{ ...alert, _localId: Date.now() }, ...state.alerts].slice(0, MAX_ALERTS),
    })),

  clearAlerts: () => set({ alerts: [] }),

  setAlerts: (alerts) => set({ alerts }),

  unreadCount: 0,
  markAllRead: () => set({ unreadCount: 0 }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
}))

export default useAlertStore
