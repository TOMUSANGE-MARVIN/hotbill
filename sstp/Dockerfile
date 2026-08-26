# SSTP VPN terminator — the RouterOS-v6 fallback for WireGuard.
# sstp-server (Python) handles the SSTP/TLS layer and hands each session to
# pppd, which authenticates routers from /etc/ppp/chap-secrets (rendered from
# the database by SstpService) and assigns each its pinned tunnel IP.
FROM debian:12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ppp \
        python3 \
        iproute2 \
        iptables \
        openssl \
        ca-certificates \
    # Build deps for sstp-server's C extension (sstpd/codecmodule.c) — purged
    # after the wheel is compiled and installed to keep the image small.
    && apt-get install -y --no-install-recommends \
        python3-pip \
        python3-dev \
        gcc \
    && pip3 install --break-system-packages --no-cache-dir sstp-server \
    && apt-get purge -y python3-pip python3-dev gcc \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY options.sstpd /etc/ppp/options.sstpd
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
