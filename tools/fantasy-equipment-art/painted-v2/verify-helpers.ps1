$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$checks = @()
foreach ($run in @('fantasy-painted-weapons-inspect','fantasy-painted-weapons-review','fantasy-painted-weapons-lifecycle')) {
  $recordPath = Join-Path $taskRoot "artifacts/$run/helper-history.jsonl"
  foreach ($line in Get-Content -LiteralPath $recordPath) {
    $record = $line | ConvertFrom-Json
    if ($record.owner -ne '01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3') { throw 'Unexpected helper owner.' }
    $identities = @()
    foreach ($identity in @($record.process,$record.browser)) {
      $live = Get-Process -Id $identity.pid -ErrorAction SilentlyContinue
      $observed = $null
      if ($live) { $observed = $live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() }
      if ($observed -eq $identity.creationFiletime) { throw "Owned helper still alive: $($identity.pid)." }
      $identities += [pscustomobject]@{pid=$identity.pid;creationFiletime=$identity.creationFiletime;observedCreation=$observed;sameLifetimeAlive=$false;status=$(if($live){'different lifetime; untouched'}else{'exited'})}
    }
    if (@(Get-NetTCPConnection -State Listen -LocalPort $record.port -ErrorAction SilentlyContinue).Count) { throw "Review port still listening: $($record.port)." }
    $checks += [pscustomobject]@{purpose=$record.purpose;started=$record.startedAt;expiry=$record.expiresAt;port=$record.port;released=$true;identities=$identities}
  }
}
$report = [pscustomobject]@{verifiedAt=(Get-Date).ToUniversalTime().ToString('o');method='Native PID plus creation time and port listen checks; no process termination';runs=$checks;retainedHelpers=@();earlyLaunchFailure='One initial node-e launch failed before identity metadata due missing script path. Shared helper awaited supported browser/server close in finally and its command exited1. Subsequent durable-script runs have the exact native records above.'}
$report | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $taskRoot 'docs/reviews/fantasy-equipment/art/painted-v2/helper-verification.json') -Encoding utf8
Write-Output "Verified $($checks.Count) recorded lifetimes exited and ports released; no retained helpers."
