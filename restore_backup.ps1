#Requires -Version 5.1
<#
.SYNOPSIS
    Restores the F1 Analytics project from a timestamped backup.
.DESCRIPTION
    By default restores the LATEST backup. Pass -BackupName to restore
    a specific backup folder under ./backups/.
    The script first creates an "emergency" backup of the current state
    before overwriting anything (safety net).
.EXAMPLE
    .\restore_backup.ps1                                # restore latest
    .\restore_backup.ps1 -BackupName backup_2026_03_11_1500
    .\restore_backup.ps1 -List                          # list all backups
    .\restore_backup.ps1 -DryRun                        # preview only
#>
param(
    [string] $BackupName = "",
    [switch] $List,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$BackupsDir  = Join-Path $ProjectRoot "backups"

# ── List mode ───────────────────────────────────────────────────────────────
if ($List) {
    if (-not (Test-Path $BackupsDir)) {
        Write-Host "No backups directory found at: $BackupsDir" -ForegroundColor Yellow
        exit 0
    }
    $all = Get-ChildItem -Path $BackupsDir -Directory | Sort-Object Name -Descending
    if ($all.Count -eq 0) {
        Write-Host "No backups found." -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Cyan
    $i = 1
    foreach ($b in $all) {
        $size = (Get-ChildItem $b.FullName -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object Length -Sum).Sum / 1MB
        $meta = Join-Path $b.FullName "backup_meta.json"
        $label = ""
        if (Test-Path $meta) {
            $j = Get-Content $meta | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($j.label) { $label = "  [$($j.label)]" }
        }
        $marker = if ($i -eq 1) { " ← LATEST" } else { "" }
        Write-Host ("  {0,2}. {1,-45} {2,6:F1} MB{3}{4}" -f $i, $b.Name, $size, $label, $marker)
        $i++
    }
    Write-Host ""
    exit 0
}

# ── Guard ────────────────────────────────────────────────────────────────────
if (-not (Test-Path $BackupsDir)) {
    Write-Error "No backups directory found. Run .\backup_project.ps1 first."
}

$backupFolders = Get-ChildItem -Path $BackupsDir -Directory | Sort-Object Name -Descending

if ($backupFolders.Count -eq 0) {
    Write-Error "No backups found in $BackupsDir."
}

# Resolve which backup to restore
$TargetBackup = $null
if ($BackupName) {
    $TargetBackup = $backupFolders | Where-Object { $_.Name -eq $BackupName } | Select-Object -First 1
    if (-not $TargetBackup) {
        Write-Error "Backup '$BackupName' not found. Use -List to see available backups."
    }
} else {
    $TargetBackup = $backupFolders[0]
}

$SrcDir = $TargetBackup.FullName

# ── Print header ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  F1 Analytics Project Restore                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Restore from : $($TargetBackup.Name)" -ForegroundColor Yellow
Write-Host "Source path  : $SrcDir"
Write-Host ""

# Read meta
$metaFile = Join-Path $SrcDir "backup_meta.json"
if (Test-Path $metaFile) {
    $meta = Get-Content $metaFile | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($meta) {
        Write-Host "Backup info  : created $($meta.backup_time)"
        if ($meta.git_commit) { Write-Host "Git commit   : $($meta.git_commit) ($($meta.git_branch))" }
        if ($meta.label)      { Write-Host "Label        : $($meta.label)" }
    }
}
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] The following directories would be restored:" -ForegroundColor Magenta
    foreach ($sub in @("backend", "frontend")) {
        $s = Join-Path $SrcDir $sub
        if (Test-Path $s) { Write-Host "  $s  →  $(Join-Path $ProjectRoot $sub)" }
    }
    Write-Host ""
    Write-Host "[DRY RUN] Complete. No files were changed." -ForegroundColor Magenta
    exit 0
}

# ── Safety: back-up current state first ─────────────────────────────────────
Write-Host "Creating emergency backup of current state before restoring..." -ForegroundColor DarkYellow
& (Join-Path $ProjectRoot "backup_project.ps1") -Label "pre-restore"
Write-Host ""

# ── Restore dirs ─────────────────────────────────────────────────────────────
$ExcludeDirs = @("node_modules", ".next", "venv", "__pycache__", "cache", ".git")

foreach ($sub in @("backend", "frontend")) {
    $src = Join-Path $SrcDir $sub
    $dst = Join-Path $ProjectRoot $sub

    if (-not (Test-Path $src)) {
        Write-Warning "Backup does not contain '$sub' folder – skipping."
        continue
    }

    Write-Host "Restoring $sub ..." -ForegroundColor Yellow

    $robocopyArgs = @(
        $src,
        $dst,
        "/E",    # copy subdirectories
        "/PURGE",# delete files in dst that no longer exist in src
        "/NFL","/NDL","/NJH","/NJS",
        "/XD"
    ) + $ExcludeDirs

    & robocopy @robocopyArgs | Out-Null

    if ($LASTEXITCODE -ge 8) {
        Write-Error "robocopy failed (exit $LASTEXITCODE) while restoring $sub"
    }

    Write-Host "  ✓ $sub restored" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ Restore complete!                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart the backend:  cd backend ; .\\venv\\Scripts\\Activate.ps1 ; uvicorn main:app --reload --port 8000"
Write-Host "  2. Restart the frontend: cd frontend ; npm run dev"
Write-Host ""
