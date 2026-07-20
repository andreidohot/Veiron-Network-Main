$ErrorActionPreference = "Stop"

$cargoShim = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
if (Test-Path $cargoShim) {
  $cargo = $cargoShim
  $cargoArgsPrefix = @("+stable-x86_64-pc-windows-msvc")
} else {
  $cargo = "cargo"
  $cargoArgsPrefix = @()
}

Write-Host "Running Veiron mainnet-candidate release checks..."
& $cargo @cargoArgsPrefix fmt --all --check
& $cargo @cargoArgsPrefix test --workspace --tests
& $cargo @cargoArgsPrefix clippy --workspace --all-targets -- -D warnings

if (Test-Path "veiron-explorer\package.json") {
  Push-Location veiron-explorer
  npm install
  npm run build
  Pop-Location
}

Write-Host "Release checks passed."
