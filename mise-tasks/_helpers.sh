# Shared helpers for mise file-based tasks.
# Source this file: source "$MISE_PROJECT_ROOT/mise-tasks/_helpers.sh"

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
