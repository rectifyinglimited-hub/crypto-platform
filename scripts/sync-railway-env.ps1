# Sync local backend/.env secrets to the linked Railway service.
# Run once from repo root after: npx @railway/cli login
# Then:  npx @railway/cli link   (pick crypto-platform service)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\backend\.env"
if (-not (Test-Path $envFile)) {
  Write-Error "Missing backend/.env — cannot sync secrets."
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $key = $line.Substring(0, $i).Trim()
  $val = $line.Substring($i + 1).Trim()
  if ($key -in @("MONGO_URI", "JWT_SECRET", "JWT_TTL", "NODE_ENV")) {
    $vars[$key] = $val
  }
}

if (-not $vars.ContainsKey("MONGO_URI")) {
  Write-Error "MONGO_URI not found in backend/.env"
}

$vars["NODE_ENV"] = "production"

Write-Host "Setting Railway variables: $($vars.Keys -join ', ')"
foreach ($k in $vars.Keys) {
  npx --yes @railway/cli variables --set "$k=$($vars[$k])" --skip-deploys
}
Write-Host "Done. Trigger a redeploy in Railway (or run: npx @railway/cli up)"
npx --yes @railway/cli redeploy --yes
