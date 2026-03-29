@echo off
setlocal

set "ROOT=%~dp0"
set "PORT=3001"
set "URL=http://127.0.0.1:%PORT%"
set "SERVER_TITLE=gongkao-manager"

cd /d "%ROOT%"

call :isPortOpen
if not errorlevel 1 (
  call :openBrowser
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 goto :missingRuntime

where npm >nul 2>nul
if errorlevel 1 goto :missingRuntime

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo Building latest version...
call npm run build
if errorlevel 1 goto :error

start "%SERVER_TITLE%" /min cmd /k "cd /d ""%ROOT%"" && npm run start:local"

call :waitForServer
if errorlevel 1 goto :error

call :openBrowser
exit /b 0

:missingRuntime
echo Node.js or npm was not found in PATH.
echo Install Node.js, then reopen this launcher.
pause
exit /b 1

:error
echo Failed to start gongkao-manager.
echo If a new terminal window opened, check its output for the exact error.
pause
exit /b 1

:isPortOpen
powershell -NoProfile -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', %PORT%); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>nul
exit /b %errorlevel%

:waitForServer
for /l %%I in (1,1,45) do (
  call :isPortOpen
  if not errorlevel 1 exit /b 0
  timeout /t 1 /nobreak >nul
)
echo Timed out waiting for %URL%.
exit /b 1

:openBrowser
powershell -NoProfile -Command "Start-Process '%URL%'" >nul 2>nul
if errorlevel 1 start "" "%URL%"
exit /b 0
