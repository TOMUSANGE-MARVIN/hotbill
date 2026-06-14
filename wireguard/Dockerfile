FROM alpine:3.20

RUN apk add --no-cache wireguard-tools iproute2 iptables inotify-tools bash iputils

WORKDIR /opt/wireguard
COPY entrypoint.sh watch-peers.sh ./
RUN chmod +x entrypoint.sh watch-peers.sh

ENTRYPOINT ["./entrypoint.sh"]
