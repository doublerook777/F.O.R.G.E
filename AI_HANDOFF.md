# F.O.R.G.E — AI & Developer Handoff Context

**To the next AI Assistant or Developer picking up this repository:**
This document summarizes the exact state of the F.O.R.G.E (Fault Observation & Real-time Gateway Engine) project, our architectural constraints, and where you need to resume work.

---

## 1. Project Status
- **Core Telemetry Engine:** COMPLETELY IMPLEMENTED
- **LLM Root Cause Diagnostics:** COMPLETELY IMPLEMENTED
- **Historical Analysis & Admin Management:** PENDING (This is your starting point)

## 2. Tech Stack & Execution
- **Frontend:** React 19, Vite, TailwindCSS v4, Zustand, React Three Fiber (`@react-three/drei`).
- **Backend:** Python (Flask), SQLite (WAL-mode), Scikit-Learn (Isolation Forest), Google Generative AI (Gemini).
- **Execution:** Windows users can run `setup.bat` followed by `run.bat` to concurrently boot the backend (port 5000) and frontend (port 5173).

## 3. Critical Architectural Rules (DO NOT BREAK)
1. **Zero-Lag UI Pattern (Frontend):** The backend streams telemetry (RPM, Temperature, Vibration) at **10 Hz** via Server-Sent Events (SSE). 
   - **RULE:** Do NOT store these fast-updating metrics in `useState()`. Doing so will freeze the React Virtual DOM and drop frame rates. 
   - **PATTERN:** We use the `useSSEStream.js` hook which uses `useRef` to store the latest values and a `requestAnimationFrame` loop to directly mutate DOM node `textContent` (e.g., in `MachineCard.jsx`).
2. **Database Concurrency (Backend):** We rely on SQLite configured in **WAL (Write-Ahead Logging) mode** with a dedicated background thread for connection pooling (`database/db.py`). The physics simulator writes at 10Hz concurrently while the ML engine and Flask API read from the DB. Maintain strict thread safety if modifying DB connections.
3. **Master-Detail Routing:** The platform uses a fleet management pattern. `/components` shows the `ComponentsDashboard` grid. Clicking a card routes to `/components/:id` which renders the isolated `ComponentDetail` page (housing the 3D Scene and specific telemetry).

## 4. What We Just Completed
- **Gemini LLM Integration:** `backend/llm_service/gemini_client.py` captures a trailing 30-second window of machine metrics when the ML risk score exceeds 85%, feeding it to Gemini 2.5 Flash to generate a Root Cause Analysis JSON payload.
- **UX Refinements:** Replaced all placeholder UI elements. The app now strictly uses `lucide-react` for iconography. The Profile Menu mimics a dynamic browser-dropdown style. The master app logo is a stylized `Activity` zig-zag.

## 5. Next Steps (Where you should start)
1. **Historical Charting:** The live metrics are working perfectly, but there is no historical visualization. Implement `Recharts` to chart historical telemetry data, allowing the user to scrub back in time to observe when the fault initiated.
2. **Admin Workflows:** The `/admin` route is currently a stub placeholder. Build out system configuration, machine registration, and user management workflows.
3. **Multi-Machine Correlation:** Currently, the Isolation Forest model evaluates individual machines in a vacuum. Upgrade the `ml_engine` to correlate anomalies across the entire factory floor (e.g., if both Lathe_02 and Mill_01 experience power draw spikes, identify a facility-level electrical fault).
