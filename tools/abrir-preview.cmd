@echo off
rem Abre a pre-visualizacao da agenda no browser, arrancando o servidor se for preciso.
rem Uso: duplo clique neste ficheiro, ou com "noopen" para nao abrir o browser.
setlocal
set "PORT=8080"
set "URL=http://127.0.0.1:%PORT%/"

powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo A iniciar a pre-visualizacao na porta %PORT%...
  powershell -NoProfile -Command "Start-Process -FilePath 'pythonw.exe' -ArgumentList '%~dp0preview.py','--port','%PORT%' -WindowStyle Hidden"
  ping -n 3 127.0.0.1 >nul
)

if /I "%~1"=="noopen" (
  echo Servidor de pre-visualizacao em %URL%
  endlocal
  exit /b 0
)

start "" "%URL%"
endlocal
