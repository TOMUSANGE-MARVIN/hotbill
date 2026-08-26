#!/bin/sh
set -e

php artisan config:clear

# Symlink public/storage → storage/app/public so uploaded blog images are served.
# Recreated on every boot because the image is rebuilt each deploy.
php artisan storage:link 2>/dev/null || true

if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

if [ "${WIREGUARD_ENABLED:-true}" = "true" ]; then
    WG_HOST_IP=$(getent hosts wireguard | awk '{ print $1 }' | head -n1)
    if [ -n "$WG_HOST_IP" ]; then
        ip route add 10.66.0.0/24 via "$WG_HOST_IP" 2>/dev/null \
            && echo "Added route: 10.66.0.0/24 via $WG_HOST_IP (wireguard)" \
            || echo "Route to 10.66.0.0/24 already present or failed (continuing)"
    else
        echo "WARNING: could not resolve 'wireguard' container — VPN route not added"
    fi
fi

# Same for the SSTP (RouterOS v6) tunnel subnet, routed via the sstp container.
if [ "${SSTP_ENABLED:-false}" = "true" ]; then
    SSTP_HOST_IP=$(getent hosts sstp | awk '{ print $1 }' | head -n1)
    if [ -n "$SSTP_HOST_IP" ]; then
        ip route add 10.67.0.0/24 via "$SSTP_HOST_IP" 2>/dev/null \
            && echo "Added route: 10.67.0.0/24 via $SSTP_HOST_IP (sstp)" \
            || echo "Route to 10.67.0.0/24 already present or failed (continuing)"
    else
        echo "WARNING: could not resolve 'sstp' container — SSTP route not added"
    fi
fi

exec "$@"
