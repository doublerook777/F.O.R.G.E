# F.O.R.G.E Frontend — Phase 1 Foundation

This is the React + Vite frontend for the **F.O.R.G.E** (Fault Observation & Real-time Gateway Engine) predictive maintenance platform.

## Overview

The Phase 1 frontend foundation provides:

- **2D Real-time Telemetry Visualization** - Live metrics charts using Recharts
- **Zustand State Management** - Centralized stores for telemetry, alerts, and authentication
- **Server-Sent Events (SSE) Streaming** - Real-time data updates from backend
- **Role-Based Dashboards** - Operator (simplified), Engineer (advanced), and Admin views
- **Industrial Aesthetic UI** - Dark theme with Tailwind CSS
- **Responsive Design** - Mobile-friendly layouts

**Note:** 3D visualization (digital twin) is planned for Phase 2.

## Technology Stack

### Core
- **React 18+** - UI framework
- **Vite** - Build tool and dev server
- **React Router 6** - Client-side routing
- **TypeScript** - Type safety configuration

### State & Data
- **Zustand** - Lightweight state management
- **Axios** - HTTP client
- **EventSource API** - Server-Sent Events (SSE)

### UI & Styling
- **Recharts** - 2D charting library
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.jsx       # App header with user info
│   │   ├── MachineCard.jsx  # Machine status display
│   │   ├── TelemetryChart.jsx  # 2D line chart
│   │   ├── AlertLog.jsx     # Alert history
│   │   ├── ControlPanel.jsx # Fault injection controls
│   │   └── RiskGauge.jsx    # Risk score display
│   ├── pages/               # Page components
│   │   ├── Login.jsx        # Authentication portal
│   │   ├── OperatorDashboard.jsx  # Operator view
│   │   ├── EngineerDashboard.jsx  # Engineer view (with 3D placeholder)
│   │   ├── Admin.jsx        # Admin panel (stub)
│   │   └── NotFound.jsx     # 404 page
│   ├── state/               # Zustand stores
│   │   ├── authStore.js     # Auth & user state
│   │   ├── telemetryStore.js  # Telemetry & connection state
│   │   └── alertStore.js    # Alert management
│   ├── services/            # API & external services
│   │   ├── api.js           # Axios client & endpoints
│   │   └── stream.js        # SSE connection factory
│   ├── hooks/               # Custom React hooks
│   │   └── useSSEStream.js  # Real-time data subscription
│   ├── canvas/              # 3D scene (Phase 2)
│   │   └── Scene.jsx        # Three.js scene stub
│   ├── App.jsx              # Root router
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles & Tailwind
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── postcss.config.js        # PostCSS configuration
└── .env.example             # Environment variables template
```

## Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This installs:
- React and React Router
- Zustand for state management
- Axios for HTTP
- Recharts for 2D charting
- Tailwind CSS and Vite

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update variables as needed (defaults work for local development):

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_STREAM_BASE_URL=http://localhost:5000
```

## Development

### Start Dev Server

```bash
npm run dev
```

Opens at http://localhost:5173 (Vite's default port)

### Build for Production

```bash
npm run build
```

Outputs optimized bundle to `dist/`

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## Architecture

### State Management (Zustand)

Three stores manage application state:

1. **authStore** - JWT token, user info, login/logout
2. **telemetryStore** - Machine metadata, connection status, risk scores
3. **alertStore** - Alert history, unread count

No server state is stored in React—all sensitive data is localStorage-backed.

### Real-time Data (SSE)

The `useSSEStream` hook subscribes to SSE streams per machine:

```javascript
const { dataRef } = useSSEStream('cnc_mill_01')
// dataRef.current contains: { rpm, temperature, vibration, current, risk_score }
```

Updates are written directly to a ref (bypassing React) to prevent lag at 10 Hz refresh rates.

### API Client

Axios instance with automatic JWT injection and 401 auto-logout:

```javascript
import { authAPI, machinesAPI, alertsAPI } from './services/api'

// Login
const res = await authAPI.login('operator', 'password123')

// Get machines
const machines = await machinesAPI.list()

// Inject fault for testing
await machinesAPI.injectFault('cnc_mill_01', 'bearing_failure')
```

### Styling

Uses **Tailwind CSS** with custom design tokens:

