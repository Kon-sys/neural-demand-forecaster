[CmdletBinding()]
param(
    [string]$BackendBaseUrl = "http://localhost:8081"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("GET", "POST")]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Url,

        [string]$Token,

        [object]$Body
    )

    $headers = @{}

    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $params = @{
        Method      = $Method
        Uri         = $Url
        Headers     = $headers
        ContentType = "application/json; charset=utf-8"
    }

    if ($null -ne $Body) {
        $params["Body"] = $Body | ConvertTo-Json -Depth 10
    }

    Invoke-RestMethod @params
}

function Normalize-ProductsResponse {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Response
    )

    if ($Response -is [System.Array]) {
        return @($Response)
    }

    if ($null -ne $Response.items) {
        return @($Response.items)
    }

    if ($null -ne $Response.content) {
        return @($Response.content)
    }

    return @($Response)
}

Write-Step "Check backend"

try {
    $health = Invoke-RestMethod `
        -Method GET `
        -Uri "$($BackendBaseUrl.TrimEnd('/'))/api/v1/health"
}
catch {
    throw "Backend is not reachable at $BackendBaseUrl. Start Backend first."
}

Write-Host "Backend is available." -ForegroundColor Green

Write-Step "Authenticate"

$email = Read-Host "Admin email"

$securePassword = Read-Host "Admin password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    $loginResponse = Invoke-Api `
        -Method POST `
        -Url "$($BackendBaseUrl.TrimEnd('/'))/api/v1/auth/login" `
        -Body @{
            email    = $email
            password = $password
        }
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    $password = $null
}

if (-not $loginResponse.accessToken) {
    throw "Backend returned no access token."
}

$token = $loginResponse.accessToken

Write-Host "Authenticated as: $($loginResponse.user.name) <$($loginResponse.user.email)>" -ForegroundColor Green
Write-Host "Role: $($loginResponse.user.role)"

Write-Step "Load products"

$productResponse = Invoke-Api `
    -Method GET `
    -Url "$($BackendBaseUrl.TrimEnd('/'))/api/v1/products?page=0&size=1000" `
    -Token $token

$products = Normalize-ProductsResponse -Response $productResponse

Write-Host "Products available: $($products.Count)"

if ($products.Count -lt 24) {
    throw "Expected at least 24 products, but Backend returned $($products.Count)."
}

$plans = @()

for ($i = 0; $i -lt 12; $i++) {
    $plans += [PSCustomObject]@{
        Product = $products[$i]
        Horizon = 7
    }
}

for ($i = 12; $i -lt 20; $i++) {
    $plans += [PSCustomObject]@{
        Product = $products[$i]
        Horizon = 14
    }
}

for ($i = 20; $i -lt 24; $i++) {
    $plans += [PSCustomObject]@{
        Product = $products[$i]
        Horizon = 30
    }
}

Write-Step "Forecast plan"

$plans |
    Select-Object `
        @{Name = "SKU"; Expression = { $_.Product.sku }},
        @{Name = "Product"; Expression = { $_.Product.name }},
        Horizon |
    Format-Table -AutoSize

$confirmation = Read-Host "Create these 24 real forecasts? Type FORECAST to continue"

if ($confirmation -ne "FORECAST") {
    Write-Host "Cancelled."
    exit 0
}

Write-Step "Generate forecasts"

$success = 0
$failed = 0
$results = @()

for ($index = 0; $index -lt $plans.Count; $index++) {
    $plan = $plans[$index]

    $product = $plan.Product
    $horizon = $plan.Horizon

    Write-Host ""
    Write-Host "[$($index + 1)/$($plans.Count)] $($product.sku) - $($product.name) - $horizon days"

    try {
        $forecast = Invoke-Api `
            -Method POST `
            -Url "$($BackendBaseUrl.TrimEnd('/'))/api/v1/forecasts" `
            -Token $token `
            -Body @{
                productId       = $product.id
                forecastHorizon = $horizon
            }

        $results += [PSCustomObject]@{
            Id       = $forecast.id
            SKU      = $product.sku
            Product  = $product.name
            Horizon  = $horizon
            Status   = $forecast.status
            Model    = $forecast.modelVersion
        }

        $success++

        Write-Host "Created forecast #$($forecast.id) [$($forecast.status)]" -ForegroundColor Green
    }
    catch {
        $failed++

        Write-Warning "Forecast failed for $($product.sku): $($_.Exception.Message)"
    }
}

Write-Step "Generation summary"

Write-Host "Successful : $success" -ForegroundColor Green
Write-Host "Failed     : $failed"

if ($results.Count -gt 0) {
    Write-Host ""

    $results |
        Format-Table `
            Id,
            SKU,
            Horizon,
            Status,
            Model `
            -AutoSize
}

Write-Step "Verify forecast history"

$history = Invoke-Api `
    -Method GET `
    -Url "$($BackendBaseUrl.TrimEnd('/'))/api/v1/forecasts?page=0&size=100" `
    -Token $token

if ($null -ne $history.totalElements) {
    Write-Host "Forecasts for current user: $($history.totalElements)" -ForegroundColor Green
}
elseif ($null -ne $history.content) {
    Write-Host "Forecasts returned: $($history.content.Count)" -ForegroundColor Green
}
elseif ($null -ne $history.items) {
    Write-Host "Forecasts returned: $($history.items.Count)" -ForegroundColor Green
}
elseif ($history -is [System.Array]) {
    Write-Host "Forecasts returned: $($history.Count)" -ForegroundColor Green
}
else {
    Write-Host "Forecast history endpoint responded successfully." -ForegroundColor Green
}

Write-Host ""
Write-Host "Forecast history generation completed." -ForegroundColor Green