$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$port = if ($env:GONGKAO_PORT) { [int]$env:GONGKAO_PORT } else { 3001 }
$hostName = if ($env:GONGKAO_BIND_HOST) { $env:GONGKAO_BIND_HOST } else { "127.0.0.1" }
$accessHost = if ($hostName -eq "0.0.0.0") { "127.0.0.1" } else { $hostName }
$url = "http://{0}:{1}" -f $accessHost, $port

function Test-PortOpen {
  param(
    [int]$Port
  )

  try {
    $client = [Net.Sockets.TcpClient]::new()
    $client.Connect("127.0.0.1", $Port)
    $client.Dispose()
    return $true
  } catch {
    if ($client) {
      $client.Dispose()
    }
    return $false
  }
}

function Get-ManagedProcessOnPort {
  param(
    [int]$Port,
    [string]$RootPath
  )

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if (-not $connection) {
    return $null
  }

  $process = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $connection.OwningProcess) -ErrorAction SilentlyContinue
  if (-not $process) {
    return $null
  }

  if ($process.CommandLine -match [regex]::Escape($RootPath) -and $process.CommandLine -match 'next.*\b(start|dev)\b') {
    return $process
  }

  return $null
}

function Wait-ForPortState {
  param(
    [int]$Port,
    [bool]$ShouldBeOpen,
    [int]$Attempts = 45
  )

  for ($i = 0; $i -lt $Attempts; $i++) {
    $isOpen = Test-PortOpen -Port $Port
    if ($isOpen -eq $ShouldBeOpen) {
      return $true
    }

    Start-Sleep -Seconds 1
  }

  return $false
}

function Show-AccessHints {
  param(
    [string]$BindHost,
    [string]$OpenUrl,
    [int]$Port
  )

  if ($BindHost -ne "0.0.0.0") {
    return
  }

  Write-Host ""
  Write-Host "This server is now listening on all network interfaces."
  Write-Host "Open it locally:"
  Write-Host ("  {0}" -f $OpenUrl)
  Write-Host "Open it from another device on the same LAN:"

  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress -Unique

  if (-not $ips) {
    $ips = [Net.Dns]::GetHostAddresses([Net.Dns]::GetHostName()) |
      Where-Object {
        $_.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork -and
        $_.IPAddressToString -notlike '127.*'
      } |
      ForEach-Object { $_.IPAddressToString } |
      Select-Object -Unique
  }

  foreach ($ip in $ips) {
    Write-Host ("  http://{0}:{1}/" -f $ip, $Port)
  }

  Write-Host ""
  Write-Host ("If another device still cannot open the site, allow port {0} in Windows Firewall." -f $Port)
}

try {
  if (Test-PortOpen -Port $port) {
    $managedProcess = Get-ManagedProcessOnPort -Port $port -RootPath $root
    if ($managedProcess) {
      Write-Host ("Restarting existing gongkao-manager process on port {0}..." -f $port)
      Stop-Process -Id $managedProcess.ProcessId -Force

      if (-not (Wait-ForPortState -Port $port -ShouldBeOpen $false -Attempts 20)) {
        throw ("Timed out waiting for the old process on port {0} to stop." -f $port)
      }
    } else {
      Write-Host ("Port {0} is already in use by another process." -f $port)
      Write-Host "Opened the current service in your browser without restarting it."
      Start-Process $url
      Show-AccessHints -BindHost $hostName -OpenUrl $url -Port $port
      exit 0
    }
  }

  if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js or npm was not found in PATH. Install Node.js, then reopen this launcher."
  }

  if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "Installing dependencies..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }

  Write-Host "Building latest version..."
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $serverCommand = "cd /d `"{0}`" && node_modules\.bin\next.cmd start --hostname {1} --port {2}" -f $root, $hostName, $port
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $serverCommand -WindowStyle Minimized | Out-Null

  if (-not (Wait-ForPortState -Port $port -ShouldBeOpen $true -Attempts 45)) {
    throw ("Timed out waiting for {0}." -f $url)
  }

  Start-Process $url
  Show-AccessHints -BindHost $hostName -OpenUrl $url -Port $port
  exit 0
} catch {
  Write-Error $_
  exit 1
}
