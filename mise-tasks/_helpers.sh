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

# Enforce the branch ↔ environment policy:
#   - prod    may only be deployed from the `main` branch
#   - staging may be deployed from any branch except `main`
require_branch_for_env() {
  local env="$1"
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)

  case "$env" in
    prod)
      if [[ "$branch" != "main" ]]; then
        echo "Error: production deploys must run from the 'main' branch (on '$branch')." >&2
        exit 1
      fi
      ;;
    staging)
      if [[ "$branch" == "main" ]]; then
        echo "Error: refusing to deploy the 'main' branch to staging." >&2
        exit 1
      fi
      ;;
  esac
}

# Deploy the worker and (when Sentry creds are present) upload sourcemaps and
# register a Sentry deploy. Must be invoked from packages/worker.
# Args: $1 = wrangler env flag string ("--env staging" or ""),
#       $2 = Sentry environment name ("staging" or "production").
deploy_worker_with_sentry() {
  local wrangler_env="$1"
  local sentry_env="$2"
  local release
  release=$(git rev-parse HEAD)

  # shellcheck disable=SC2086
  bunx wrangler deploy $wrangler_env \
    --var SENTRY_RELEASE:"$release" \
    --outdir dist

  # --project is passed explicitly: deploy:site uploads to both Sentry projects
  # in one run, so a shared SENTRY_PROJECT env var can't disambiguate them.
  if [[ -n "${SENTRY_AUTH_TOKEN:-}" && -n "${SENTRY_ORG:-}" ]]; then
    echo "==> Uploading sourcemaps to Sentry ($release)..."
    bunx sentry-cli releases new "$release" --project catalyst-api
    bunx sentry-cli sourcemaps inject ./dist
    bunx sentry-cli sourcemaps upload --release "$release" \
      --project catalyst-api ./dist
    bunx sentry-cli releases finalize "$release" --project catalyst-api
    # Register a deploy so the release is tied to its environment.
    bunx sentry-cli releases deploys "$release" new \
      --env "$sentry_env" --project catalyst-api
  fi
  rm -rf dist
}
