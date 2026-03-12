#Requires -Version 5.1
<#
.SYNOPSIS
    Full project test runner for F1 Analytics.
.DESCRIPTION
    1. Runs backend Python API tests  (test_api.py)
    2. Runs JS/frontend build check   (npm run build --dry)
    3. Runs health_check.ps1          (live endpoint verification)
.EXAMPLE
    .\run_tests.ps1
    .\run_tests.ps1 -SkipFrontend
    .\run_tests.ps1 -SkipHealth
#>
param(
    [switch] $SkipFrontend,
    [switch] $SkipHealth
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$ProjectRoot  = $PSScriptRoot
$BackendDir   = Join-Path $ProjectRoot "backend"
$FrontendDir  = Join-Path $ProjectRoot "frontend"

$pass = 0
$fail = 0

function Write-Section ([string]$title) {
    Write-Host ""
    Write-Host "┌─────────────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│  $($title.PadRight(47))│" -ForegroundColor Cyan
    Write-Host "└─────────────────────────────────────────────────┘" -ForegroundColor Cyan
}

function Mark-Result ([bool]$ok, [string]$label) {
    if ($ok) {
        Write-Host "  ✓ $label" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  ✗ $label" -ForegroundColor Red
        $script:fail++
    }
}

# ── 1. Backend Python tests ────────────────────────────────────────────────
Write-Section "Backend API Tests (Python)"

$venvPython = Join-Path $BackendDir "venv\Scripts\python.exe"
$testScript  = Join-Path $BackendDir "test_api.py"

if (-not (Test-Path $venvPython)) {
    Write-Warning "venv not found at $venvPython – trying system python..."
    $venvPython = "python"
}

if (Test-Path $testScript) {
    & $venvPython $testScript --verbose
    Mark-Result ($LASTEXITCODE -eq 0) "Python API tests"
} else {
    Write-Warning "test_api.py not found at $testScript"
    Mark-Result $false "Python API tests (file missing)"
}

# ── 2. Frontend type-check ────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Section "Frontend TypeScript Check"

    Push-Location $FrontendDir
    try {
        $tscPath = Join-Path $FrontendDir "node_modules\.bin\tsc.cmd"
        if (Test-Path $tscPath) {
            & $tscPath --noEmit 2>&1 | Tee-Object -Variable tscOut | Out-Null
            $tscOk = $LASTEXITCODE -eq 0
            if (-not $tscOk) {
                $tscOut | Select-Object -Last 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
            }
            Mark-Result $tscOk "TypeScript compilation (tsc --noEmit)"
        } else {
            Write-Warning "tsc not found – skipping TypeScript check."
            Write-Host "  (run 'npm install' in frontend/ to install dependencies)" -ForegroundColor Yellow
        }
    } finally {
        Pop-Location
    }
}

# ── 3. Live health check ───────────────────────────────────────────────────
if (-not $SkipHealth) {
    Write-Section "Live Health Check"

    $healthScript = Join-Path $ProjectRoot "health_check.ps1"
    if (Test-Path $healthScript) {
        & $healthScript
        Mark-Result ($LASTEXITCODE -eq 0) "All API + frontend endpoints"
    } else {
        Write-Warning "health_check.ps1 not found – skipping."
        Mark-Result $false "health_check.ps1 missing"
    }
}

# ── Summary ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═════════════════════════════════════════════════" -ForegroundColor White
$total = $pass + $fail
if ($fail -eq 0) {
    Write-Host "  ✓ ALL $total TEST GROUPS PASSED" -ForegroundColor Green
} else {
    Write-Host "  ✗ $fail / $total TEST GROUPS FAILED" -ForegroundColor Red
}
Write-Host "═════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""

exit $fail
