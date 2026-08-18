# ClassSync AWS Deployment Helper Script (PowerShell)
# Usage: .\scripts\deploy-aws.ps1 [-Action init|apply|deploy|destroy]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("init", "apply", "deploy", "destroy")]
    [string]$Action = "deploy"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ClassSync AWS Cloud Deployment Helper  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$TerraformDir = "$ProjectRoot\terraform"

# Check prerequisites
function Assert-Tool($CommandName) {
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Write-Error "Required tool '$CommandName' is not installed or not in PATH."
        exit 1
    }
}

Assert-Tool "aws"
Assert-Tool "terraform"
Assert-Tool "docker"

# Ensure terraform.tfvars exists
if (-not (Test-Path "$TerraformDir\terraform.tfvars")) {
    Write-Host "`n[!] terraform.tfvars not found in $TerraformDir." -ForegroundColor Yellow
    Write-Host "[!] Creating terraform.tfvars from terraform.tfvars.example..." -ForegroundColor Yellow
    Copy-Item "$TerraformDir\terraform.tfvars.example" "$TerraformDir\terraform.tfvars"
    Write-Host "[!] Please update $TerraformDir\terraform.tfvars with your actual secret passwords and values before proceeding." -ForegroundColor Red
    return
}

# Step 1: Terraform Init & Plan/Apply
if ($Action -eq "init" -or $Action -eq "apply" -or $Action -eq "deploy") {
    Write-Host "`n[1/4] Initializing Terraform in $TerraformDir..." -ForegroundColor Green
    Set-Location $TerraformDir
    terraform init

    if ($Action -eq "init") {
        Write-Host "Terraform initialized successfully!" -ForegroundColor Green
        return
    }

    Write-Host "`n[2/4] Applying Terraform Infrastructure..." -ForegroundColor Green
    terraform apply -auto-approve

    $WebEcrUrl = (terraform output -raw ecr_web_repository_url)
    $WorkerEcrUrl = (terraform output -raw ecr_worker_repository_url)
    $AwsRegion = (terraform output -raw aws_region)
    $ClusterName = (terraform output -raw ecs_cluster_name)
    $WebServiceName = (terraform output -raw web_service_name)
    $WorkerServiceName = (terraform output -raw worker_service_name)
    $AlbDns = (terraform output -raw alb_dns_name)

    Set-Location $ProjectRoot
}

if ($Action -eq "destroy") {
    Write-Host "`n[!] Destroying AWS Infrastructure with Terraform..." -ForegroundColor Red
    Set-Location $TerraformDir
    terraform destroy
    return
}

# Step 2: Docker Login to AWS ECR
Write-Host "`n[3/4] Logging in to AWS ECR in region $AwsRegion..." -ForegroundColor Green
$AccountAlias = (aws sts get-caller-identity --query "Account" --output text)
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AccountAlias.dkr.ecr.$AwsRegion.amazonaws.com"

# Step 3: Build & Push Images
Write-Host "`n[4/4] Building & Pushing Docker Images..." -ForegroundColor Green

Write-Host "-> Building Web App Docker image..." -ForegroundColor Cyan
docker build -t "$WebEcrUrl`:latest" -f Dockerfile .
docker push "$WebEcrUrl`:latest"

Write-Host "-> Building Worker Docker image..." -ForegroundColor Cyan
docker build -t "$WorkerEcrUrl`:latest" -f worker/Dockerfile .
docker push "$WorkerEcrUrl`:latest"

Write-Host "-> Triggering ECS rolling service update..." -ForegroundColor Cyan
aws ecs update-service --cluster $ClusterName --service $WebServiceName --force-new-deployment --region $AwsRegion | Out-Null
aws ecs update-service --cluster $ClusterName --service $WorkerServiceName --force-new-deployment --region $AwsRegion | Out-Null

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host " Application URL: http://$AlbDns" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
