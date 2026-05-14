# AI-Powered Predictive Maintenance Simulation Engine: 3D Digital Twin & Dual-AI Diagnostics

The Predictive Maintenance Simulation Engine is a high-performance digital twin platform engineered to protect continuous industrial manufacturing operations. It solves the "Industrial Blindspot" of heavy machinery—unpredictable mechanical failures, overwhelming alarm fatigue, and the cognitive overload of deciphering raw telemetry during a crisis.

By combining zero-lag 3D WebGL rendering with a hybrid, dual-layer AI architecture, this system transforms factory operations from reactive firefighting to predictive, mathematically optimized maintenance.

---

## The Problem: The Industrial Blindspot

During continuous manufacturing operations, standard monitoring infrastructure often falls short:

*   **Reactive Downtime:** Factories wait for machines to physically break before intervening, resulting in catastrophic financial losses and halted production lines.
*   **Alarm Fatigue & Lack of Context:** Traditional SCADA sensors trigger binary alarms (e.g., "Temperature High") but fail to explain why or identify compound faults, forcing engineers to guess the root cause.
*   **Cognitive Overload:** Rendering high-frequency, multi-sensor data streams on standard web dashboards freezes the browser DOM, crippling the user interface exactly when critical alerts are firing.

---

## The Solution: The 5-Pipeline Architecture

This engine is built on a highly decoupled, multi-layered architecture designed specifically to handle high-frequency data without bottlenecking the user interface or the AI processors.

### 1. The Telemetry Simulator (Mathematical Physics Core)
*   **What it does:** Synthesizes realistic, high-speed machine data without requiring physical million-dollar hardware.
*   **How it works:** Uses JSON machine profiles (e.g., CNC Mill, Lathe) to generate baseline operational data. It applies harmonic oscillation (sine waves) and injects Gaussian noise to simulate the unpredictable physical realities of vibration, RPM, temperature, and electrical current.

### 2. The Fast-Filter Brain (scikit-learn Isolation Forest)
*   **What it does:** Detects mathematical anomalies in milliseconds before the data even reaches the dashboard.
*   **How it works:** An unsupervised Machine Learning model acts as a high-speed guard dog. It constantly ingests the raw telemetry stream, calculating rolling variances to generate a real-time Risk Score (0-100%). It identifies that something is wrong without slowing down the pipeline to figure out exactly what it is.

### 3. The Expert Diagnostician (Generative AI)
*   **What it does:** Translates high-risk numerical anomalies into plain-English, actionable engineering instructions.
*   **How it works:** When the ML Fast-Filter triggers a Risk Score above 85%, the system captures the last 30 seconds of telemetry from the database. It feeds this highly specific context window into an LLM via strict prompting, outputting a JSON-structured diagnosis (e.g., "Warning: Combined heat and vibration anomaly. Spindle unbalance detected. Execute E-Stop.").

### 4. The Zero-Lag Digital Twin (React Three Fiber)
*   **What it does:** Provides a live, 60 FPS 3D representation of the physical machines, rendering physical states like spindle rotation and vibration shaking.
*   **How it works:** We abandoned standard React state for high-frequency data. Instead, a custom useRef hook intercepts the Server-Sent Events (SSE) stream from the backend. The telemetry writes directly to a mutable reference tied to the 3D .gltf meshes, bypassing the React DOM entirely to prevent browser freezing.

### 5. The Command Hub & Data Bridge (Flask + SQLite WAL)
*   **What it does:** Routes data, maintains historical logs, and triggers autonomous safety actions.
*   **How it works:** The Python/Flask backend acts as the central router, broadcasting the SSE stream. To prevent database lockups during these high-speed continuous writes, the SQLite database is strictly configured in WAL (Write-Ahead Logging) Mode, allowing real-time telemetry logging to happen concurrently with dashboard read requests.

---

## Tech Stack

### Frontend (The Visual Twin):
*   React.js (Vite)
*   React Three Fiber & Drei (WebGL 3D Canvas)
*   Zustand (Lightweight UI State Management)
*   Tailwind CSS 

### Backend (The Intelligence Core):
*   Python / Flask (Routing & SSE Streaming)
*   scikit-learn / Isolation Forest (Real-Time Anomaly Detection)
*   LLM API Integration (Contextual Diagnostics)
*   SQLite3 with WAL Mode (High-Frequency Persistence)
*   Docker (Containerization & Deployment)
