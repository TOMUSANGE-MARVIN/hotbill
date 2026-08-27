#!/bin/sh
set -e

RADDB=/opt/etc/raddb

# Fill in DB credentials + shared secret from the environment.
sed -i \
    -e "s|@@DBHOST@@|${DB_HOST:-mariadb}|g" \
    -e "s|@@DBUSER@@|${DB_USERNAME:-hotbill}|g" \
    -e "s|@@DBPASS@@|${DB_PASSWORD:-hotbill_secret}|g" \
    -e "s|@@DBNAME@@|${DB_DATABASE:-hotbill}|g" \
    "$RADDB/mods-enabled/sql"

sed -i "s|@@RADIUS_SECRET@@|${RADIUS_SHARED_SECRET:-hotbill-radius-secret}|g" \
    "$RADDB/clients.conf"

# Enable the sql module in the default virtual server (authorize / accounting /
# session / post-auth). The stock file ships these lines commented as "-sql" or
# "#  sql"; turn them on.
DEFAULT="$RADDB/sites-enabled/default"
if [ -f "$DEFAULT" ]; then
    sed -i -E 's/^([[:space:]]*)#[[:space:]]*-?sql[[:space:]]*$/\1sql/' "$DEFAULT"
fi
INNER="$RADDB/sites-enabled/inner-tunnel"
if [ -f "$INNER" ]; then
    sed -i -E 's/^([[:space:]]*)#[[:space:]]*-?sql[[:space:]]*$/\1sql/' "$INNER"
fi

# FREERADIUS_DEBUG=1 runs radiusd -X (verbose) for troubleshooting.
if [ "${FREERADIUS_DEBUG:-0}" = "1" ]; then
    exec /opt/sbin/radiusd -X
fi
exec /opt/sbin/radiusd -f -l stdout
