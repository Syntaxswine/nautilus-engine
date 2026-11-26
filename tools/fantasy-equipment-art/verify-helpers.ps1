# Read only native identity checks for this task's recorded disposable lifetimes.
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$runs = @('fantasy-equipment-art-review', 'fantasy-equipment-art-lifecycle')
$checks = @()
foreach ($run in $runs) {
    $recordPath = Join-Path $taskRoot "artifacts/$run/helper-history.jsonl"
    foreach ($line in Get-Content -LiteralPath $recordPath) {
        $record = $line | ConvertFrom-Json
        if ($record.owner -ne '01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3') { throw 'Unexpected helper owner.' }
        $identities = @()
        foreach ($identity in @($record.process, $record.browser)) {
            $live = Get-Process -Id $identity.pid -ErrorAction SilentlyContinue
            $sameLifetime = $false
            $observedCreation = $null
            if ($live) {
                $observedCreation = $live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()
                $sameLifetime = $observedCreation -eq $identity.creationFiletime
            }
            if ($sameLifetime) { throw "Recorded disposable helper is still alive: $($identity.pid)." }
            $identities += [pscustomobject]@{ pid=$identity.pid; recordedCreation=$identity.creationFiletime; observedCreation=$observedCreation; sameLifetimeAlive=$sameLifetime; status=$(if ($live) {'PID belongs to a different lifetime; left untouched'} else {'exited'}) }
        }
        $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $record.port -ErrorAction SilentlyContinue)
        if ($listeners.Count -gt 0) { throw "Review port still listening: $($record.port)." }
        $checks += [pscustomobject]@{ purpose=$record.purpose; startedAt=$record.startedAt; expiry=$record.expiresAt; port=$record.port; portReleased=$true; identities=$identities }
    }
}
$receipt = [pscustomobject]@{ verifiedAt=(Get-Date).ToUniversalTime().ToString('o'); method='Native PowerShell process PID + creation time, and Get-NetTCPConnection listen checks; no processes stopped'; checks=$checks; retainedHelpers=@() }
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRoot 'docs/reviews/fantasy-equipment/art/helper-verification.json') -Encoding utf8
Write-Output "Verified $($checks.Count) recorded disposable runs exited and their ports were released."
