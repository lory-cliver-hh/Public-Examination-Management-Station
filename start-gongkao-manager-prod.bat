@echo off
setlocal

set "ROOT=%~dp0"
set "PORT=3001"
set "URL=http://127.0.0.1:%PORT%"

cd /d "%ROOT%"

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if %errorlevel%==0 (
  start "" "%URL%"
  exit /b 0
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

if not exist ".next\BUILD_ID" (
  echo Building project...
  call npm run build
  if errorlevel 1 goto :error
)

start "gongkao-manager" /min cmd /c "cd /d \"%ROOT%\" && npm run start:local"

timeout /t 4 /nobreak >nul
start "" "%URL%"
exit /b 0

:error
echo Failed to start gongkao-manager.
pause
exit /b 1
