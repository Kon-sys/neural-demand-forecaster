[CmdletBinding()]
param(
    [string]$EndDate = (Get-Date).Date.AddDays(-1).ToString("yyyy-MM-dd"),
    [ValidateRange(120, 5000)]
    [int]$Days = 730,
    [int]$Seed = 20260927,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-PythonGenerator {
    param(
        [string]$Script,
        [string]$OutputDir,
        [string]$ResolvedEndDate,
        [int]$ResolvedDays,
        [int]$ResolvedSeed
    )

    $args = @(
        $Script,
        "--output-dir", $OutputDir,
        "--end-date", $ResolvedEndDate,
        "--days", $ResolvedDays,
        "--seed", $ResolvedSeed
    )

    if (Get-Command python -ErrorAction SilentlyContinue) {
        & python @args
    }
    elseif (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 @args
    }
    else {
        throw "Python was not found. Install Python or make 'python' / 'py' available in PATH."
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Demo data generator failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed: docker $($Arguments -join ' ')"
    }
}

$scriptRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptRoot "..\..")).Path
$dbEnv = Join-Path $repoRoot "database\.env"
$dbCompose = Join-Path $repoRoot "database\docker-compose.yml"
$generator = Join-Path $scriptRoot "generate_demo_data.py"
$generatedDir = Join-Path $scriptRoot "generated"
$sqlDir = Join-Path $scriptRoot "sql"

if (-not (Test-Path $dbEnv)) {
    throw "database/.env was not found. Create it from database/.env.example first."
}
if (-not (Test-Path $dbCompose)) {
    throw "database/docker-compose.yml was not found."
}
if (-not (Test-Path $generator)) {
    throw "Demo generator was not found: $generator"
}

Assert-Command "docker"

Write-Host "This operation will replace application demo data in PostgreSQL." -ForegroundColor Yellow
Write-Host "It preserves existing non-demo ADMIN accounts, but deletes forecasts, sales, products, ordinary users, positions and departments." -ForegroundColor Yellow
Write-Host "Flyway schema/history is not touched." -ForegroundColor Yellow

if (-not $Force) {
    $confirmation = Read-Host "Type RESET to continue"
    if ($confirmation -ne "RESET") {
        Write-Host "Cancelled."
        exit 0
    }
}

Write-Step "Generate deterministic demo data"
Invoke-PythonGenerator `
    -Script $generator `
    -OutputDir $generatedDir `
    -ResolvedEndDate $EndDate `
    -ResolvedDays $Days `
    -ResolvedSeed $Seed

$manifestPath = Join-Path $generatedDir "manifest.json"
$organizationSql = Join-Path $generatedDir "organization_users.sql"
$productsSql = Join-Path $generatedDir "products.sql"
$salesCsv = Join-Path $generatedDir "sales.csv"
$resetSql = Join-Path $sqlDir "reset_application_data.sql"
$importSql = Join-Path $sqlDir "import_sales.sql"
$validateSql = Join-Path $sqlDir "validate_demo_data.sql"

foreach ($path in @($manifestPath, $organizationSql, $productsSql, $salesCsv, $resetSql, $importSql, $validateSql)) {
    if (-not (Test-Path $path)) {
        throw "Required generated/source file is missing: $path"
    }
}

Write-Step "Start PostgreSQL"
$composeArgs = @("compose", "--env-file", $dbEnv, "-f", $dbCompose)
Invoke-Docker @composeArgs "up" "-d"

Write-Step "Wait for PostgreSQL readiness"
$containerId = (& docker @composeArgs "ps" "-q" "postgres").Trim()
if (-not $containerId) {
    throw "Could not resolve PostgreSQL container ID."
}

$ready = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
    & docker exec $containerId sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    throw "PostgreSQL did not become ready within 60 seconds."
}
Write-Host "PostgreSQL is ready." -ForegroundColor Green

Write-Step "Copy seed files into PostgreSQL container"
$containerFiles = @{
    $resetSql = "/tmp/demand_forecast_reset.sql"
    $organizationSql = "/tmp/demand_forecast_organization_users.sql"
    $productsSql = "/tmp/demand_forecast_products.sql"
    $salesCsv = "/tmp/demand_forecast_demo_sales.csv"
    $importSql = "/tmp/demand_forecast_import_sales.sql"
    $validateSql = "/tmp/demand_forecast_validate.sql"
}

foreach ($entry in $containerFiles.GetEnumerator()) {
    Invoke-Docker "cp" $entry.Key "$containerId`:$($entry.Value)"
}

function Invoke-PsqlFile([string]$ContainerPath) {
    & docker exec -i $containerId sh -lc "psql -v ON_ERROR_STOP=1 -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" -f '$ContainerPath'"
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for $ContainerPath"
    }
}

Write-Step "Reset application data"
Invoke-PsqlFile "/tmp/demand_forecast_reset.sql"

Write-Step "Seed organization and users"
Invoke-PsqlFile "/tmp/demand_forecast_organization_users.sql"

Write-Step "Seed products"
Invoke-PsqlFile "/tmp/demand_forecast_products.sql"

Write-Step "Bulk import two-year sales history"
Invoke-PsqlFile "/tmp/demand_forecast_import_sales.sql"

Write-Step "Validate populated database"
Invoke-PsqlFile "/tmp/demand_forecast_validate.sql"

Write-Step "Cleanup temporary container files"
& docker exec $containerId sh -lc 'rm -f /tmp/demand_forecast_reset.sql /tmp/demand_forecast_organization_users.sql /tmp/demand_forecast_products.sql /tmp/demand_forecast_demo_sales.csv /tmp/demand_forecast_import_sales.sql /tmp/demand_forecast_validate.sql'
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Could not remove one or more temporary files from the PostgreSQL container."
}

Write-Step "Completed"
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Departments : $($manifest.departments)"
Write-Host "Positions   : $($manifest.positions)"
Write-Host "Demo users  : $($manifest.demo_users)"
Write-Host "Products    : $($manifest.products)"
Write-Host "Sales rows  : $($manifest.sales_rows)"
Write-Host "Date range  : $($manifest.date_range.from) .. $($manifest.date_range.to)"
Write-Host "Training CSV: $salesCsv"
Write-Host ""
Write-Host "Existing real ADMIN accounts were preserved and attached to the new IT structure when possible." -ForegroundColor Green
Write-Host "If no real ADMIN existed before reset, enable BOOTSTRAP_ADMIN_ENABLED and restart backend before using admin-only pages." -ForegroundColor Yellow
