@echo off
echo ===================================
echo   BonosVerde - Docker Compose
echo ===================================
echo.
docker compose up --build -d
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar Docker Compose.
  pause
  exit /b 1
)
echo.
echo Sistema iniciado:
echo   Frontend: http://localhost:8080
echo   Auth API: http://localhost:3001
echo   Bonds API: http://localhost:3002
echo   Payments API: http://localhost:3003
echo   Referrals API: http://localhost:3004
echo.
pause
