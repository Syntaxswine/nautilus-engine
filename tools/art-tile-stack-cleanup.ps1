param([ValidateSet('source','installed')][string]$Mode='source')
$taskRoot=Split-Path -Parent $PSScriptRoot
$historyPath=Join-Path $taskRoot "artifacts/art-tile-stack-$Mode/helper-history.jsonl"
$rows=@()
foreach($line in Get-Content -LiteralPath $historyPath){
 $entry=$line|ConvertFrom-Json
 $identities=@()
 foreach($record in @($entry.process,$entry.browser)){
  $live=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
  $same=$false
  if($null -ne $live){$same=($live.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq $record.creationFiletime) -and ($live.Path -eq $record.executable)}
  if($same){throw "Task-owned helper lifetime still running: $($record.pid)"}
  $identities+=@{original=$record;originalLifetimeGone=$true;pidReused=($null -ne $live)}
 }
 $listeners=@(Get-NetTCPConnection -LocalPort $entry.port -State Listen -ErrorAction SilentlyContinue)
 if($listeners.Count -gt 0){throw "Review port still listening: $($entry.port)"}
 $rows+=@{startedAt=$entry.startedAt;purpose=$entry.purpose;port=$entry.port;portReleased=$true;identities=$identities;restart=$entry.restart;stopMethod=$entry.stopMethod}
}
$result=@{status='pass';mode=$Mode;verifiedAt=[DateTime]::UtcNow.ToString('o');lifetimes=$rows;method='Read-only exact PID + creation FILETIME + executable check after supported browser/server close; no process termination.'}
$target=Join-Path $taskRoot "docs/reviews/tile-stack/art/$Mode-helper-retirement.json"
[System.IO.File]::WriteAllText($target,(($result|ConvertTo-Json -Depth 20).Replace("`r`n","`n")+"`n"),[System.Text.UTF8Encoding]::new($false))
Write-Output "Verified $($rows.Count) $Mode helper lifetimes gone and all ports released."
