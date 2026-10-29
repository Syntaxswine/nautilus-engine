$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$records = Get-Content -LiteralPath (Join-Path $projectRoot 'artifacts/silo-review/helper-history.jsonl') | ForEach-Object { $_ | ConvertFrom-Json }
$checks = foreach ($record in $records) {
  $identities = foreach ($item in @($record.process, $record.browser)) {
    $live = Get-Process -Id $item.pid -ErrorAction SilentlyContinue
    $same = $null -ne $live -and $live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq $item.creationFiletime
    if ($same) { throw "Task helper lifetime is still active: $($item.pid)" }
    [pscustomobject]@{ pid=$item.pid; creationFiletime=$item.creationFiletime; executable=$item.executable; exactLifetimeEnded=$true }
  }
  $listeners = @(Get-NetTCPConnection -LocalPort $record.port -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -ne 0) { throw "Review port remains bound: $($record.port)" }
  [pscustomobject]@{ startedAt=$record.startedAt; processes=@($identities); port=$record.port; portReleased=$true }
}
$report = [pscustomobject]@{ verifiedAt=(Get-Date).ToUniversalTime().ToString('o'); retainedHelpers=0; checks=@($checks) } | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'helper-cleanup.json'), $report + "`n", [Text.UTF8Encoding]::new($false))
Write-Output "Verified $(@($checks).Count) review lifetimes; no retained helpers or bound review ports."
