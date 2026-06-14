#!/usr/bin/env bash
set -euo pipefail

WG_CONF="$1"
PEERS_DIR="$2"
SERVER_PRIVATE_KEY="$3"
WG_SERVER_IP="$4"
WG_LISTEN_PORT="$5"

resync() {
    {
        echo "[Interface]"
        echo "PrivateKey = $SERVER_PRIVATE_KEY"
        echo "Address = ${WG_SERVER_IP}/24"
        echo "ListenPort = ${WG_LISTEN_PORT}"
        for f in "$PEERS_DIR"/*.conf; do
            [ -e "$f" ] || continue
            echo
            cat "$f"
        done
    } > "$WG_CONF"

    # Don't let a malformed peer file (or any sync error) crash the watcher —
    # log it and keep the existing tunnel/peers running. Avoid printing the
    # stripped config on error since it contains the server's PrivateKey.
    local stripped
    if stripped=$(wg-quick strip "$WG_CONF" 2>/dev/null) && wg syncconf wg0 <(printf '%s\n' "$stripped") 2>/dev/null; then
        echo "$(date -Iseconds) peer config synced"
    else
        echo "$(date -Iseconds) WARNING: failed to sync peer config — check files in $PEERS_DIR" >&2
    fi
}

resync

inotifywait -m -e create,modify,delete,moved_to,moved_from "$PEERS_DIR" |
while read -r _; do
    sleep 1
    resync
done
