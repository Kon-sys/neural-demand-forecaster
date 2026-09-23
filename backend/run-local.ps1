$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $BackendDir
$DatabaseDir = Join-Path $RootDir "database"

$BackendEnv = Join-Path $BackendDir ".env"
$DatabaseEnv = Join-Path $DatabaseDir ".env"

function Import-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "Environment file not found: $Path"
    }

    Get-Content $Path | ForEach-Object {

        $line = $_.Trim()

        if (
            [string]::IsNullOrWhiteSpace($line) -or
            $line.StartsWith("#")
        ) {
            return
        }

        $separatorIndex = $line.IndexOf("=")

        if ($separatorIndex -le 0) {
            return
        }

        $name = $line.Substring(
            0,
            $separatorIndex
        ).Trim()

        $value = $line.Substring(
            $separatorIndex + 1
        ).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(
                1,
                $value.Length - 2
            )
        }

        [Environment]::SetEnvironmentVariable(
            $name,
            $value,
            "Process"
        )
    }
}

function Assert-Environment {

    $requiredVariables = @(
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_PORT",
        "JWT_SECRET_BASE64",
        "SERVER_PORT"
    )

    foreach ($variableName in $requiredVariables) {

        $value = [Environment]::GetEnvironmentVariable(
            $variableName,
            "Process"
        )

        if ([string]::IsNullOrWhiteSpace($value)) {
            throw "Required environment variable is missing: $variableName"
        }
    }
}

Write-Host ""
Write-Host "=== Demand Forecast Backend ==="
Write-Host ""

Write-Host "[1/4] Loading environment..."

Import-EnvFile $DatabaseEnv
Import-EnvFile $BackendEnv

Assert-Environment

Write-Host "Environment loaded."
Write-Host "PostgreSQL port: $env:POSTGRES_PORT"
Write-Host "Backend port:    $env:SERVER_PORT"

Write-Host ""
Write-Host "[2/4] Starting PostgreSQL..."

Push-Location $DatabaseDir

try {

    docker compose --env-file .env up -d

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to start PostgreSQL."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "[3/4] Waiting for PostgreSQL..."

$databaseReady = $false

for ($i = 1; $i -le 30; $i++) {

    $health = docker inspect `
        --format "{{.State.Health.Status}}" `
        demand-forecast-postgres `
        2>$null

    if ($health -eq "healthy") {

        $databaseReady = $true

        Write-Host "PostgreSQL is healthy."

        break
    }

    Start-Sleep -Seconds 2
}

if (-not $databaseReady) {
    throw "PostgreSQL did not become healthy in time."
}

Write-Host ""
Write-Host "[4/4] Starting Spring Boot..."
Write-Host ""

Set-Location $BackendDir

& .\mvnw.cmd spring-boot:run