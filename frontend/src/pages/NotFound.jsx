// pages/NotFound.jsx — 404 Page

import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center bg-[#303134] border border-[#3c4043] rounded-3xl p-8 max-w-md w-full shadow-2xl select-none mx-4">
        <div className="text-5xl font-black text-[#ee675c] mb-3">404</div>
        <h1 className="text-xl font-bold text-[#e8eaed] mb-1.5 tracking-tight">Resource Not Found</h1>
        <p className="text-xs font-bold text-[#9aa0a6] tracking-wider uppercase mb-3">
          ERROR STATUS CODE
        </p>
        <p className="text-[#80868b] text-xs leading-relaxed mb-6">
          The requested dashboard, telemetry node, or diagnostics link does not exist or has been relocated.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="ripple w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase cursor-pointer transition-all duration-200
                     bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.25)] text-[#8ab4f8] hover:bg-[rgba(138,180,248,0.15)] shadow-md"
        >
          Return to Portal
        </button>
      </div>
    </div>
  )
}
