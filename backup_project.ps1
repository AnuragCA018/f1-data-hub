#Requires -Version 5.1
param([string]$Label = "")
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$BackupsDir  = Join-Path $ProjectRoot "backups"
$Timestamp   = Get-Date -Format "yyyy_MM_dd_HHmm"
$FolderName  = if ($Label) { "backup_${Timestamp}_${Label}" } else { "backup_${Timestamp}" }
$DestDir     = Join-Path $BackupsDir $FolderName
$ExcludeDirs = @("node_modules",".next","venv","__pycache__","cache",".git","backups")
$SourceDirs  = @(
    @{ Src = Join-Path $ProjectRoot "backend";  Dst = Join-Path $DestDir "backend"  },
    @{ Src = Join-Path $ProjectRoot "frontend"; Dst = Join-Path $DestDir "frontend" }
)
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  F1 Analytics Project Backup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Timestamp : $Timestamp"
Write-Host "Backup to : $DestDir"
Write-Host ""
New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
foreach ($pair in $SourceDirs) {
    if (-not (Test-Path $pair.Src)) {
        Write-Warning "Source not found, skipping: $($pair.Src)"
        continue
    }
    Write-Host "Copying $($pair.Src) ..." -ForegroundColor Yellow
    $robocopyArgs = @($pair.Src, $pair.Dst, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/XD") + $ExcludeDirs
    & robocopy @robocopyArgs | Out-Null
    if ($LASTEXITCODE -ge 8) { Write-Error "robocopy failed with exit code $LASTEXITCODE" }
}
$gitBranch = ""
$gitCommit = ""
try { $gitBranch = (git -C $ProjectRoot branch --show-current 2>$null) } catch {}
try { $gitCommit = (git -C $ProjectRoot rev-parse --short HEAD 2>$null) } catch {}
$Meta = @{ backup_time=$( Get-Date -Format "yyyy-MM-dd HH:mm:ss"); label=$Label; folder=$FolderName; git_branch=$gitBranch; git_commit=$gitCommit } | ConvertTo-Json -Depth 2
$Meta | Set-Content -Path (Join-Path $DestDir "backup_meta.json") -Encoding UTF8
Write-Host ""
Write-Host "OK Backup complete: $FolderName" -ForegroundColor Green
Write-Host ""
Write-Host "All backups in $BackupsDir :" -ForegroundColor Cyan
Get-ChildItem -Path $BackupsDir -Directory | Sort-Object Name | ForEach-Object {
    $size = [math]::Round((Get-ChildItem $_.FullName -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)
    Write-Host "  $($_.Name)  ($size MB)"
}
Write-Host ""
