#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: scripts/security/check-repo-hygiene.sh"
  echo "Fails when tracked or unignored runtime data, build artifacts, logs, or generated folders can enter the repository."
  exit 0
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

issues=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if grep -Eq '(^|/)\.veiron-(dev|testnet|mainnet|local)(/|$)|(^|/)(target|target-msvc|node_modules|logs|devnet-data|node-data)(/|$)|(^|/)chain\.jsonl$|\.log$' <<<"$file"; then
    issues+=("Forbidden tracked or unignored artifact: $file")
  fi
done < <((git ls-files; git ls-files --others --exclude-standard) | sort -u)

if (( ${#issues[@]} > 0 )); then
  printf 'Repository hygiene check failed:\n' >&2
  printf -- '- %s\n' "${issues[@]}" >&2
  exit 1
fi

echo "Repository hygiene check passed."
