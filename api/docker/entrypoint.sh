#!/bin/sh
set -e

php artisan config:clear

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

exec "$@"
