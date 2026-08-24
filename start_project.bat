@echo off
echo ============================================
echo   Starting Threat Reconstruction Dashboard
echo ============================================

echo.
echo [1/3] Generating fresh telemetry data...
cd backend
python generate_telemetry.py
if errorlevel 1 (
    echo ERROR: Failed to generate telemetry data.
    pause
    exit /b 1
)

echo.
echo [2/3] Starting Flask backend in a new window...
start "Backend - Flask" cmd /k "cd /d %~dp0backend && python app.py"

echo.
echo [3/3] Starting Next.js frontend in a new window...
timeout /t 3 /nobreak >nul
start "Frontend - Next.js" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   Both servers are starting in separate windows.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ============================================
echo.
echo Close this window or press any key to exit
echo (backend and frontend windows will keep running).
pause >nul
