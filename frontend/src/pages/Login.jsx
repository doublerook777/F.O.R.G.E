// pages/Login.jsx — F.O.R.G.E Authentication Portal

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import useAuthStore from '../state/authStore'
import { Activity } from 'lucide-react'

const ROLE_ROUTES = {
  admin:    '/engineer',
  engineer: '/engineer',
  operator: '/operator',
}

export default function Login() {
  const navigate = useNavigate()
  const { login, token } = useAuthStore()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (token) navigate('/engineer', { replace: true })
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Please enter username and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(form.username, form.password)
      login(res.data.token, res.data.user)
      navigate(ROLE_ROUTES[res.data.user.role] || '/engineer', { replace: true })
    } catch (e) {
      setError(e.response?.data?.error || 'Authentication failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (username, password) => {
    setForm({ username, password })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background grid decoration */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 glow-blue"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0e7490 100%)' }}>
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">F.O.R.G.E</h1>
          <p className="text-xs font-mono text-slate-500 mt-1 tracking-widest">
            FAULT OBSERVATION & REAL-TIME GATEWAY ENGINE
          </p>
        </div>

        {/* Login card */}
        <div className="glass-bright rounded-2xl p-8">
          <h2 className="text-lg font-bold text-slate-200 mb-6">Operator Authentication</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono text-slate-400 tracking-widest">
                USERNAME
              </label>
              <input
                id="username-input"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="operator / engineer / admin"
                className="px-4 py-3 rounded-xl font-mono text-sm text-slate-200
                           border border-slate-700 bg-slate-800/60
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
                           placeholder:text-slate-600 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono text-slate-400 tracking-widest">
                PASSWORD
              </label>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••••"
                className="px-4 py-3 rounded-xl font-mono text-sm text-slate-200
                           border border-slate-700 bg-slate-800/60
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
                           placeholder:text-slate-600 transition-all"
              />
            </div>

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono">
                ⚠ {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="mt-2 py-3 rounded-xl font-bold text-sm tracking-wider text-white
                         transition-all duration-200 disabled:opacity-50
                         hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: loading
                  ? '#1e40af'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #0e7490 100%)',
                boxShadow: '0 0 20px rgba(59,130,246,0.3)',
              }}
            >
              {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE →'}
            </button>
          </form>

          {/* Quick-fill demo credentials */}
          <div className="mt-6 pt-5 border-t border-slate-700/40">
            <p className="text-xs text-slate-600 font-mono mb-3 text-center">DEMO CREDENTIALS</p>
            <div className="flex gap-2">
              {[
                { label: 'Engineer', u: 'engineer', p: 'engineer123' },
                { label: 'Operator', u: 'operator', p: 'operator123' },
                { label: 'Admin',    u: 'admin',    p: 'admin123'    },
              ].map(({ label, u, p }) => (
                <button
                  key={u}
                  id={`quick-login-${u}`}
                  onClick={() => quickLogin(u, p)}
                  className="flex-1 py-1.5 text-xs font-mono rounded-lg
                             border border-slate-700 text-slate-500
                             hover:border-blue-500/50 hover:text-blue-400
                             transition-all duration-200"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6 font-mono">
          FORGE v1.0 — Phase 1 — Industrial Digital Twin Platform
        </p>
      </div>
    </div>
  )
}
