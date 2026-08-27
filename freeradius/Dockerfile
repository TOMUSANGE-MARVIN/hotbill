# HotBill RADIUS server — authenticates hotspot clients against the radcheck/
# radreply tables the Laravel app writes. Routers reach it over UDP 1812/1813.
FROM freeradius/freeradius-server:3.2.5-alpine

# The rlm_sql_mysql driver needs the MariaDB client lib (libmariadb.so.3),
# which the base image doesn't ship.
RUN apk add --no-cache mariadb-connector-c

# This image installs FreeRADIUS under /opt (raddb at /opt/etc/raddb).
# Our SQL module config + wildcard client (secrets filled in at runtime).
COPY sql.module /opt/etc/raddb/mods-enabled/sql
COPY clients.conf /opt/etc/raddb/clients.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 1812/udp 1813/udp
ENTRYPOINT ["/entrypoint.sh"]
