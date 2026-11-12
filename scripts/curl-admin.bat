@echo off
setlocal EnableExtensions
set "AUTH_URL=http://localhost:3001"

if not defined ADMIN_EMAIL set "ADMIN_EMAIL=admin@bonosverde.com"
if not defined ADMIN_PASSWORD set "ADMIN_PASSWORD=admin123"

set "LOGIN_FILE=%TEMP%\bonos_admin_login.json"
set "USERS_FILE=%TEMP%\bonos_admin_users.json"
set "TOKEN="
set "TEMP_ID="

echo BonosVerde - modo administrador
echo Admin: %ADMIN_EMAIL%
echo.

curl.exe -s -X POST "%AUTH_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%ADMIN_EMAIL%\",\"password\":\"%ADMIN_PASSWORD%\"}" ^
  -o "%LOGIN_FILE%"

for /f "usebackq delims=" %%T in (`node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!j.data||!j.data.token)process.exit(1);process.stdout.write(j.data.token)" "%LOGIN_FILE%"`) do set "TOKEN=%%T"

if not defined TOKEN (
  echo [ERROR] No se pudo obtener el token de administrador.
  del "%LOGIN_FILE%" >nul 2>&1
  exit /b 1
)

del "%LOGIN_FILE%" >nul 2>&1

echo ### Estadisticas generales
curl.exe -s "%AUTH_URL%/api/admin/stats" -H "Authorization: Bearer %TOKEN%"
echo.
echo ### Busqueda de usuarios
curl.exe -s "%AUTH_URL%/api/admin/users?search=inversor" -H "Authorization: Bearer %TOKEN%"
echo.
echo ### Busqueda de bonos activos
curl.exe -s "%AUTH_URL%/api/admin/bonds?status=ACTIVE" -H "Authorization: Bearer %TOKEN%"
echo.
echo ### Busqueda de transacciones completadas
curl.exe -s "%AUTH_URL%/api/admin/transactions?status=COMPLETED" -H "Authorization: Bearer %TOKEN%"
echo.
echo ### Referidos
curl.exe -s "%AUTH_URL%/api/admin/referrals" -H "Authorization: Bearer %TOKEN%"
echo.

set "TEMP_EMAIL=curl-demo-%RANDOM%@bonosverde.com"
echo ### Registro temporal (POST): %TEMP_EMAIL%
curl.exe -s -X POST "%AUTH_URL%/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%TEMP_EMAIL%\",\"name\":\"Usuario Curl Demo\",\"password\":\"demo12345\"}"
echo.

curl.exe -s "%AUTH_URL%/api/admin/users?search=%TEMP_EMAIL%" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -o "%USERS_FILE%"

for /f "usebackq delims=" %%I in (`node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!j.data||!j.data[0])process.exit(1);process.stdout.write(String(j.data[0].id))" "%USERS_FILE%"`) do set "TEMP_ID=%%I"

del "%USERS_FILE%" >nul 2>&1

if not defined TEMP_ID (
  echo [ERROR] No se encontro el usuario temporal.
  exit /b 1
)

echo ### Cambio de rol temporal (PUT): usuario %TEMP_ID%
curl.exe -s -X PUT "%AUTH_URL%/api/admin/users/%TEMP_ID%/role" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"role\":\"PREMIUM\"}"
echo.
echo ### Eliminacion del usuario temporal (DELETE): usuario %TEMP_ID%
curl.exe -s -X DELETE "%AUTH_URL%/api/admin/users/%TEMP_ID%" ^
  -H "Authorization: Bearer %TOKEN%"
echo.
echo Modo administrador finalizado.
