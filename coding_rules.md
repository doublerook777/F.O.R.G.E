# F.O.R.G.E — Coding Rules & Conventions

## 1. Naming Conventions
- **Files & Directories:** 
  - Frontend components: `PascalCase` (e.g., `ProfileMenu.jsx`)
  - Frontend utilities/hooks: `camelCase` (e.g., `useSSEStream.js`)
  - Backend python files: `snake_case` (e.g., `telemetry_service.py`)
- **Variables & Functions:** `camelCase` in JS, `snake_case` in Python.
- **Constants:** `UPPER_SNAKE_CASE` in both JS and Python.
- **Classes:** `PascalCase` in both JS and Python.

## 2. Architectural Patterns
- **Zero-Lag UI:** High-frequency metrics (like machine RPM or temperature) must NOT be stored in React state (`useState`). Use `useRef` to store the latest value and a `requestAnimationFrame` loop to directly mutate the DOM element's `textContent` or `style`.
- **Global State:** Use Zustand for session state (Auth, active machine selection) but NOT for streaming telemetry data.
- **Backend Services:** Routes (`_routes.py`) must be thin and delegate business logic to services (`_service.py`).
- **Database Access:** Use the centralized `db` connection pool. Write operations should be batched or optimized for WAL-mode concurrency.

## 3. Formatting & Linting
- **Frontend:** ESLint + Prettier. Tailwind classes should be ordered logically (layout -> spacing -> typography -> colors -> effects). Avoid arbitrary values in Tailwind unless necessary; use `index.css` CSS variables instead.
- **Backend:** PEP 8 compliance. Use type hints (`def process(data: dict) -> bool:`) for critical functions to improve clarity.
