[CmdletBinding()]
param(
    [string]$MlBaseUrl = "http://localhost:8001",
    [string]$TrainingCsv = "",
    [ValidateRange(1, 120)]
    [int]$PollSeconds = 5
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    throw "curl.exe was not found. It is included with current Windows 10/11 installations."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if ([string]::IsNullOrWhiteSpace($TrainingCsv)) {
    $TrainingCsv = Join-Path $PSScriptRoot "generated\sales.csv"
}
else {
    $TrainingCsv = (Resolve-Path $TrainingCsv).Path
}

if (-not (Test-Path $TrainingCsv)) {
    throw "Training CSV was not found: $TrainingCsv. Run reset-and-seed.ps1 first."
}

$healthUrl = "$($MlBaseUrl.TrimEnd('/'))/health"
$startUrl = "$($MlBaseUrl.TrimEnd('/'))/training/start"

Write-Step "Check ML service"
$healthRaw = & curl.exe -sS --fail $healthUrl
if ($LASTEXITCODE -ne 0) {
    throw "ML service is not reachable at $healthUrl"
}
$health = $healthRaw | ConvertFrom-Json
Write-Host "ML status: $($health.status)"
Write-Host "Current model: $($health.active_model_version)"

Write-Step "Upload application sales dataset and start production training"
$startRaw = & curl.exe -sS --fail -X POST -F "file=@$TrainingCsv;type=text/csv" $startUrl
if ($LASTEXITCODE -ne 0) {
    throw "Could not start ML training."
}
$job = $startRaw | ConvertFrom-Json
$jobId = $job.job_id
if (-not $jobId) {
    throw "ML service returned no training job ID. Response: $startRaw"
}
Write-Host "Training job: $jobId"

Write-Step "Wait for training completion"
while ($true) {
    Start-Sleep -Seconds $PollSeconds
    $statusRaw = & curl.exe -sS --fail "$($MlBaseUrl.TrimEnd('/'))/training/$jobId"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read training job $jobId."
    }
    $status = $statusRaw | ConvertFrom-Json
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $($status.status)"

    if ($status.status -eq "ready") {
        break
    }
    if ($status.status -eq "failed") {
        throw "Training failed: $($status.error)"
    }
}

$version = $status.version
if (-not $version) {
    throw "Ready training job did not return a model version."
}

Write-Step "Training result"
$status.result | ConvertTo-Json -Depth 8

Write-Step "Activate new production model"
$activateUrl = "$($MlBaseUrl.TrimEnd('/'))/models/$version/activate"
$activateRaw = & curl.exe -sS --fail -X POST $activateUrl
if ($LASTEXITCODE -ne 0) {
    throw "Model was trained but activation failed. Version: $version"
}
$activation = $activateRaw | ConvertFrom-Json
Write-Host "Active version: $($activation.version)" -ForegroundColor Green

Write-Step "Verify active model"
$modelRaw = & curl.exe -sS --fail "$($MlBaseUrl.TrimEnd('/'))/model"
if ($LASTEXITCODE -ne 0) {
    throw "Model activation succeeded, but GET /model failed."
}
$modelRaw | ConvertFrom-Json | ConvertTo-Json -Depth 10

Write-Host "`nProduction model training and activation completed." -ForegroundColor Green
Write-Host "Restarting ML service later will load the registry's active model automatically." -ForegroundColor Green
