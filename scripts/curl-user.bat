@echo off
setlocal EnableExtensions
set "AUTH_URL=http://localhost:3001"
set "BONDS_URL=http://localhost:3002"
set "PAYMENTS_URL=http://localhost:3003"
set "REFERRALS_URL=http://localhost:3004"

if not defined USER_EMAIL set "USER_EMAIL=inversor@bonosverde.com"
if not defined USER_PASSWORD set "USER_PASSWORD=inversor123"

set "LOGIN_FILE=%TEMP%\bonos_user_login.json"
set "TOKEN="

echo BonosVerde - modo usuario
echo Usuario: %USER_EMAIL%
echo.

curl.exe -s -X POST "%AUTH_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%USER_EMAIL%\",\"password\":\"%USER_PASSWORD%\"}" ^
  -o "%LOGIN_FILE%"

for /f "usebackq delims=" %%T in (`node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!j.data||!j.data.token)process.exit(1);process.stdout.write(j.data.token)" "%LOGIN_FILE%"`) do set "TOKEN=%%T"

if not defined TOKEN (
  echo [ERROR] No se pudo obtener el token. Verifica que el servicio auth este activo.
  del "%LOGIN_FILE%" >nul 2>&1
  exit /b 1
)

del "%LOGIN_FILE%" >nul 2>&1

echo ### Perfil del usuario
curl.exe -s "%AUTH_URL%/api/auth/profile" -H "Authorization: Bearer %TOKEN%"
echo.
echo ### Catalogo (busqueda oxigeno)
curl.exe -s "%BONDS_URL%/api/bonds/catalog?search=oxigeno"
echo.
echo ### Compra simulada de bono
curl.exe -s -X POST "%BONDS_URL%/api/bonds/purchase" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"bondType\":\"OXYGEN\",\"paymentMethod\":\"SIMULATED\"}"
echo.
echo ### Mis bonos
curl.exe -s "%BONDS_URL%/api/bonds/my-bonds" -H "Authorization: Bearer %TOKEN%"
echo.
echo ### Pago simulado
curl.exe -s -X POST "%PAYMENTS_URL%/api/payments/simulate" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"bondType\":\"FAUNA\",\"paymentMethod\":\"SIMULATED\"}"
echo.
echo ### Referidos
curl.exe -s "%REFERRALS_URL%/api/referrals/stats" -H "Authorization: Bearer %TOKEN%"
echo.
echo Modo usuario finalizado.
