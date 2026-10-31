# Round 3: protect the shared machine from a mutant whose failing assertion makes
# node:test inspect a THREE object graph (R4 reached 50 GB in 5 minutes). Every 3 s,
# stop any test-file process started by this round's harnesses (their --test-timeout
# flags) whose working set exceeds 6 GB, and log it. Stops when watchdog.stop exists.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $dir 'mutation\watchdog.log'
$stop = Join-Path $dir 'mutation\watchdog.stop'
Add-Content -Path $log -Value ((Get-Date -Format o) + ' watchdog started')
while (-not (Test-Path $stop)) {
  $procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match '--test-timeout=(240000|300000)' -and $_.CommandLine -match 'tests[\\/]' }
  foreach ($p in $procs) {
    $gp = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
    if ($gp -and $gp.WorkingSet64 -gt 6GB) {
      $tail = $p.CommandLine.Substring([Math]::Max(0, $p.CommandLine.Length - 70))
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
      Add-Content -Path $log -Value ('{0} stopped pid {1} at {2} MB: {3}' -f (Get-Date -Format o), $p.ProcessId, [int]($gp.WorkingSet64 / 1MB), $tail)
    }
  }
  Start-Sleep -Seconds 3
}
Add-Content -Path $log -Value ((Get-Date -Format o) + ' watchdog stopped')
