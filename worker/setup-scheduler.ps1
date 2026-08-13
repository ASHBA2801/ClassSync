# Creates the two cheap Cloud Scheduler jobs (both fit in the 3-job free tier).
# Run AFTER the worker is deployed:
#   powershell -ExecutionPolicy Bypass -File worker/setup-scheduler.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "asia-south1" }
$Service = if ($env:GCP_SERVICE) { $env:GCP_SERVICE } else { "classsync-worker" }

$Url = gcloud run services describe $Service --region $Region --format="value(status.url)"
if (-not $Url) { throw "Could not find Cloud Run service $Service in $Region" }

# Read WORKER_SECRET from .env
$WorkerSecret = $null
Get-Content (Join-Path $ProjectRoot ".env") | ForEach-Object {
  if ($_ -match '^\s*WORKER_SECRET=(.*)$') { $WorkerSecret = $Matches[1].Trim() }
}
if (-not $WorkerSecret) { throw "WORKER_SECRET missing from .env" }

$AuthHeader = "Authorization=Bearer $WorkerSecret"

function Upsert-Job([string]$Name, [string]$Path, [string]$Schedule) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  gcloud scheduler jobs describe $Name --location $Region 2>$null | Out-Null
  $missing = ($LASTEXITCODE -ne 0)
  $ErrorActionPreference = $prev

  if (-not $missing) {
    Write-Host "Updating scheduler job $Name..."
    gcloud scheduler jobs update http $Name `
      --location $Region `
      --schedule $Schedule `
      --uri "$Url$Path" `
      --http-method POST `
      --update-headers $AuthHeader `
      --time-zone "Asia/Kolkata" | Out-Null
  } else {
    Write-Host "Creating scheduler job $Name..."
    gcloud scheduler jobs create http $Name `
      --location $Region `
      --schedule $Schedule `
      --uri "$Url$Path" `
      --http-method POST `
      --headers $AuthHeader `
      --time-zone "Asia/Kolkata" | Out-Null
  }
}

# First 3 scheduler jobs are free per billing account.
Upsert-Job "classsync-payroll" "/jobs/payroll" "0 6 * * *"
Upsert-Job "classsync-reminders" "/jobs/reminders" "*/5 * * * *"

Write-Host ""
Write-Host "Scheduler ready (2 jobs - within free tier)."
Write-Host "  payroll:   0 6 * * * Asia/Kolkata -> POST $Url/jobs/payroll"
Write-Host "  reminders: every 5 min Asia/Kolkata -> POST $Url/jobs/reminders"
