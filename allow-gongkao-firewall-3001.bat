@echo off
setlocal

echo This script must be run as Administrator.
echo.

net session >nul 2>nul
if errorlevel 1 (
  echo Please right-click this file and choose "Run as administrator".
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="gongkao-manager-3001" >nul 2>nul
netsh advfirewall firewall add rule name="gongkao-manager-3001" dir=in action=allow protocol=TCP localport=3001 profile=private

if errorlevel 1 (
  echo Failed to create the firewall rule for port 3001.
  pause
  exit /b 1
)

echo.
echo Firewall rule created successfully:
echo   gongkao-manager-3001
echo   TCP 3001 inbound, Private profile
echo.
echo If your current network is marked as Public, switch it to Private in Windows network settings first.
pause
exit /b 0
