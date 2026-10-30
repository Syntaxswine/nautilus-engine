param([string]$RecordFolder='artifacts/functional-parts-kit-review')
$ErrorActionPreference='Stop'
$taskRoot=(Get-Location).Path
$history=Join-Path $taskRoot (Join-Path $RecordFolder 'helper-history.jsonl')
if(-not (Test-Path -LiteralPath $history)){throw 'No native-kit helper records to verify.'}
$checks=@()
foreach($line in Get-Content -LiteralPath $history){
  $record=$line|ConvertFrom-Json
  $identities=@()
  foreach($identity in @($record.process,$record.browser)){
    $live=Get-Process -Id $identity.pid -ErrorAction SilentlyContinue
    $sameLifetime=$false
    if($null -ne $live){$sameLifetime=($live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq $identity.creationFiletime) -and ($live.Path -eq $identity.executable)}
    $identities += [pscustomobject]@{pid=$identity.pid;creationFiletime=$identity.creationFiletime;executable=$identity.executable;exactLifetimeEnded=(-not $sameLifetime)}
    if($sameLifetime){throw ('Native-kit helper is still running: '+$identity.pid)}
  }
  $listeners=@(Get-NetTCPConnection -State Listen -LocalPort $record.port -ErrorAction SilentlyContinue)
  if($listeners.Count -ne 0){throw ('Recorded native-kit port is still in use: '+$record.port)}
  $checks += [pscustomobject]@{startedAt=$record.startedAt;processes=$identities;port=$record.port;portReleased=$true}
}
$receipt=[pscustomobject]@{verifiedAt=[DateTime]::UtcNow.ToString('o');retainedHelpers=0;checks=$checks;note='Exact task process lifetimes ended and all recorded ports released; no user/app-managed browser was touched.'}
$receipt|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $taskRoot 'docs/reviews/functional-parts-kit/helper-cleanup.json') -Encoding utf8
Write-Output ('Verified '+$checks.Count+' native-kit review lifetimes; retained helpers: 0.')
