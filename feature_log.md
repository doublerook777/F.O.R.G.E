# F.O.R.G.E — Feature & Change Log

This log tracks all major features, bug fixes, and architectural decisions. I will update this file automatically as we iterate through the project.

## Phase 2: AI & LLM Integration (Completed)
- **[Feature] Gemini Integration:** Created `gemini_client.py` and connected it to `diagnosis_service`. The system now fetches a 30s rolling context window from SQLite to feed into the LLM for Root Cause Analysis.
- **[Fix] Profile Menu CSS Clipping:** Fixed a z-index stacking context issue in `OperatorDashboard` where the profile dropdown rendered behind the main content. Added `sticky top-0 z-50` to the header.
- **[Feature] UI/UX Overhaul:** 
  - Replaced all placeholder emojis with `lucide-react` SVG icons across all dashboards.
  - Redesigned `ProfileMenu` to mimic a dynamic, browser-style profile dropdown (hero section, machine status list, bottom actions).
  - Replaced the primary app logo from a `Settings` icon to an `Activity` icon to resolve UX confusion, consolidating actual settings under the Profile menu.
- **[Feature] Fleet Component Dashboard:** Created a Master-Detail UI workflow. 
  - Added `/components` route for a high-level visual grid of all active components.
  - Added `/components/:id` route for an isolated, dedicated simulation view of a single component.
  - Implemented a unified top navigation bar across all dashboards for quick switching between views.

## Phase 1: Core Telemetry Engine (Completed)
- **[Feature] Physics Simulator:** Established the `generator.py` background thread to simulate realistic machine fault curves (thermal runaway, bearing wear).
- **[Feature] ML Engine:** Integrated `scikit-learn` Isolation Forest for real-time, low-latency anomaly detection.
- **[Feature] Zero-Lag Frontend:** Implemented `useSSEStream.js` hook utilizing `useRef` and `requestAnimationFrame` to consume 10Hz SSE telemetry without freezing the React Virtual DOM.
- **[Decision] Database Architecture:** Selected SQLite with WAL (Write-Ahead Logging) mode to handle the high-throughput concurrent writes from the simulator while serving reads to the ML engine and frontend.
