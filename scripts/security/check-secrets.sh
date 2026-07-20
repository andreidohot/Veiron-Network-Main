#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: scripts/security/check-secrets.sh"
  echo "Fails when forbidden secret files or non-placeholder secret patterns are found in the repository."
  exit 0
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

allowed_placeholder_regex='CHANGE_ME|example|localhost|127\.0\.0\.1'
secret_patterns=(
  "PRIVATE_KEY="
  "WALLET_SEED="
  "MNEMONIC="
  "API_TOKEN="
  "GITHUB_TOKEN="
  "SECRET="
  "PASSWORD="
  "RPC_PASSWORD="
  "ADMIN_TOKEN="
)
self_rule_files=(
  "scripts/git/check-forbidden-files.ps1"
  "scripts/git/check-forbidden-files.sh"
  "scripts/security/check-secrets.ps1"
  "scripts/security/check-secrets.sh"
  "scripts/security/check-config-safety.ps1"
  "scripts/security/check-config-safety.sh"
)

issues=()

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  issues+=("Forbidden environment file: $file")
done < <((git ls-files; git ls-files --others --exclude-standard) | sort -u | grep -E '(^|/)\.env($|\.)' | grep -vE '(^|/)\.env\.example$' || true)

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  issues+=("Forbidden secret or wallet file: $file")
done < <(find . -path ./.git -prune -o -type f \( -name "*.key" -o -name "*.pem" -o -name "*.seed" -o -name "*.wallet" -o -name "*.mnemonic" \) -print)

mapfile -t candidate_files < <((git ls-files; git ls-files --others --exclude-standard) | sort -u)
for file in "${candidate_files[@]}"; do
  [[ -z "$file" || "$file" == ".env.example" || ! -f "$file" ]] && continue
  skip_file=0
  for self_rule_file in "${self_rule_files[@]}"; do
    if [[ "$file" == "$self_rule_file" ]]; then
      skip_file=1
      break
    fi
  done
  (( skip_file == 1 )) && continue
  for pattern in "${secret_patterns[@]}"; do
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      if grep -Eiq "$allowed_placeholder_regex" <<<"$line"; then
        continue
      fi
      issues+=("Secret pattern '$pattern' found in ${file}:${line%%:*}")
    done < <(grep -nF "$pattern" "$file" || true)
  done
done

if (( ${#issues[@]} > 0 )); then
  printf 'Secret scan failed:\n' >&2
  printf -- '- %s\n' "${issues[@]}" >&2
  exit 1
fi

echo "Secret scan passed."
