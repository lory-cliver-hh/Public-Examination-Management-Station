@echo off
setlocal

set "ROOT=%~dp0"
set "PORT=3001"
set "URL=http://127.0.0.1:%PORT%"

cd /d "%ROOT%"

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if %errorlevel%==0 (
  call :openBrowser
  exit /b 0
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo Building latest version...
call npm run build
if errorlevel 1 goto :error

start "gongkao-manager" /min cmd /c "cd /d \"%ROOT%\" && npm run start:local"

timeout /t 6 /nobreak >nul
call :openBrowser
exit /b 0

:error
echo Failed to start gongkao-manager.
pause
exit /b 1

:openBrowser
powershell -NoProfile -Command "Start-Process '%URL%'" >nul 2>nul
if errorlevel 1 start "" "%URL%"
exit /b 0
