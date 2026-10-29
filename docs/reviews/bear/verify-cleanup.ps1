param([string]$RecordFolder = 'artifacts/bear-source-review')
$ErrorActionPreference = 'Stop'
$taskRoot = (Get-Location).Path
$history = Join-Path $taskRoot (Join-Path $RecordFolder 'helper-history.jsonl')
if (-not (Test-Path -LiteralPath $history)) { throw 'No task helper records to verify.' }
$checks = @()
foreach ($line in Get-Content -LiteralPath $history) {
  $record = $line | ConvertFrom-Json
  $identities = @()
  foreach ($identity in @($record.process, $record.browser)) {
    $live = Get-Process -Id $identity.pid -ErrorAction SilentlyContinue
    $sameLifetime = $false
    if ($null -ne $live) {
      $sameLifetime = ($live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq $identity.creationFiletime) -and ($live.Path -eq $identity.executable)
    }
    $identities += [pscustomobject]@{pid=$identity.pid; creationFiletime=$identity.creationFiletime; executable=$identity.executable; exactLifetimeEnded=(-not $sameLifetime)}
    if ($sameLifetime) { throw ('Task helper is still running: ' + $identity.pid) }
  }
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $record.port -ErrorAction SilentlyContinue)
  if ($listeners.Count -ne 0) { throw ('Recorded task port is still in use: ' + $record.port) }
  $checks += [pscustomobject]@{startedAt=$record.startedAt; processes=$identities; port=$record.port; portReleased=$true}
}
$receipt = [pscustomobject]@{verifiedAt=[DateTime]::UtcNow.ToString('o'); retainedHelpers=0; checks=$checks; note='Exact task lifetimes ended and all recorded ports released. No user or application-managed browser was touched.'}
$receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'source-helper-cleanup.json') -Encoding utf8
Write-Output ('Verified ' + $checks.Count + ' helper lifetimes; retained helpers: 0.')
