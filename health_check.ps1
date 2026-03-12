#Requires -Version 5.1
param([switch]$BackendOnly, [switch]$FrontendOnly, [switch]$AutoRestore)
Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"
$BackendBase  = "http://localhost:8000"
$FrontendBase = "http://localhost:3000"
$ProjectRoot  = $PSScriptRoot
$results = @()

function Test-Endpoint($Url, $Label, $TimeoutSec = 15) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) {
            return @{ Label=$Label; Status="PASS"; Code=$r.StatusCode; Error="" }
        }
        return @{ Label=$Label; Status="FAIL"; Code=$r.StatusCode; Error="HTTP $($r.StatusCode)" }
    } catch {
        return @{ Label=$Label; Status="FAIL"; Code=0; Error=$_.Exception.Message }
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  F1 Analytics - Health Check" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

if (-not $FrontendOnly) {
    Write-Host "Backend checks ($BackendBase):" -ForegroundColor Yellow
    $backendTests = @(
        @{ Url="$BackendBase/health";             Label="Health endpoint"       },
        @{ Url="$BackendBase/api/schedule/2026";  Label="Schedule 2026"         },
        @{ Url="$BackendBase/api/schedule/2025";  Label="Schedule 2025"         },
        @{ Url="$BackendBase/api/standings/2025"; Label="Standings 2025"        },
        @{ Url="$BackendBase/api/results/2026/1"; Label="Race results 2026/1"   },
        @{ Url="$BackendBase/api/drivers";        Label="Drivers list"          }
    )
    foreach ($t in $backendTests) {
        $r = Test-Endpoint -Url $t.Url -Label $t.Label
        $results += $r
        if ($r.Status -eq "PASS") {
            Write-Host "  [OK] $($r.Label) - HTTP $($r.Code)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $($r.Label) - $($r.Error)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

if (-not $BackendOnly) {
    Write-Host "Frontend checks ($FrontendBase):" -ForegroundColor Yellow
    $frontendTests = @(
        @{ Url="$FrontendBase/";            Label="Dashboard"        },
        @{ Url="$FrontendBase/telemetry";   Label="Telemetry page"   },
        @{ Url="$FrontendBase/track";       Label="Track map page"   },
        @{ Url="$FrontendBase/qualifying";  Label="Qualifying page"  }
    )
    foreach ($t in $frontendTests) {
        $r = Test-Endpoint -Url $t.Url -Label $t.Label -TimeoutSec 20
        $results += $r
        if ($r.Status -eq "PASS") {
            Write-Host "  [OK] $($r.Label) - HTTP $($r.Code)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $($r.Label) - $($r.Error)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "-----------------------------------------------"
if ($failed -eq 0) {
    Write-Host "  ALL $($results.Count) CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "  $failed / $($results.Count) CHECKS FAILED" -ForegroundColor Red
}
Write-Host "-----------------------------------------------"
Write-Host ""
if ($failed -gt 0 -and $AutoRestore) {
    $rs = Join-Path $ProjectRoot "restore_backup.ps1"
    if (Test-Path $rs) { & $rs }
} elseif ($failed -gt 0) {
    Write-Host "Run '.\restore_backup.ps1' to revert to the last good backup." -ForegroundColor Yellow
}
exit $failed
