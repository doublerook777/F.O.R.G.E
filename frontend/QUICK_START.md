# F.O.R.G.E Frontend — Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Install Dependencies
```bash
cd d:\neo\IDP\project\frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Opens at: **http://localhost:5173**

### 3. Login with Demo Credentials
- **Username:** engineer
- **Password:** engineer123

---

## 📁 What Was Created

### Configuration Files
| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.js` | Tailwind CSS theme |
| `postcss.config.js` | PostCSS pipeline |
| `.env.example` | Environment template |
| `package.json` | Dependencies (Recharts added, 3D libs removed) |

### New Components
| Component | File | Purpose |
|-----------|------|---------|
| Header | `src/components/Header.jsx` | App header with user info |
| TelemetryChart | `src/components/TelemetryChart.jsx` | 2D line chart (Recharts) |

### New Pages
| Page | File | Purpose |
|------|------|---------|
| Admin | `src/pages/Admin.jsx` | Admin dashboard stub |
| NotFound | `src/pages/NotFound.jsx` | 404 page |

### Documentation
| Doc | File | Purpose |
|-----|------|---------|
| Frontend Guide | `FRONTEND.md` | Comprehensive documentation |
| Setup Checklist | `SETUP_CHECKLIST.md` | Task completion tracking |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│         React + Vite Frontend               │
├─────────────────────────────────────────────┤
│                                             │
│  Pages (Login, Dashboard, Admin)            │
│         ↓                                   │
│  Components (Header, Charts, Cards)         │
│         ↓                                   │
│  Zustand Stores (auth, telemetry, alerts)   │
│         ↓                                   │
│  Services (API, SSE Stream)                 │
│         ↓                                   │
│  Flask Backend (5000)                       │
│                                             │
└─────────────────────────────────────────────┘
```

### Data Flow

**Real-time Updates:**
```
Flask Backend SSE Stream
    ↓
useSSEStream Hook
    ↓
dataRef (direct DOM writes - no lag)
    ↓
MachineCard + TelemetryChart (10 Hz refresh)
```

**Threshold Crossing:**
```
Risk Score Change ≥2%
    ↓
Zustand Update (setRiskScore)
    ↓
React Re-render
    ↓
RiskGauge Animation
```

---

## 🎨 Key Features

### ✅ 2D Visualization
- Real-time metrics: RPM, Temperature, Vibration, Current
- 30-second rolling history chart
- Risk score gauge with severity colors
- Alert log with timestamps

### ✅ Role-Based Access
- **Operator** → Simplified dashboard (metrics only)
- **Engineer** → Advanced dashboard (controls + diagnostics)
- **Admin** → System management (Phase 2)

### ✅ Real-time Streaming
- Server-Sent Events (SSE) for 10 Hz updates
- Automatic reconnection on failure
- Zero-lag rendering using React refs

### ✅ Industrial Aesthetic
- Dark theme (#080c14 background)
- Glass-morphism cards
- Glow effects
- Monospace fonts
- Color-coded severity (green → red)

---

## 🔌 Backend Integration

The frontend expects a Flask backend at **http://localhost:5000**

### Required Endpoints

**Authentication:**
```
POST   /api/auth/login
GET    /api/auth/me
```

**Machines:**
```
GET    /api/machines
GET    /api/faults
GET    /api/stream/{machine_id}  (Server-Sent Events)
POST   /api/control/{machine_id}/inject-fault
POST   /api/control/{machine_id}/clear-fault
```

**Alerts:**
```
GET    /api/alerts
GET    /api/alerts/{machine_id}
```

**Health:**
```
GET    /api/health
```

---

## 📊 Component Examples

### Using TelemetryChart
```jsx
import TelemetryChart from '@/components/TelemetryChart'

// In your dashboard
<TelemetryChart 
  data={historyArray}  // Last 30 seconds
  height={300}
/>
```

### Using useSSEStream
```jsx
import { useSSEStream } from '@/hooks/useSSEStream'

export function Dashboard() {
  const { dataRef } = useSSEStream('cnc_mill_01')
  
  // dataRef.current contains live telemetry:
  // { rpm, temperature, vibration, current, risk_score }
  
  return <MachineCard dataRef={dataRef} />
}
```

### Using Zustand
```jsx
import useAuthStore from '@/state/authStore'
import useTelemetryStore from '@/state/telemetryStore'

export function Header() {
  const { user, logout } = useAuthStore()
  const connectionStatus = useTelemetryStore(s => s.connectionStatus)
  
  return (
    <header>
      <span>{user.username}</span>
      <button onClick={logout}>Logout</button>
    </header>
  )
}
```

---

## ⚙️ Development Workflow

### 1. Add a New Component
```bash
# Create in src/components/MyComponent.jsx
# Use Tailwind CSS for styling
# Accept props for data and callbacks
```

### 2. Add New State
```bash
# Create in src/state/myStore.js
# Use Zustand pattern
# Export default hook
```

### 3. Add New Page
```bash
# Create in src/pages/MyPage.jsx
# Import and add route in src/App.jsx
```

### 4. Build for Production
```bash
npm run build
# Output: dist/ folder
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Port 5173 in use | Run `npm run dev -- --port 5174` |
| Recharts not found | Run `npm install` to sync dependencies |
| Token expired (401) | Auto-redirects to login |
| SSE drops connection | Auto-reconnects with backoff |
| Tailwind not compiling | Restart dev server: `npm run dev` |

---

## 📚 File Structure Reference

```
frontend/
├── src/
│   ├── components/          # Reusable UI
│   ├── pages/               # Page components
│   ├── state/               # Zustand stores
│   ├── services/            # API + SSE
│   ├── hooks/               # Custom hooks
│   ├── canvas/              # 3D scene (Phase 2)
│   ├── App.jsx              # Router
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index.html               # HTML entry
├── package.json
├── vite.config.js
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── .env
├── .env.example
├── FRONTEND.md              # Full docs
└── SETUP_CHECKLIST.md       # Task tracking
```

---

## 🎯 Next Steps

1. **Verify Installation**
   ```bash
   npm install
   npm run dev
   ```

2. **Connect Backend**
   - Start Flask backend on port 5000
   - Update `.env` if needed

3. **Test Features**
   - Login with engineer credentials
   - View dashboard
   - Check SSE streaming

4. **Develop**
   - Add new components
   - Extend stores
   - Implement Phase 2 features

---

## 📞 Support

- **Frontend Docs:** See `FRONTEND.md`
- **Setup Help:** See `SETUP_CHECKLIST.md`
- **Backend API:** Check backend documentation
- **Tailwind:** https://tailwindcss.com/
- **Zustand:** https://github.com/pmndrs/zustand
- **Recharts:** https://recharts.org/

---

**Version:** 1.0  
**Status:** ✅ Phase 1 Complete (2D Foundation)  
**Next:** Phase 2 (3D Digital Twin)
