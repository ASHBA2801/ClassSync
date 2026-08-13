# Cost-effective Cloud Run deploy for the ClassSync worker (test-friendly).
# Run from the class-sync directory:
#   powershell -ExecutionPolicy Bypass -File worker/deploy-gcp.ps1
#
# Defaults keep you near $0 for 2-school testing:
#   region asia-south1, min instances 0, max 2, 512Mi RAM, 1 CPU, request-based billing

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$ProjectId = gcloud config get-value project 2>$null
if (-not $ProjectId) { throw "No active gcloud project. Run: gcloud config set project YOUR_PROJECT_ID" }

$Region = if ($env:GCP_REGION) { $env:GCP_REGION } else { "asia-south1" }
$Service = if ($env:GCP_SERVICE) { $env:GCP_SERVICE } else { "classsync-worker" }

# Load .env (KEY=VALUE lines). Later duplicates win (matches your current AWS key override).
$EnvMap = @{}
$EnvFile = Join-Path $ProjectRoot ".env"
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    $EnvMap[$key] = $val
  }
}

function Require([string]$Name) {
  if (-not $EnvMap.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace($EnvMap[$Name])) {
    throw "Missing required env var in .env: $Name"
  }
  return $EnvMap[$Name]
}

$DatabaseUrl = Require "DATABASE_URL"
$WorkerSecret = if ($EnvMap["WORKER_SECRET"]) { $EnvMap["WORKER_SECRET"] } else { -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) }
$EncryptionKey = Require "ENCRYPTION_KEY"
$AwsKey = Require "AWS_ACCESS_KEY_ID"
$AwsSecret = Require "AWS_SECRET_ACCESS_KEY"
$AwsRegion = if ($EnvMap["AWS_REGION"]) { $EnvMap["AWS_REGION"] } else { "ap-south-1" }
$S3Bucket = if ($EnvMap["S3_BUCKET"]) { $EnvMap["S3_BUCKET"] } else { "classsync-uploads" }
$FaceProvider = if ($EnvMap["FACE_PROVIDER"]) { $EnvMap["FACE_PROVIDER"] } else { "aws" }
$VapidPublic = $EnvMap["VAPID_PUBLIC_KEY"]
$VapidPrivate = $EnvMap["VAPID_PRIVATE_KEY"]
$VapidSubject = if ($EnvMap["VAPID_SUBJECT"]) { $EnvMap["VAPID_SUBJECT"] } else { "mailto:admin@classsync.app" }
$AzureEndpoint = $EnvMap["AZURE_END_POINT"]
$AzureKey = $EnvMap["AZURE_OPEN_AI_API_KEY"]
$AzureDeployment = $EnvMap["AZURE_DEPLOYMENT_NAME"]

# Never pass local MinIO endpoint to Cloud Run — it cannot reach localhost:9000.
# Use real S3 (leave S3_ENDPOINT unset) for the deployed worker.

$Repo = "classsync"
$Image = "$Region-docker.pkg.dev/$ProjectId/$Repo/worker:latest"

Write-Host "Ensuring Artifact Registry repo '$Repo' exists in $Region..."
$ErrorActionPreference = "Continue"
gcloud artifacts repositories describe $Repo --location $Region 2>$null | Out-Null
$repoMissing = ($LASTEXITCODE -ne 0)
$ErrorActionPreference = "Stop"
if ($repoMissing) {
  gcloud artifacts repositories create $Repo `
    --repository-format=docker `
    --location $Region `
    --description="ClassSync container images"
}

Write-Host "Building worker image via Cloud Build (this can take a few minutes)..."
gcloud builds submit . `
  --config worker/cloudbuild.yaml `
  --substitutions "_IMAGE=$Image"

Write-Host "Deploying $Service to Cloud Run (scale-to-zero)..."

# Build env list. Secrets are passed to gcloud but not printed.
$EnvPairs = @(
  "WORKER_ROLE=worker",
  "NODE_ENV=production",
  "DATABASE_URL=$DatabaseUrl",
  "WORKER_SECRET=$WorkerSecret",
  "ENCRYPTION_KEY=$EncryptionKey",
  "AWS_ACCESS_KEY_ID=$AwsKey",
  "AWS_SECRET_ACCESS_KEY=$AwsSecret",
  "AWS_REGION=$AwsRegion",
  "S3_BUCKET=$S3Bucket",
  "FACE_PROVIDER=$FaceProvider",
  "VAPID_SUBJECT=$VapidSubject"
)
if ($VapidPublic) { $EnvPairs += "VAPID_PUBLIC_KEY=$VapidPublic" }
if ($VapidPrivate) { $EnvPairs += "VAPID_PRIVATE_KEY=$VapidPrivate" }
if ($AzureEndpoint) { $EnvPairs += "AZURE_END_POINT=$AzureEndpoint" }
if ($AzureKey) { $EnvPairs += "AZURE_OPEN_AI_API_KEY=$AzureKey" }
if ($AzureDeployment) { $EnvPairs += "AZURE_DEPLOYMENT_NAME=$AzureDeployment" }

$EnvCsv = $EnvPairs -join ","

# Cost knobs: min-instances=0, small RAM, low max, request timeout enough for face/docs.
gcloud run deploy $Service `
  --image $Image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --port 3001 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 2 `
  --concurrency 20 `
  --timeout 300 `
  --cpu-boost `
  --set-env-vars $EnvCsv

$Url = gcloud run services describe $Service --region $Region --format="value(status.url)"
Write-Host ""
Write-Host "Worker URL: $Url"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. On the WEB app (.env / Vercel), set:"
Write-Host "       WORKER_URL=$Url"
Write-Host "       WORKER_SECRET=<same secret as in this deploy>"
Write-Host "  2. Smoke test:  curl $Url/health"
Write-Host "  3. Optional crons: powershell -File worker/setup-scheduler.ps1"
Write-Host ""
Write-Host "Cost tip: leave min-instances at 0. Do not set min-instances=1 for testing."
