// pages/NotFound.jsx — 404 Page

import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="text-6xl font-black text-slate-600 mb-4">404</div>
        <h1 className="text-3xl font-bold text-slate-200 mb-2">Page Not Found</h1>
        <p className="text-slate-500 font-mono text-sm mb-8">
          The requested resource does not exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 rounded-lg text-sm font-bold font-mono
                     border border-blue-500/50 text-blue-400
                     hover:bg-blue-500/10 transition-all"
        >
          RETURN HOME →
        </button>
      </div>
    </div>
  )
}
