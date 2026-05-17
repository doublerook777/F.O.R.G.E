// services/api.js — Axios REST Client
import axios from 'axios'
import useAuthStore from '../state/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── API Methods ──────────────────────────────────────────────
export const authAPI = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  me:    ()                    => api.get('/api/auth/me'),
}

export const machinesAPI = {
  list:         ()           => api.get('/api/machines'),
  faults:       ()           => api.get('/api/faults'),
  status:       (machineId)  => api.get(`/api/control/${machineId}/status`),
  injectFault:  (machineId, fault) => api.post(`/api/control/${machineId}/inject-fault`, { fault }),
  clearFault:   (machineId)  => api.post(`/api/control/${machineId}/clear-fault`),
}

export const alertsAPI = {
  all:     (limit = 50)            => api.get(`/api/alerts?limit=${limit}`),
  machine: (machineId, limit = 50) => api.get(`/api/alerts/${machineId}?limit=${limit}`),
}

export const healthAPI = {
  check: () => api.get('/api/health'),
}

export default api
