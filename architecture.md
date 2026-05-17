# F.O.R.G.E — Architecture Design

This document outlines the architectural layers, module structure, and data flow of the F.O.R.G.E platform.

## 1. Architectural Layers
The platform follows a decoupled, service-oriented architecture:
- **Presentation Layer (Frontend):** React + Vite. Handles visualization, dashboards, and 3D rendering. Uses Zero-Lag architecture for high-frequency updates.
- **API & Routing Layer (Backend):** Flask routes handling HTTP REST and Server-Sent Events (SSE).
- **Service Layer (Backend):** Core business logic orchestrating Machine Learning, AI diagnostics, and telemetry processing.
- **Data Persistence Layer (Backend):** SQLite (WAL-mode) optimizing for concurrent high-speed writes from the simulator and reads from the ML engine.
- **Simulation Layer (Backend):** An independent background thread generating synthetic physics data (RPM, Vibration, etc.) at 10Hz.

## 2. Module Structure
### Backend (`/backend`)
- `simulator/`: Physics engine for machine telemetry.
- `ml_engine/`: Isolation Forest implementation, feature extraction, and real-time inference.
- `llm_service/`: Gemini API integration for RCA (Root Cause Analysis).
- `services/`: Bridges routes to models and DB.
- `routes/`: Flask blueprints for endpoints.
- `database/`: Schema and DB connection pooling.

### Frontend (`/frontend`)
- `src/canvas/`: Three.js R3F components for Digital Twin.
- `src/components/`: Reusable UI elements (cards, menus, gauges).
- `src/hooks/`: Custom React hooks (`useSSEStream`).
- `src/state/`: Zustand stores (`authStore`, `telemetryStore`, `alertStore`).
- `src/pages/`: Role-based dashboards (Operator, Engineer, Admin).

## 3. Data Flow
1. **Telemetry Generation:** `simulator` generates data at 10Hz and pushes to `telemetry_service`.
2. **Persistence & Inference:** `telemetry_service` writes to SQLite and immediately passes the data to `ml_engine` for anomaly scoring.
3. **Streaming:** The same data is broadcasted via the SSE `stream_routes` to connected frontend clients.
4. **AI Diagnostics:** If ML risk score > 85, `diagnosis_service` fetches the trailing 30s of data and calls `llm_service`. The resulting JSON is stored in `alerts`.
5. **Frontend Consumption:** The frontend's `useSSEStream` hook listens to the stream, bypassing React's render cycle using `requestAnimationFrame` to update DOM nodes directly.
