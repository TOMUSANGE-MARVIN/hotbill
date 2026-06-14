#!/usr/bin/env bash
set -euo pipefail

WG_DIR=/etc/wireguard
SERVER_PRIV="$WG_DIR/server_private.key"
SERVER_PUB="$WG_DIR/server_public.key"
PEERS_DIR="$WG_DIR/peers"
WG_CONF="$WG_DIR/wg0.conf"
WG_SERVER_IP="${WG_SERVER_IP:-10.66.0.1}"
WG_LISTEN_PORT="${WG_LISTEN_PORT:-51820}"

mkdir -p "$PEERS_DIR"

if [ ! -f "$SERVER_PRIV" ]; then
    echo "Generating WireGuard server keypair..."
    umask 077
    wg genkey | tee "$SERVER_PRIV" | wg pubkey > "$SERVER_PUB"
fi

SERVER_PRIVATE_KEY=$(cat "$SERVER_PRIV")

render_conf() {
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
}

render_conf
wg-quick up "$WG_CONF"

# Allow traffic to flow between the VPN subnet (wg0) and the docker bridge.
sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true
DOCKER_IFACE=$(ip -4 route | awk '/^default/ {print $5; exit}')
iptables -C FORWARD -i wg0 -o "$DOCKER_IFACE" -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wg0 -o "$DOCKER_IFACE" -j ACCEPT
iptables -C FORWARD -i "$DOCKER_IFACE" -o wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i "$DOCKER_IFACE" -o wg0 -j ACCEPT

echo "WireGuard interface wg0 is up. Server public key: $(cat "$SERVER_PUB")"

exec ./watch-peers.sh "$WG_CONF" "$PEERS_DIR" "$SERVER_PRIVATE_KEY" "$WG_SERVER_IP" "$WG_LISTEN_PORT"
