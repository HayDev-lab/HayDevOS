#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run edge activation as root." >&2
  exit 1
fi

readonly HAYDEV_DOMAIN="${HAYDEV_DOMAIN:-haydevos.com}"
readonly PUBLIC_IPV4="${PUBLIC_IPV4:?Set PUBLIC_IPV4 to the assigned OVH VPS address}"

mapfile -t resolved_addresses < <(getent ahostsv4 "${HAYDEV_DOMAIN}" | awk '{ print $1 }' | sort -u)
if [[ ! " ${resolved_addresses[*]} " =~ " ${PUBLIC_IPV4} " ]]; then
  echo "DNS for ${HAYDEV_DOMAIN} does not resolve to ${PUBLIC_IPV4}; refusing TLS activation." >&2
  exit 1
fi

caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable --now caddy
systemctl reload caddy

for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error --max-time 15 "https://${HAYDEV_DOMAIN}/api/ready" >/dev/null; then
    curl --fail --silent --show-error --max-time 15 "https://www.${HAYDEV_DOMAIN}/api/health" >/dev/null
    echo "HTTPS activation passed for ${HAYDEV_DOMAIN} and www.${HAYDEV_DOMAIN}."
    exit 0
  fi
  sleep 5
done

journalctl -u caddy --no-pager -n 100 >&2
echo "Public HTTPS readiness did not pass." >&2
exit 1
