@echo off
set PORT=5500
echo Iniciando servidor local en http://localhost:%PORT% ...
cd /d %~dp0
powershell -Command "try { py --version } catch { }"
if %ERRORLEVEL%==0 (
  start "" http://localhost:%PORT%/dashboard.html
  py -m http.server %PORT%
) else (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 (
    start "" http://localhost:%PORT%/dashboard.html
    python -m http.server %PORT%
  ) else (
    echo Python no encontrado. Intentando npx http-server...
    start "" http://localhost:%PORT%/dashboard.html
    npx http-server -p %PORT%
  )
)
