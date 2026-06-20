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
  const [focusedInput, setFocusedInput] = useState(null)

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
    <div className="min-h-screen flex bg-[#202124] overflow-hidden">
      
      {/* ── Left Side: Brand & Visuals (Hidden on Mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-[#3c4043] z-10 select-none">
        {/* Flat dark background */}
        <div className="absolute inset-0 bg-[#202124] z-0" />
        
        {/* Animated glowing orbs (subtle, clean blur) */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[rgba(138,180,248,0.06)] rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[rgba(129,201,149,0.06)] rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        
        <div className="relative z-10">
          <div 
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6 shadow-md"
            style={{ background: 'linear-gradient(135deg, #3870e0 0%, #1e4eb8 100%)' }}
          >
            <Activity className="w-6 h-6 text-[#e8eaed]" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-[#e8eaed] mb-4">
            F.O.R.G.E
          </h1>
          <p className="text-base text-[#9aa0a6] max-w-md leading-relaxed font-medium">
            Industrial intelligence elevated. Real-time digital twins and machine learning analytics combined to safeguard critical mechanical infrastructure.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs font-mono text-[#9aa0a6]">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#81c995] animate-pulse" />
            DIAGNOSTICS OPERATIONAL
          </span>
          <span className="text-[#3c4043]">|</span>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* ── Right Side: Authentication Panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md relative z-10 animate-fade-up">
          
          {/* Mobile-only Logo */}
          <div className="lg:hidden text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-md"
              style={{ background: 'linear-gradient(135deg, #3870e0 0%, #1e4eb8 100%)' }}
            >
              <Activity className="w-7 h-7 text-[#e8eaed]" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#e8eaed]">F.O.R.G.E</h1>
          </div>

          <div className="bg-[#303134] rounded-3xl p-8 shadow-xl border border-[#3c4043] select-none">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#e8eaed] tracking-tight mb-1.5">Welcome</h2>
              <p className="text-xs text-[#9aa0a6] font-bold tracking-wider uppercase">AUTHENTICATION PORTAL</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username Input */}
              <div className={`relative rounded-xl border transition-all duration-300 ${focusedInput === 'username' ? 'border-[#8ab4f8] bg-[#202124]' : 'border-[#3c4043] bg-[#202124] hover:border-[#5f6368]'}`}>
                <label className={`absolute left-4 transition-all duration-200 font-bold text-[9px] tracking-wider ${form.username || focusedInput === 'username' ? 'top-2 text-[#8ab4f8]' : 'top-4 text-[#9aa0a6]'}`}>
                  USERNAME
                </label>
                <input
                  id="username-input"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full px-4 pt-6 pb-2 bg-transparent text-[#e8eaed] text-sm focus:outline-none"
                />
              </div>

              {/* Password Input */}
              <div className={`relative rounded-xl border transition-all duration-300 ${focusedInput === 'password' ? 'border-[#8ab4f8] bg-[#202124]' : 'border-[#3c4043] bg-[#202124] hover:border-[#5f6368]'}`}>
                <label className={`absolute left-4 transition-all duration-200 font-bold text-[9px] tracking-wider ${form.password || focusedInput === 'password' ? 'top-2 text-[#8ab4f8]' : 'top-4 text-[#9aa0a6]'}`}>
                  PASSWORD
                </label>
                <input
                  id="password-input"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 pt-6 pb-2 bg-transparent text-[#e8eaed] text-sm focus:outline-none"
                />
              </div>

              {error && (
                <div className="text-xs px-4 py-3 rounded-xl bg-[rgba(238,103,92,0.08)] border border-[rgba(238,103,92,0.25)] text-[#ee675c] animate-fade-up flex items-center gap-2">
                  <span className="text-base">⚠</span> {error}
                </div>
              )}

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="ripple mt-3 w-full py-3.5 rounded-xl font-bold text-sm tracking-wider text-[#202124] bg-[#8ab4f8] hover:bg-[#8ab4f8]/95
                           transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-md"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE'}
                </span>
              </button>
            </form>

            {/* Quick-fill demo credentials */}
            <div className="mt-8 pt-6 border-t border-[#3c4043]">
              <p className="text-[9px] text-[#9aa0a6] mb-4 text-center tracking-wider font-bold uppercase">BYPASS CREDENTIALS (DEMO)</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'ENGINEER', u: 'engineer', p: 'engineer123' },
                  { label: 'OPERATOR', u: 'operator', p: 'operator123' },
                  { label: 'ADMIN',    u: 'admin',    p: 'admin123'    },
                ].map(({ label, u, p }) => (
                  <button
                    key={u}
                    id={`quick-login-${u}`}
                    onClick={() => quickLogin(u, p)}
                    className="ripple py-2.5 text-[9px] rounded-xl font-bold tracking-wider cursor-pointer
                               bg-[#202124] border border-[#3c4043] text-[#9aa0a6]
                               hover:border-[#8ab4f8]/50 hover:bg-[#3c4043] hover:text-[#8ab4f8]
                               transition-all duration-200"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
