@echo off
echo Deteniendo BonosVerde con Docker Compose...
docker compose down
echo.
echo Para borrar tambien la base de datos ejecuta:
echo   docker compose down -v
echo.
pause
