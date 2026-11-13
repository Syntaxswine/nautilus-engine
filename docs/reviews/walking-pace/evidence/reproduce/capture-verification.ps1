$taskRecords=@()
foreach($taskFile in @('artifacts/walking-pace/full-tests-process.json','artifacts/walking-pace/check-process.json')){if(Test-Path -LiteralPath $taskFile){$taskRecords+=Get-Content -LiteralPath $taskFile -Raw | ConvertFrom-Json}}
$taskRecords+=Get-Content artifacts/walking-pace/gates-process-history.jsonl | ForEach-Object {$_ | ConvertFrom-Json}
if(Test-Path -LiteralPath artifacts/walking-pace/post-process-history.jsonl){$taskRecords+=Get-Content artifacts/walking-pace/post-process-history.jsonl | ForEach-Object {$_ | ConvertFrom-Json}}
$taskSnapshot=@(Get-CimInstance Win32_Process)
$taskIdentities=@($taskRecords | ForEach-Object {[pscustomobject]@{pid=[int]$_.pid;creationFiletime=$_.creationFiletime;executable=$_.executable;purpose=$_.purpose;kind='recorded managed gate shell'}})
if(Test-Path -LiteralPath artifacts/walking-pace/verification-processes.json){$taskIdentities+=Get-Content artifacts/walking-pace/verification-processes.json -Raw | ConvertFrom-Json}
$taskQueue=@()
foreach($taskRecord in $taskRecords){$taskLive=Get-Process -Id $taskRecord.pid -ErrorAction SilentlyContinue;if($taskLive -and $taskLive.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -eq $taskRecord.creationFiletime){$taskQueue+=@{pid=[int]$taskRecord.pid;creation=[decimal]$taskRecord.creationFiletime;purpose=$taskRecord.purpose}}}
while($taskQueue.Count){$taskNext=@();foreach($taskParent in $taskQueue){foreach($taskChild in @($taskSnapshot | Where-Object {$_.ParentProcessId -eq $taskParent.pid})){
  $taskLive=Get-Process -Id $taskChild.ProcessId -ErrorAction SilentlyContinue
  if(!$taskLive){continue};$taskCreated=$taskLive.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()
  if([decimal]$taskCreated -lt $taskParent.creation){continue};if($taskLive.Id -eq 17568){throw 'Protected Architect preview must never enter this task tree.'}
  $taskIdentities+=[pscustomobject]@{pid=$taskLive.Id;creationFiletime=$taskCreated;executable=$taskLive.Path;purpose=$taskParent.purpose;kind='verified descendant of live exact task shell'}
  $taskNext+=@{pid=$taskLive.Id;creation=[decimal]$taskCreated;purpose=$taskParent.purpose}
}};$taskQueue=$taskNext}
$taskIdentities=@($taskIdentities | Group-Object { $_.pid.ToString()+'/'+$_.creationFiletime } | ForEach-Object {$_.Group[0]})
$taskIdentities | ConvertTo-Json -Depth 4 | Set-Content artifacts/walking-pace/verification-processes.json
[pscustomobject]@{recordedIdentities=$taskIdentities.Count;capturedAt=[DateTime]::UtcNow.ToString('o');action='read-only exact identities, no termination'} | ConvertTo-Json -Compress
