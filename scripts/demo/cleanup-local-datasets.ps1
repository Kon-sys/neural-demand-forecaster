[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$datasetsRoot = Join-Path $repoRoot "datasets"

$targets = @(
    (Join-Path $datasetsRoot "raw\backend"),
    (Join-Path $datasetsRoot "raw\m5"),
    (Join-Path $datasetsRoot "raw\synthetic"),
    (Join-Path $datasetsRoot "processed\m5_sales_daily.csv"),
    (Join-Path $datasetsRoot "processed\m5_selected_products.csv"),
    (Join-Path $datasetsRoot "processed\sales_daily.csv"),
    (Join-Path $datasetsRoot "processed\synthetic_sales_daily.csv"),
    (Join-Path $datasetsRoot "downloads"),
    (Join-Path $datasetsRoot "private")
)

Write-Host "The following old/local dataset artifacts will be removed:" -ForegroundColor Yellow
foreach ($target in $targets) {
    if (Test-Path $target) {
        Write-Host "  $target"
    }
}

Write-Host "`nThe FreshRetail academic dataset and datasets/examples are NOT touched." -ForegroundColor Green

if (-not $Force) {
    $confirmation = Read-Host "Type CLEAN to continue"
    if ($confirmation -ne "CLEAN") {
        Write-Host "Cancelled."
        exit 0
    }
}

foreach ($target in $targets) {
    if (Test-Path $target) {
        Remove-Item -Recurse -Force $target
    }
}

Write-Host "Dataset cleanup completed." -ForegroundColor Green
