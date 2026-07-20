$ErrorActionPreference = "Stop"

if ($args -contains "--help" -or $args -contains "-h" -or $args -contains "-Help") {
  Write-Host "Usage: scripts/security/check-secrets.ps1"
  Write-Host "Fails when forbidden secret files or non-placeholder secret patterns are found in the repository."
  exit 0
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$allowedPlaceholderPattern = '(?i)(CHANGE_ME|example|localhost|127\.0\.0\.1)'
$secretPatterns = @(
  "PRIVATE_KEY=",
  "WALLET_SEED=",
  "MNEMONIC=",
  "API_TOKEN=",
  "GITHUB_TOKEN=",
  "SECRET=",
  "PASSWORD=",
  "RPC_PASSWORD=",
  "ADMIN_TOKEN="
)
$forbiddenExtensions = @(".key", ".pem", ".seed", ".wallet", ".mnemonic")
$selfRuleFiles = @(
  "scripts/git/check-forbidden-files.ps1",
  "scripts/git/check-forbidden-files.sh",
  "scripts/security/check-secrets.ps1",
  "scripts/security/check-secrets.sh",
  "scripts/security/check-config-safety.ps1",
  "scripts/security/check-config-safety.sh"
)
$issues = New-Object System.Collections.Generic.List[string]
$candidateFiles = @()
$candidateFiles += git ls-files
$candidateFiles += git ls-files --others --exclude-standard
$candidateFiles = $candidateFiles | Where-Object { $_ } | Sort-Object -Unique

$badEnvFiles = $candidateFiles | Where-Object {
  (Split-Path $_ -Leaf) -like ".env*" -and (Split-Path $_ -Leaf) -ne ".env.example"
}
foreach ($file in $badEnvFiles) {
  $issues.Add("Forbidden tracked or unignored environment file: $file")
}

$badSecretFiles = Get-ChildItem -Path $repoRoot -Recurse -Force -File | Where-Object {
  $forbiddenExtensions -contains $_.Extension
}
foreach ($file in $badSecretFiles) {
  $issues.Add("Forbidden secret or wallet file: $($file.FullName)")
}

$candidateFiles = $candidateFiles |
  Where-Object { $_ -and $_ -ne ".env.example" -and ($selfRuleFiles -notcontains ($_ -replace '\\', '/')) } |
  Sort-Object -Unique

foreach ($relativePath in $candidateFiles) {
  $fullPath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path $fullPath -PathType Leaf)) {
    continue
  }

  foreach ($pattern in $secretPatterns) {
    $matches = Select-String -Path $fullPath -SimpleMatch $pattern -ErrorAction SilentlyContinue
    foreach ($match in $matches) {
      if ($match.Line -match $allowedPlaceholderPattern) {
        continue
      }
      $issues.Add("Secret pattern '$pattern' found in ${relativePath}:$($match.LineNumber)")
    }
  }
}

if ($issues.Count -gt 0) {
  Write-Error ("Secret scan failed:`n- " + ($issues -join "`n- "))
  exit 1
}

Write-Host "Secret scan passed."
