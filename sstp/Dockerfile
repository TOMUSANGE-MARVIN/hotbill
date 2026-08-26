# SSTP VPN terminator — the RouterOS-v6 fallback for WireGuard.
# sstp-server (Python) handles the SSTP/TLS layer and hands each session to
# pppd, which authenticates routers from /etc/ppp/chap-secrets (rendered from
# the database by SstpService) and assigns each its pinned tunnel IP.
FROM debian:12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ppp \
        python3 \
        python3-pip \
        iproute2 \
        iptables \
        openssl \
        ca-certificates \
    && pip3 install --break-system-packages --no-cache-dir sstp-server \
    && apt-get purge -y python3-pip \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY options.sstpd /etc/ppp/options.sstpd
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
