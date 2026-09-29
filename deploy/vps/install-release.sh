#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run the release installer as root." >&2
  exit 1
fi
if [[ $# -ne 3 ]]; then
  echo "Usage: $0 RELEASE.tar.gz RELEASE.tar.gz.sha256 RELEASE_ID" >&2
  exit 1
fi

readonly ARCHIVE="$(realpath -- "$1")"
readonly CHECKSUM_FILE="$(realpath -- "$2")"
readonly RELEASE_ID="$3"
readonly RELEASES_ROOT="/opt/haydevos/releases"
readonly RELEASE_DIRECTORY="${RELEASES_ROOT}/${RELEASE_ID}"

if [[ ! ${RELEASE_ID} =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$ ]]; then
  echo "Invalid release ID." >&2
  exit 1
fi
if [[ ! -s /etc/haydevos/haydevos.env ]]; then
  echo "/etc/haydevos/haydevos.env is missing or empty." >&2
  exit 1
fi
if [[ -e ${RELEASE_DIRECTORY} ]]; then
  echo "Release already exists: ${RELEASE_DIRECTORY}" >&2
  exit 1
fi

readonly EXPECTED_SHA256="$(awk 'NR == 1 { print $1 }' "${CHECKSUM_FILE}")"
readonly ACTUAL_SHA256="$(sha256sum "${ARCHIVE}" | awk '{ print $1 }')"
if [[ ! ${EXPECTED_SHA256} =~ ^[a-f0-9]{64}$ || ${EXPECTED_SHA256} != "${ACTUAL_SHA256}" ]]; then
  echo "Release SHA-256 verification failed." >&2
  exit 1
fi

while IFS= read -r entry; do
  case "${entry}" in
    /*|../*|*/../*|.env|.env.*|*/.env|*/.env.*|.git|.git/*|*/.git/*|db/*|upload/*|download/*|.tmp/*)
      echo "Unsafe path in release archive: ${entry}" >&2
      exit 1
      ;;
  esac
done < <(tar -tzf "${ARCHIVE}")

install -d -o root -g root -m 0755 "${RELEASE_DIRECTORY}"
tar -xzf "${ARCHIVE}" --no-same-owner --no-same-permissions -C "${RELEASE_DIRECTORY}"
if [[ ! -f "${RELEASE_DIRECTORY}/server.js" || ! -f "${RELEASE_DIRECTORY}/RELEASE.json" ]]; then
  echo "Release does not contain server.js and RELEASE.json." >&2
  exit 1
fi

chown -R root:root "${RELEASE_DIRECTORY}"
find "${RELEASE_DIRECTORY}" -type d -exec chmod 0755 {} +
find "${RELEASE_DIRECTORY}" -type f -exec chmod 0644 {} +
install -d -o haydevos -g haydevos -m 0700 "${RELEASE_DIRECTORY}/.next/cache"

ln -sfn "${RELEASE_DIRECTORY}" /opt/haydevos/current.next
mv -Tf /opt/haydevos/current.next /opt/haydevos/current

systemctl daemon-reload
systemctl enable haydevos.service haydevos-readiness.timer
systemctl restart haydevos.service

for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/api/ready >/dev/null; then
    systemctl enable --now haydevos-readiness.timer
    echo "Release ${RELEASE_ID} is locally ready."
    echo "Point DNS to this VPS, then run deploy/vps/activate-edge.sh with PUBLIC_IPV4 set."
    exit 0
  fi
  sleep 2
done

journalctl -u haydevos.service --no-pager -n 100 >&2
echo "HayDevOS did not become ready; the current symlink remains available for rollback." >&2
exit 1
