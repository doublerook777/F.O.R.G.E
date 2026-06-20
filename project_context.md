# F.O.R.G.E — Project Context & Memory

**F.O.R.G.E (Fault Observation & Real-time Gateway Engine)** is a cutting-edge predictive maintenance platform. It simulates real-time physics telemetry for industrial machinery, detects anomalies using Machine Learning (Isolation Forest), and synthesizes root-cause analyses using an LLM (Google Gemini).

---

## 1. Tech Stack
### Frontend
- **Framework:** React 19 + Vite
- **Styling:** TailwindCSS v4 (Glassmorphism & Industrial UI design)
- **State Management:** Zustand (Auth, Telemetry, and Alert stores)
- **Routing:** React Router v7
- **3D Engine:** Three.js + `@react-three/fiber` + `@react-three/drei` (Digital Twin)
- **Icons:** `lucide-react`

### Backend
- **Framework:** Python (Flask)
- **Streaming:** Server-Sent Events (SSE) for 10Hz real-time telemetry
- **Database:** SQLite (WAL-mode for high concurrency write/read)
- **Machine Learning:** `scikit-learn` (Isolation Forest)
- **AI / LLM:** Google Gemini API (`google-generativeai`)

---

## 2. Architecture & Data Flow

1. **Telemetry Simulation (`backend/simulator`)**
   - Generates 10Hz physics-based data (Spindle RPM, Temperature, Vibration, Current Draw).
   - Supports active fault injection (e.g., Thermal Runaway, Bearing Failure).

2. **Real-time Pipeline (`backend/ml_engine` & `database`)**
   - Incoming data is persisted to the SQLite `telemetry` table.
   - An **Isolation Forest** model evaluates the 22-dimensional feature space in real-time to generate a `risk_score` (0-100%).

3. **AI Diagnostics (`backend/llm_service`)**
   - When the `risk_score` crosses a critical threshold, a 30-second sliding window of telemetry is passed to the **Gemini LLM**.
   - Gemini synthesizes a structured JSON RCA (Root Cause Analysis), generating actionable alerts.

4. **Zero-Lag Frontend (`frontend/src/hooks/useSSEStream.js`)**
   - Telemetry is streamed to the browser via SSE.
   - **Performance Optimization:** Instead of triggering React re-renders 10 times a second per machine, the frontend uses a `useRef` + `requestAnimationFrame` loop. This bypasses the React Virtual DOM, writing incoming values directly to DOM nodes and achieving perfectly smooth 60FPS 3D rendering and metric updates.

---

## 3. Core Modules & Directory Structure

```text
IDP/project/
├── backend/
│   ├── app.py                     # Flask entry point
│   ├── database/                  # SQLite schemas and WAL connection pool
│   ├── llm_service/               # Gemini client integration
│   ├── ml_engine/                 # Isolation Forest & Feature Extraction
│   ├── routes/                    # API Endpoints (Auth, Alerts, SSE, Control)
│   ├── services/                  # Diagnosis triggers & Business logic
│   └── simulator/                 # Physics engine & fault generators
└── frontend/
    ├── src/
    │   ├── canvas/                # React Three Fiber 3D Scene components
    │   ├── components/            # Reusable UI (MachineCard, RiskGauge, ProfileMenu)
    │   ├── hooks/                 # Custom hooks (useSSEStream)
    │   ├── pages/                 # Route Views (Engineer, Operator, Admin, Login)
    │   ├── services/              # Axios API clients
    │   └── state/                 # Zustand global stores
    └── index.css                  # Global Tailwind & Keyframe animations
```

---

## 4. Current State & Roadmap

- **Phase 1 (Completed):** High-frequency physics simulator, WAL-mode SQLite, ML Anomaly Detection, Zero-Lag R3F Frontend.
- **Phase 2 (Completed):** LLM Root-Cause Analysis integration (Gemini Flash 2.5). The system is fully operational.
- **Phase 3 (Upcoming):** CI/CD deployment, comprehensive charting/historical metric analysis, robust Admin/User management workflows. 

---

## 5. Environment Dependencies

- **Backend:** Requires `.env` file containing `JWT_SECRET` and `GEMINI_API_KEY`.
- **Frontend:** Requires Node.js and dependencies installed via `npm install`.
