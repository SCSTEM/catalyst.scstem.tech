# Shared helpers for mise file-based tasks.
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/_helpers.sh"
#   (adjust the relative path to _helpers.sh based on script depth)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_clean_git() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: Working directory is not clean." >&2
    echo "Commit or stash your changes before targeting $1." >&2
    exit 1
  fi
}

require_prod_confirmation() {
  echo "WARNING: This targets PRODUCTION."
  read -p "Are you sure? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
}
