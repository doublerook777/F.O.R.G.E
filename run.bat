@echo off
echo ===================================================
echo   F.O.R.G.E - Launching Full-Stack Application
echo ===================================================

:: Check if setup has been run
if not exist "backend\venv" (
    echo [ERROR] Backend virtual environment not found!
    echo Please run setup.bat first.
    pause
    exit /b
)

if not exist "frontend\node_modules" (
    echo [ERROR] Frontend node modules not found!
    echo Please run setup.bat first.
    pause
    exit /b
)

echo.
echo [1/2] Starting Python Flask Backend Server (Port 5000)...
start "FORGE Backend" cmd /k "cd backend && call venv\Scripts\activate && python app.py"

echo [2/2] Starting React Vite Frontend Server (Port 5173)...
start "FORGE Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   Both services are starting in separate windows.
echo   - Backend: http://localhost:5000
echo   - Frontend: http://localhost:5173
echo.
echo   Keep the command windows open to keep the 
echo   services running. Close them to shut down.
echo ===================================================
pause
