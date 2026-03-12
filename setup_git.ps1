#Requires -Version 5.1
<#
.SYNOPSIS
    One-time Git repository setup for F1 Analytics Platform.
.DESCRIPTION
    Initializes a git repo with three branches: main, development,
    ai-experiments. Run this once after installing Git.
    Download Git from: https://git-scm.com/download/win
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot

# Verify git is available
try {
    $gitVer = git --version 2>&1
    Write-Host "Found: $gitVer" -ForegroundColor Green
} catch {
    Write-Error "Git not found. Install from https://git-scm.com/download/win and re-run."
}

Set-Location $ProjectRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  F1 Analytics — Git Repository Setup         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Init if not already a repo
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✓ git init" -ForegroundColor Green
} else {
    Write-Host "  Already a git repository." -ForegroundColor Yellow
}

# Create .gitignore if missing
if (-not (Test-Path ".gitignore")) {
    Copy-Item (Join-Path $ProjectRoot ".gitignore") ".gitignore" -ErrorAction SilentlyContinue
    if (-not (Test-Path ".gitignore")) {
        Write-Warning ".gitignore not found – you should create one."
    }
}

# Add all files and initial commit on main
git checkout -b main 2>$null
git add -A
git commit -m "feat: initial commit - F1 Analytics Platform baseline" 2>&1 | Out-Null
Write-Host "✓ Initial commit on main" -ForegroundColor Green

# Create development branch
git checkout -b development
git push --set-upstream origin development 2>$null
Write-Host "✓ Branch: development" -ForegroundColor Green

# Create ai-experiments branch
git checkout -b ai-experiments
Write-Host "✓ Branch: ai-experiments" -ForegroundColor Green

# Switch back to development for day-to-day work
git checkout development
Write-Host "✓ Switched to development branch" -ForegroundColor Green

Write-Host ""
Write-Host "Branch strategy:" -ForegroundColor Cyan
Write-Host "  main           → stable, production-ready code"
Write-Host "  development    → active development (default working branch)"
Write-Host "  ai-experiments → scratch branch for AI-generated changes"
Write-Host ""
Write-Host "Workflow for AI modifications:" -ForegroundColor Cyan
Write-Host "  1. .\backup_project.ps1 -Label 'before-ai-change'"
Write-Host "  2. git checkout ai-experiments"
Write-Host "  3. (apply AI changes)"
Write-Host "  4. .\health_check.ps1"
Write-Host "  5. If OK: git merge development; git checkout development; git merge ai-experiments"
Write-Host "  6. If broken: git checkout development  (discard ai-experiments changes)"
Write-Host ""
