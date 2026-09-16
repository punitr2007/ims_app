#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# IMS NSUT Notices — Dedicated Background Synchronization Worker
# ==============================================================================
# Target: Background Worker (Xiaomi Mi A2 / Termux / Tasker / Cron)
# Security: Unprivileged execution (Purely outbound HTTP/Git)
# Concurrency: Protected with flock file locking & fetch-first commit age check
# ==============================================================================

# Ensure full Termux and Android environment paths are available
export PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
export PATH="$PREFIX/bin:$PREFIX/bin/applets:/system/bin:/system/xbin:$PATH"
export LD_LIBRARY_PATH="$PREFIX/lib"
export HOME="${HOME:-/data/data/com.termux/files/home}"
export TERM="xterm-256color"

set -eo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORKSPACE_DIR"

LOG_FILE="$WORKSPACE_DIR/.notices_worker.log"
if [ -n "$PREFIX" ] && [ -d "$PREFIX/tmp" ]; then
  TMP_DIR="$PREFIX/tmp"
elif [ -n "$TMPDIR" ] && [ -w "$TMPDIR" ]; then
  TMP_DIR="$TMPDIR"
elif [ -d "/tmp" ] && [ -w "/tmp" ]; then
  TMP_DIR="/tmp"
else
  TMP_DIR="$WORKSPACE_DIR/.tmp"
fi
mkdir -p "$TMP_DIR"
LOCK_FILE="$TMP_DIR/ims_notices_sync.lock"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ------------------------------------------------------------------------------
# 0. Concurrency Protection (Prevent overlapping runs)
# ------------------------------------------------------------------------------
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "Notice: Another notices sync job is currently running. Exiting cleanly."
  exit 0
fi

log "========================================================"
log "Starting IMS Notices Background Worker Run..."
log "Working Directory: $WORKSPACE_DIR"

# ------------------------------------------------------------------------------
# 1. Fetch Remote & Guard Against Race Condition with GitHub Actions
# ------------------------------------------------------------------------------
log "Step 1: Fetching latest remote state from GitHub..."
if git fetch origin main 2>/dev/null; then
  LAST_REMOTE_COMMIT_TIME=$(git log -1 --format=%ct origin/main 2>/dev/null || echo 0)
  CURRENT_TIME=$(date +%s)
  DIFF_MINUTES=$(( (CURRENT_TIME - LAST_REMOTE_COMMIT_TIME) / 60 ))

  if [[ "$1" != "--force" ]] && [ "$DIFF_MINUTES" -lt 40 ]; then
    log "✓ Remote catalog is already fresh (last sync ${DIFF_MINUTES}m ago by GHA). Skipping redundant scrape."
    git stash 2>/dev/null || true
    git pull --rebase origin main 2>/dev/null || true
    git stash pop 2>/dev/null || true
    log "========================================================"
    exit 0
  fi
  
  log "Remote commit age: ${DIFF_MINUTES}m (Proceeding with sync worker)..."
  git stash 2>/dev/null || true
  git pull --rebase origin main 2>/dev/null || true
  git stash pop 2>/dev/null || true
else
  log "Warning: Git fetch failed or device is offline. Continuing with local files."
fi

# ------------------------------------------------------------------------------
# 2. Run Notice Scraper & Indexer (Python 3 zero-dependency or Node tsx)
# ------------------------------------------------------------------------------
log "Step 2: Scraping live notices from IMS NSIT portal..."
SCRAPE_SUCCESS=0
PYTHON_EXEC=""
if [ -x "$PREFIX/bin/python3" ]; then
  PYTHON_EXEC="$PREFIX/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_EXEC="$(command -v python3)"
fi

if [ -n "$PYTHON_EXEC" ] && [ -f "scripts/scrape_notices.py" ]; then
  "$PYTHON_EXEC" scripts/scrape_notices.py && SCRAPE_SUCCESS=1 || log "Notice: Python scraper exited with non-zero status."
elif command -v npx >/dev/null 2>&1 && [ -f "scripts/scrape_notices.ts" ]; then
  npx tsx scripts/scrape_notices.ts && SCRAPE_SUCCESS=1 || log "Notice: Scraper exited with non-zero status."
else
  log "Error: Neither python3 nor npx available to execute scraper."
  exit 1
fi

if [ $SCRAPE_SUCCESS -ne 1 ]; then
  log "Error: Scraping step failed."
  exit 1
fi

# ------------------------------------------------------------------------------
# 3. Check for updates and commit + push to GitHub
# ------------------------------------------------------------------------------
if [[ -n $(git status --porcelain data/ public/data/) ]]; then
  log "Step 3: New notices detected. Committing and pushing to GitHub..."
  git add data/notices.json data/last_sync_status.json public/data/notices-recent.json public/data/notices.json
  git commit -m "AutoSync: Update IMS NSUT notices catalog [$(date '+%Y-%m-%d %H:%M')]"
  git pull --rebase origin main 2>/dev/null || true
  git push origin main
  log "✓ Successfully pushed updated notices to GitHub!"
else
  log "Step 3: Notices catalog is already up to date. No new notices."
fi

log "IMS Notices Background Worker Finished."
log "========================================================"
