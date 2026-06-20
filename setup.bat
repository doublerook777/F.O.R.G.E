@echo off
echo ===================================================
echo   F.O.R.G.E - Initializing Environment Setup
echo ===================================================

echo.
echo [1/2] Setting up Backend Virtual Environment...
cd backend
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Python dependencies...
pip install -r requirements.txt
cd ..

echo.
echo [2/2] Setting up Frontend Node Modules...
cd frontend
echo Installing NPM dependencies...
call npm install
cd ..

echo.
echo ===================================================
echo   Setup Complete! 
echo   You can now launch the platform by running:
echo   run.bat
echo ===================================================
pause
