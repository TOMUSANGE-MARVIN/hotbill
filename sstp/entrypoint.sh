#!/usr/bin/env bash
set -euo pipefail

# Shared volume with the api/queue containers: Laravel (SstpService) renders the
# chap-secrets file here; pppd reads it via a symlink from its fixed path.
SSTP_DIR=/var/sstp
CERT="$SSTP_DIR/sstp.crt"
KEY="$SSTP_DIR/sstp.key"
SECRETS="$SSTP_DIR/chap-secrets"
SSTP_PORT="${SSTP_PORT:-1443}"
SERVER_IP="${SSTP_SERVER_IP:-10.67.0.1}"

mkdir -p "$SSTP_DIR"
# The api container runs as www-data and must be able to write chap-secrets here.
chmod 777 "$SSTP_DIR"

# Self-signed cert — routers connect with verify-server-certificate=no. The
# tunnel is still TLS-encrypted; authentication is by PPP credentials.
if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
    echo "Generating self-signed SSTP certificate..."
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$KEY" -out "$CERT" -days 3650 \
        -subj "/CN=hotbill-sstp"
fi

# Ensure the secrets file exists, and point pppd's hardcoded path at it.
touch "$SECRETS"
chmod 666 "$SECRETS"
ln -sf "$SECRETS" /etc/ppp/chap-secrets

# Route/NAT between the docker bridge (where api/queue live) and the ppp peers,
# mirroring the WireGuard container. pppd adds a per-peer host route for each
# connected router's tunnel IP; forwarding lets api reach them.
sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true
DOCKER_IFACE="$(ip -4 route | awk '/^default/ {print $5; exit}')"
if [ -n "${DOCKER_IFACE:-}" ]; then
    iptables -C FORWARD -o "$DOCKER_IFACE" -j ACCEPT 2>/dev/null \
        || iptables -A FORWARD -o "$DOCKER_IFACE" -j ACCEPT
    iptables -C FORWARD -i "$DOCKER_IFACE" -j ACCEPT 2>/dev/null \
        || iptables -A FORWARD -i "$DOCKER_IFACE" -j ACCEPT
    iptables -t nat -C POSTROUTING -o "$DOCKER_IFACE" -s 10.67.0.0/24 -j MASQUERADE 2>/dev/null \
        || iptables -t nat -A POSTROUTING -o "$DOCKER_IFACE" -s 10.67.0.0/24 -j MASQUERADE
fi

echo "Starting sstp-server on 0.0.0.0:${SSTP_PORT} (server IP ${SERVER_IP})"
exec sstpd \
    -c "$CERT" \
    -k "$KEY" \
    -l 0.0.0.0 \
    -p "$SSTP_PORT" \
    --pppd-config /etc/ppp/options.sstpd
