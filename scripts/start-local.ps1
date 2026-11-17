param(
  [ValidateSet('start', 'stop', 'status')][string]$Action = 'start',
  [switch]$Build
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runDirectory = Join-Path $projectRoot '.local\run'
$stateFile = Join-Path $runDirectory 'app.json'
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source

function Get-OwnedProcess($entry) {
  $found = Get-Process -Id ([int]$entry.id) -ErrorAction SilentlyContinue
  if (-not $found) { return $null }
  if ($found.ProcessName -ne 'node' -or $found.StartTime.ToUniversalTime().Ticks.ToString() -ne [string]$entry.startedUtcTicks) {
    throw 'O PID registrado pertence a outro processo. Nenhum processo diferente sera encerrado.'
  }
  return $found
}
function Read-State {
  if (-not (Test-Path -LiteralPath $stateFile)) { return $null }
  $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  if ($state.root -ne $projectRoot) { throw 'Registro de execucao pertence a outro projeto.' }
  return $state
}
function Stop-Owned($state) {
  if ($state) {
    # Validar os dois antes de encerrar qualquer um. Nunca encerrar por nome ou porta.
    $api = Get-OwnedProcess $state.api
    $web = Get-OwnedProcess $state.web
    if ($web) { Stop-Process -Id $web.Id -Force -ErrorAction Stop }
    if ($api) { Stop-Process -Id $api.Id -Force -ErrorAction Stop }
    Remove-Item -LiteralPath $stateFile -ErrorAction Stop
  }
}
function Assert-FreePort([int]$port) {
  $probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
  try { $probe.Start() } catch { throw "A porta $port esta ocupada. Nenhum processo externo foi encerrado." } finally { $probe.Stop() }
}
function Entry($processInfo) {
  return @{ id = $processInfo.Id; startedUtcTicks = $processInfo.StartTime.ToUniversalTime().Ticks.ToString() }
}

Push-Location $projectRoot
try {
  $state = Read-State
  if ($Action -eq 'status') {
    if ($state -and (Get-OwnedProcess $state.api) -and (Get-OwnedProcess $state.web)) { Write-Output "Aplicacao em execucao: $($state.webOrigin)" }
    else { Write-Output 'Aplicacao local parada ou incompleta.' }
    exit 0
  }
  if ($Action -eq 'stop') { Stop-Owned $state; Write-Output 'Aplicacao local encerrada. PostgreSQL e dados preservados.'; exit 0 }
  Stop-Owned $state
  if ($Build) {
    & npm.cmd run db:local
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel preparar o banco local.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha na compilacao; aplicacao nao iniciada.' }
  }
  $settingsJson = & $nodeExe (Join-Path $PSScriptRoot 'local-app-config.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Verifique a configuracao local do projeto.' }
  $settings = $settingsJson | ConvertFrom-Json
  if (-not (Test-Path -LiteralPath $settings.apiEntry) -or -not (Test-Path -LiteralPath (Join-Path $settings.webDirectory 'dist\index.html'))) { throw 'Execute npm run build antes de iniciar.' }
  Assert-FreePort $settings.apiPort
  Assert-FreePort $settings.webPort
  New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
  $api = $null; $web = $null
  try {
    $api = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $settings.apiEntry + '"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runDirectory 'api.out.log') -RedirectStandardError (Join-Path $runDirectory 'api.err.log') -PassThru
    $web = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $settings.webEntry + '"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runDirectory 'web.out.log') -RedirectStandardError (Join-Path $runDirectory 'web.err.log') -PassThru
    $newState = @{ root = $projectRoot; webOrigin = $settings.webOrigin; api = (Entry $api); web = (Entry $web) }
    $newState | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $stateFile -Encoding UTF8
    $ready = $false
    # O carregamento inicial de modulos levou 27 s neste Windows; manter uma
    # janela limitada de prontidao sem encerrar uma API ainda inicializando.
    Write-Output 'Iniciando aplicacao; aguardando API e PostgreSQL (ate 90 segundos)...'
    $startupTimer = [Diagnostics.Stopwatch]::StartNew()
    while ($startupTimer.Elapsed.TotalSeconds -lt 90) {
      if ($api.HasExited -or $web.HasExited) { break }
      & $nodeExe (Join-Path $PSScriptRoot 'local-app-config.mjs') --check $settings.webOrigin
      if ($LASTEXITCODE -eq 0) { $ready = $true; break }
      Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'A inicializacao falhou. Consulte .local/run/api.err.log e web.err.log.' }
    Write-Output "Aplicacao pronta: $($settings.webOrigin)/"
    Write-Output 'Execucao local compilada, com dois processos e sem watchers. Use npm run app:stop para encerrar.'
  } catch {
    if ($web -and -not $web.HasExited) { Stop-Process -Id $web.Id -Force -ErrorAction SilentlyContinue }
    if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
    throw
  }
} finally { Pop-Location }
