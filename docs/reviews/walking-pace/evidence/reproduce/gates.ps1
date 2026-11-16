param([ValidateSet('Tests','Delivery')][string]$Mode)
$ErrorActionPreference='Continue'
$gateProcess=Get-Process -Id $PID
$record=@{owner='01a1810c-62da-7210-a1ca-b72b449ce024';project='Nautilus Engine';purpose=('Walking pace corrected '+$Mode+' gates');pid=$PID;creationFiletime=$gateProcess.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$gateProcess.Path;port=$null;startedAt=[DateTime]::UtcNow.ToString('o');endCondition='Required gate commands finish';intendedExpiry='Immediate completion; no retained service';stopMethod='Managed exec session completion; graceful interrupt if necessary'}
$record | ConvertTo-Json -Compress | Add-Content artifacts/walking-pace/gates-process-history.jsonl
if($Mode -eq 'Tests'){
  node --test --test-concurrency=2 tests/*.test.mjs *> artifacts/walking-pace/full-tests.log
  $gateCode=$LASTEXITCODE
  @{exitCode=$gateCode;finishedAt=[DateTime]::UtcNow.ToString('o');command='node --test --test-concurrency=2 tests/*.test.mjs'} | ConvertTo-Json | Set-Content artifacts/walking-pace/full-tests-result.json
  exit $gateCode
}
$gateResults=@()
foreach($gate in @(@{name='check';args=@('run','check','--','--tracked')},@{name='upstream';args=@('run','test:upstream')},@{name='build';args=@('run','build')})){
  $gateStart=[DateTime]::UtcNow.ToString('o');$gateArgs=$gate.args
  & npm.cmd @gateArgs *> ('artifacts/walking-pace/'+$gate.name+'.log')
  $gateCode=$LASTEXITCODE
  $gateResults+=@{name=$gate.name;exitCode=$gateCode;startedAt=$gateStart;finishedAt=[DateTime]::UtcNow.ToString('o')}
  $gateResults | ConvertTo-Json -Depth 4 | Set-Content artifacts/walking-pace/gate-results.json
  if($gateCode -ne 0){exit $gateCode}
}
exit 0
