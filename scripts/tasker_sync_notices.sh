#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# IMS NSUT Notices — Termux / Tasker / Widget Execution Wrapper
# ==============================================================================
# Target: 1-Tap Home Screen Widget (Termux:Widget) or Tasker Action (Termux:Tasker)
# Location:
#   - ~/.shortcuts/sync_ims_notices.sh         (Interactive Widget)
#   - ~/.shortcuts/tasks/sync_ims_notices.sh   (Background Widget)
#   - ~/.termux/tasker/sync_ims_notices.sh     (Tasker Plugin)
# ==============================================================================

export PREFIX="/data/data/com.termux/files/usr"
export PATH="$PREFIX/bin:$PREFIX/bin/applets:/system/bin:/system/xbin:$PATH"
export LD_LIBRARY_PATH="$PREFIX/lib"
export HOME="/data/data/com.termux/files/home"
export TERM="xterm-256color"

APP_DIR="$HOME/ims_app"
STATUS_FILE="$APP_DIR/data/last_sync_status.json"

# 1. Immediate visual & haptic feedback on launch
echo "[Tasker] Triggering IMS Notices Sync & Indexing..."
if [ -x "$PREFIX/bin/termux-vibrate" ]; then
    "$PREFIX/bin/termux-vibrate" -d 40 2>/dev/null || true
fi
if [ -x "$PREFIX/bin/termux-toast" ]; then
    "$PREFIX/bin/termux-toast" -s "🔄 Syncing IMS Notices..." 2>/dev/null || true
fi

# 2. Verify directory existence
if [ ! -d "$APP_DIR" ]; then
    echo "[Error] Repository directory $APP_DIR not found!"
    if [ -x "$PREFIX/bin/termux-toast" ]; then
        "$PREFIX/bin/termux-toast" -s "❌ Error: $APP_DIR not found" 2>/dev/null || true
    fi
    exit 1
fi

# 3. Execute dedicated background sync worker
"$PREFIX/bin/bash" "$APP_DIR/scripts/phone_notices_worker.sh" "$@"
EXIT_CODE=$?

# 4. Process result & Notify User
if [ $EXIT_CODE -eq 0 ]; then
    NEW_COUNT=0
    TOTAL_COUNT=0
    LATEST_TITLE=""
    
    if [ -f "$STATUS_FILE" ] && [ -x "$PREFIX/bin/python3" ]; then
        eval "$("$PREFIX/bin/python3" -c "
import json
try:
    with open('$STATUS_FILE', 'r') as f:
        data = json.load(f)
    print(f'NEW_COUNT={data.get(\"newCount\", 0)}')
    print(f'TOTAL_COUNT={data.get(\"totalCount\", 0)}')
    latest = data.get(\"latestNotices\", [])
    if latest:
        t = latest[0].get(\"title\", \"\").replace('\"', '\\\\\"').replace(\"'\", \"\")
        print(f'LATEST_TITLE=\"{t[:60]}\"')
except Exception:
    pass
" 2>/dev/null)"
    fi

    echo "[Tasker] Sync completed successfully. New notices: $NEW_COUNT, Total: $TOTAL_COUNT"

    if [ "$NEW_COUNT" -gt 0 ]; then
        if [ -x "$PREFIX/bin/termux-toast" ]; then
            "$PREFIX/bin/termux-toast" -s "✓ $NEW_COUNT New Notice(s) Synced to Portal!" 2>/dev/null || true
        fi
        if [ -x "$PREFIX/bin/termux-notification" ]; then
            "$PREFIX/bin/termux-notification" \
                --id "ims_notices_update" \
                --title "🔔 $NEW_COUNT New IMS Notice(s) Published!" \
                --content "${LATEST_TITLE:-Tap to view latest notices on portal}" \
                --priority high \
                --vibrate 100,50,100 \
                --button1 "Open Portal" \
                --button1-action "termux-open-url https://ims-app-pearl.vercel.app" \
                --action "termux-open-url https://ims-app-pearl.vercel.app" 2>/dev/null || true
        fi
    else
        if [ -x "$PREFIX/bin/termux-toast" ]; then
            "$PREFIX/bin/termux-toast" -s "✓ IMS Notices up to date ($TOTAL_COUNT total)" 2>/dev/null || true
        fi
    fi
else
    echo "[Tasker] Sync failed with exit code $EXIT_CODE."
    if [ -x "$PREFIX/bin/termux-toast" ]; then
        "$PREFIX/bin/termux-toast" -s "⚠️ IMS Sync Failed (Exit Code: $EXIT_CODE)" 2>/dev/null || true
    fi
    if [ -x "$PREFIX/bin/termux-notification" ]; then
        "$PREFIX/bin/termux-notification" \
            --id "ims_notices_error" \
            --title "⚠️ IMS Notice Sync Failed" \
            --content "Sync encountered an error. Tap to check log." \
            --priority default 2>/dev/null || true
    fi
fi

exit $EXIT_CODE
