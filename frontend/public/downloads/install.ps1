# ==============================================================================
# Oculus CLI Installer (Windows PowerShell)
# https://github.com/oculus-security/oculus
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==> Installing Oculus CLI..." -ForegroundColor Cyan

# 1. Check Node.js >= 18.0.0
try {
    $nodeVerRaw = node -v
    $nodeVer = $nodeVerRaw.TrimStart('v')
    $majorVer = [int]($nodeVer.Split('.')[0])
    if ($majorVer -lt 18) {
        Write-Error "Node.js version $nodeVer detected. Oculus CLI requires Node.js >= 18.0.0 (https://nodejs.org)."
        exit 1
    }
    Write-Host "✓ Node.js v$nodeVer detected (>= 18.0.0 requirement met)" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js >= 18.0.0 (https://nodejs.org)."
    exit 1
}

# 2. Check npm
try {
    $npmVer = npm -v
    Write-Host "✓ npm v$npmVer detected" -ForegroundColor Green
} catch {
    Write-Error "npm is not installed or not in PATH."
    exit 1
}

# 3. Check for local tarball or install from registry
if (Test-Path ".\oculus-cli-1.0.0.tgz") {
    Write-Host "==> Installing from local distribution package .\oculus-cli-1.0.0.tgz..." -ForegroundColor Cyan
    npm install -g .\oculus-cli-1.0.0.tgz
} elseif (Test-Path ".\downloads\oculus-cli-1.0.0.tgz") {
    Write-Host "==> Installing from local distribution package .\downloads\oculus-cli-1.0.0.tgz..." -ForegroundColor Cyan
    npm install -g .\downloads\oculus-cli-1.0.0.tgz
} else {
    Write-Host "==> Installing @oculus/cli globally via npm..." -ForegroundColor Cyan
    npm install -g @oculus/cli
}

# 4. Verify
try {
    $ver = oculus --version
    Write-Host "`n✓ Oculus CLI v$ver installed successfully!`n" -ForegroundColor Green
    Write-Host "Next steps:"
    Write-Host "  1. Authenticate with your developer token:"
    Write-Host "     oculus auth login --token <your-developer-token>" -ForegroundColor Yellow
    Write-Host "`n  2. Configure your active workspace:"
    Write-Host "     oculus config set workspace <workspace-id>" -ForegroundColor Yellow
    Write-Host "`n  3. Trigger your first scan:"
    Write-Host "     oculus scan --repository <repo-id> --branch main --wait`n" -ForegroundColor Yellow
} catch {
    Write-Warning "'oculus' command was installed but might need a terminal restart to refresh your PATH."
}
