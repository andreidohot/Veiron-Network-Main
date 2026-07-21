# Regenerates Tauri app icons from the project logo.
# Usage: .\scripts\generate-icons.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Logo = Join-Path $Root "logo.png"

if (-not (Test-Path $Logo)) {
  throw "Missing logo.png at $Logo"
}

Write-Host "==> Generating Tauri icons from logo.png"
Push-Location $Root
try {
  npx tauri icon $Logo
  Copy-Item $Logo (Join-Path $Root "public\logo.png") -Force
  Copy-Item (Join-Path $Root "src-tauri\icons\icon.png") (Join-Path $Root "public\icon.png") -Force
  Copy-Item (Join-Path $Root "src-tauri\icons\128x128@2x.png") (Join-Path $Root "public\logo-mark.png") -Force
  Write-Host "Updated public/logo.png, public/icon.png, public/logo-mark.png and src-tauri/icons/*"
}
finally {
  Pop-Location
}
