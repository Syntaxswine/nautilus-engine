param([ValidateSet('Build','Install','Browser')][string]$Mode)
$taskProc=Get-Process -Id $PID
@{owner='01a1810c-62da-7210-a1ca-b72b449ce024';project='Nautilus Engine';purpose=('Walking pace clean-commit '+$Mode+' proof');pid=$PID;creationFiletime=$taskProc.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable=$taskProc.Path;port=$null;startedAt=[DateTime]::UtcNow.ToString('o');endCondition='Proof commands finish';intendedExpiry='Immediate completion; no retained service';stopMethod='Managed exec completion; browsers close in finally with actual bounded timers'} | ConvertTo-Json -Compress | Add-Content artifacts/walking-pace/post-process-history.jsonl
if($Mode -eq 'Build'){
  & npm.cmd run build *> artifacts/walking-pace/clean-build.log
  $taskCode=$LASTEXITCODE
  @{mode=$Mode;exitCode=$taskCode;finishedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content artifacts/walking-pace/clean-build-result.json
  exit $taskCode
}
if($Mode -eq 'Install'){
  node apps/test-ground/tools/install.mjs --fresh *> artifacts/walking-pace/installed.log
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  node apps/test-ground/tools/focused.mjs 'C:/Users/baals/Documents/ChatGPT/Nautilus Engine/artifacts/railroute/artifacts/railway-ci-correction/compiler/node_modules/typescript/lib/tsc.js' *> artifacts/walking-pace/installed-tests.log
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  node artifacts/walking-pace/public-consumer.mjs *> artifacts/walking-pace/public-consumer.log
  $taskCode=$LASTEXITCODE
  @{mode=$Mode;exitCode=$taskCode;finishedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content artifacts/walking-pace/installed-result.json
  exit $taskCode
}
$env:CODEX_THREAD_ID='01a1810c-62da-7210-a1ca-b72b449ce024'
foreach($taskReview in @(@{tool='tools/review-door-opening.mjs';arg='';log='door-source'},@{tool='tools/review-traversal.mjs';arg='';log='traversal-source'},@{tool='tools/review-walking-pace.mjs';arg='--built';log='browser-built'},@{tool='tools/review-door-opening.mjs';arg='--built';log='door-built'})){
  if($taskReview.arg){node $taskReview.tool $taskReview.arg *> ('artifacts/walking-pace/'+$taskReview.log+'.log')}
  else {node $taskReview.tool *> ('artifacts/walking-pace/'+$taskReview.log+'.log')}
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
@{mode=$Mode;exitCode=0;finishedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content artifacts/walking-pace/browser-result.json
