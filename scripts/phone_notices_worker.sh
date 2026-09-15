#!/usr/bin/env bash
# ==============================================================================
# IMS NSUT Notices — Dedicated Background Synchronization Worker
# ==============================================================================
# Target: Background Worker (Xiaomi Mi A2 / Termux / Cron / reTerminal)
# Security: Unprivileged execution (No root/su required, purely OUTBOUND)
# Concurrency: Protected with flock file locking
# ==============================================================================

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
# 0. Concurrency Protection (Prevent overlapping cron runs)
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
# 1. Pull latest git changes to stay in sync with host
# ------------------------------------------------------------------------------
log "Step 1: Pulling latest changes from GitHub..."
git pull --rebase origin main || {
  log "Warning: Git pull failed or device is offline. Continuing with local files."
}

# ------------------------------------------------------------------------------
# 2. Run Notice Scraper (Node / tsx)
# ------------------------------------------------------------------------------
log "Step 2: Scraping live notices from IMS NSIT portal..."
if command -v npx >/dev/null 2>&1; then
  npx tsx scripts/scrape_notices.ts || log "Notice: Scraper exited with non-zero status."
elif command -v python3 >/dev/null 2>&1 && [ -f "scripts/scrape_notices.py" ]; then
  python3 scripts/scrape_notices.py || log "Notice: Python scraper exited with non-zero status."
else
  log "Error: Neither npx nor python3 available to execute scraper."
  exit 1
fi

# ------------------------------------------------------------------------------
# 3. Check for updates and commit + push via scoped PAT
# ------------------------------------------------------------------------------
if [[ -n $(git status --porcelain data/ public/data/) ]]; then
  log "Step 3: New notices detected. Committing and pushing to GitHub..."
  git add data/notices.json public/data/notices-recent.json public/data/notices.json
  git commit -m "AutoSync: Update IMS NSUT notices catalog [$(date '+%Y-%m-%d %H:%M')]"
  git push origin main
  log "✓ Successfully pushed updated notices to GitHub!"
else
  log "Step 3: Notices catalog is already up to date. No new notices."
fi

log "IMS Notices Background Worker Finished."
log "========================================================"
