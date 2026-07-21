FROM alpine:3.21

RUN apk add --no-cache \
      bash ca-certificates curl docker-cli docker-cli-compose \
      jq openssl postgresql16-client rclone tar tzdata

WORKDIR /opt/veiron-backup
COPY docker/backup/backup-now.sh /opt/veiron-backup/backup-now.sh
COPY docker/backup/backup-loop.sh /opt/veiron-backup/backup-loop.sh
RUN chmod 0755 /opt/veiron-backup/*.sh

ENTRYPOINT ["/opt/veiron-backup/backup-loop.sh"]