- **Colors**: Industrial dark theme (#080c14 background)
- **Fonts**: Inter (sans), JetBrains Mono (monospace)
- **Components**: Glass-morphism cards, glow effects
- **Utilities**: Risk color classes, animations

See `src/index.css` for design token definitions.

## Components Reference

### TelemetryChart

2D line chart of telemetry history (last 30 seconds):

```jsx
import TelemetryChart from '@/components/TelemetryChart'

<TelemetryChart
  data={[
    { timestamp: '10:30:00', rpm: 3200, temperature: 65, vibration: 0.5, current: 15 },
    { timestamp: '10:30:01', rpm: 3210, temperature: 65.2, vibration: 0.48, current: 15.1 },
  ]}
  height={300}
/>
```

### MachineCard

Displays live machine metrics with animated bars:

```jsx
import MachineCard from '@/components/MachineCard'

<MachineCard dataRef={dataRef} machineId="cnc_mill_01" />
```

### Header

Application header with logo, user info, and logout:

```jsx
import Header from '@/components/Header'

<Header />
```

### AlertLog

Scrolling feed of system alerts by severity:

```jsx
import AIAlertLog from '@/components/AIAlertLog'

<AIAlertLog machineId="cnc_mill_01" />
```

### ControlPanel

Fault injection controls (for testing):

```jsx
import ControlPanel from '@/components/ControlPanel'

<ControlPanel machineId="cnc_mill_01" />
```

### RiskGauge

Animated SVG risk score dial:

```jsx
import RiskGauge from '@/components/RiskGauge'

<RiskGauge score={65} machineId="cnc_mill_01" />
```

## Authentication

The app uses **JWT tokens** with role-based routing:

- **Guest** → Redirect to login
- **operator** → `/operator` dashboard only
- **engineer** → `/engineer` dashboard + controls
- **admin** → `/admin` + all dashboards

Demo credentials (in `pages/Login.jsx`):
- Operator: `operator` / `operator123`
- Engineer: `engineer` / `engineer123`
- Admin: `admin` / `admin123`

## Backend Integration

The frontend expects a Flask backend at `http://localhost:5000` with:

### REST Endpoints
- `POST /api/auth/login` - Authenticate
- `GET /api/auth/me` - Current user
- `GET /api/machines` - List machines
- `GET /api/faults` - List fault types
- `GET /api/alerts` - List alerts
- `POST /api/control/{machine_id}/inject-fault` - Test fault injection
- `POST /api/control/{machine_id}/clear-fault` - Clear fault
- `GET /api/health` - Health check

### SSE Streaming
- `GET /api/stream/{machine_id}` - Real-time telemetry stream (Server-Sent Events)

See backend documentation for implementation details.

## Troubleshooting

### Port 5173 Already in Use
```bash
# Use different port
npm run dev -- --port 5174
```

### Recharts Not Loading
```bash
# Clear node_modules and reinstall
rm -r node_modules package-lock.json
npm install
```

### JWT Token Expired
The frontend automatically logs out on 401 responses and redirects to `/login`.

### SSE Connection Drops
The `useSSEStream` hook automatically reconnects with exponential backoff (1s → 15s max).

## Performance Notes

### Zero-Lag Telemetry Updates

High-frequency telemetry (10 Hz) bypasses React state to prevent render lag:

```javascript
// Hot path: direct ref writes, no re-renders
dataRef.current.rpm = 3200
dataRef.current.temperature = 65

// Cold path: only threshold-crossing updates trigger Zustand
if (delta >= RISK_UPDATE_THRESHOLD) {
  setRiskScore(machineId, score)  // Causes re-render
}
```

### Chart Optimization

TelemetryChart uses `isAnimationActive={false}` to prevent expensive animations on every update.

## Phase 2 Roadmap

- [ ] 3D Digital Twin visualization (Three.js + React Three Fiber)
- [ ] Real-time 3D model-driven diagnostics
- [ ] Advanced ML risk scoring UI
- [ ] Multi-machine comparison dashboards
- [ ] Custom alert thresholds
- [ ] User preferences and saved views
- [ ] Internationalization (i18n)
- [ ] Dark/Light theme toggle

## Contributing

Ensure changes:
1. Use existing component patterns (Tailwind, Zustand, Recharts)
2. Are accessible (ARIA labels, keyboard navigation)
3. Are responsive (test at 320px, 768px, 1920px widths)
4. Don't break existing routes or stores
5. Match the industrial aesthetic (dark, glow effects, monospace text)

## License

Proprietary — F.O.R.G.E Predictive Maintenance Platform

---

**Version:** 1.0  
**Phase:** 1 (Foundation — 2D visualization)  
**Last Updated:** 2024
