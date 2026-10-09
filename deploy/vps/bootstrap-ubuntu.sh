#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this bootstrap as root." >&2
  exit 1
fi

readonly APP_USER="haydevos"
readonly APP_GROUP="haydevos"
readonly OPENCLAW_USER="haydev-openclaw"
readonly OPENCLAW_GROUP="haydev-openclaw"
readonly APP_ROOT="/opt/haydevos"
readonly NODE_VERSION="${NODE_VERSION:-24.18.0}"
readonly HAYDEV_DOMAIN="${HAYDEV_DOMAIN:-haydevos.com}"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

source /etc/os-release
if [[ ${ID:-} != "ubuntu" || ${VERSION_ID:-} != "24.04" ]]; then
  echo "This bootstrap supports Ubuntu 24.04 only." >&2
  exit 1
fi
if [[ ${HAYDEV_DOMAIN} != "haydevos.com" ]]; then
  echo "HAYDEV_DOMAIN must be haydevos.com for this production deployment." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  debian-archive-keyring \
  debian-keyring \
  fail2ban \
  gnupg \
  jq \
  postgresql-client \
  rsync \
  tar \
  ufw \
  xz-utils

temporary_directory="$(mktemp -d)"
cleanup() {
  case "${temporary_directory}" in
    /tmp/*) rm -rf -- "${temporary_directory}" ;;
    *) echo "Refusing to remove unexpected temporary path: ${temporary_directory}" >&2 ;;
  esac
}
trap cleanup EXIT

curl -fsSLo "${temporary_directory}/caddy-key" "https://dl.cloudsmith.io/public/caddy/stable/gpg.key"
gpg --batch --yes --dearmor --output /usr/share/keyrings/caddy-stable-archive-keyring.gpg "${temporary_directory}/caddy-key"
curl -fsSLo /etc/apt/sources.list.d/caddy-stable.list "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt"
chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

case "$(dpkg --print-architecture)" in
  amd64) node_arch="x64" ;;
  arm64) node_arch="arm64" ;;
  *) echo "Unsupported CPU architecture." >&2; exit 1 ;;
esac
node_archive="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz"
node_base_url="https://nodejs.org/download/release/v${NODE_VERSION}"
curl -fsSLo "${temporary_directory}/SHASUMS256.txt" "${node_base_url}/SHASUMS256.txt"
curl -fsSLo "${temporary_directory}/${node_archive}" "${node_base_url}/${node_archive}"
(
  cd "${temporary_directory}"
  grep " ${node_archive}$" SHASUMS256.txt > node.sha256
  sha256sum --check node.sha256
)
if [[ ! -x "/opt/node-v${NODE_VERSION}-linux-${node_arch}/bin/node" ]]; then
  tar -xJf "${temporary_directory}/${node_archive}" -C /opt
fi
ln -sfn "/opt/node-v${NODE_VERSION}-linux-${node_arch}" /opt/node
for executable in node npm npx corepack; do
  ln -sfn "/opt/node/bin/${executable}" "/usr/local/bin/${executable}"
done

if ! getent group "${APP_GROUP}" >/dev/null; then
  groupadd --system "${APP_GROUP}"
fi
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --gid "${APP_GROUP}" --home-dir /var/lib/haydevos --create-home --shell /usr/sbin/nologin "${APP_USER}"
fi
if ! getent group "${OPENCLAW_GROUP}" >/dev/null; then
  groupadd --system "${OPENCLAW_GROUP}"
fi
if ! id -u "${OPENCLAW_USER}" >/dev/null 2>&1; then
  useradd --system --gid "${OPENCLAW_GROUP}" --home-dir /var/lib/haydev-openclaw --create-home --shell /usr/sbin/nologin "${OPENCLAW_USER}"
fi

install -d -o root -g "${APP_GROUP}" -m 0750 "${APP_ROOT}" "${APP_ROOT}/releases" /etc/haydevos
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0700 /var/lib/haydevos /var/backups/haydevos
install -d -o "${OPENCLAW_USER}" -g "${OPENCLAW_GROUP}" -m 0700 /var/lib/haydev-openclaw
if [[ ! -e /etc/haydevos/haydevos.env ]]; then
  install -o root -g "${APP_GROUP}" -m 0640 /dev/null /etc/haydevos/haydevos.env
fi
if [[ ! -e /etc/haydevos/openclaw-broker.env ]]; then
  install -o root -g "${OPENCLAW_GROUP}" -m 0640 /dev/null /etc/haydevos/openclaw-broker.env
fi

install -o root -g root -m 0644 "${REPOSITORY_ROOT}/Caddyfile" /etc/caddy/Caddyfile
install -d -o root -g root -m 0755 /etc/systemd/system/caddy.service.d
install -o root -g root -m 0644 "${REPOSITORY_ROOT}/deploy/systemd/caddy-haydevos.conf" /etc/systemd/system/caddy.service.d/haydevos.conf
for unit in haydevos.service haydevos-readiness.service haydevos-readiness.timer haydevos-backup.service haydevos-backup.timer haydev-openclaw-broker.service; do
  install -o root -g root -m 0644 "${REPOSITORY_ROOT}/deploy/systemd/${unit}" "/etc/systemd/system/${unit}"
done

caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl daemon-reload
systemctl disable --now caddy >/dev/null 2>&1 || true
systemctl enable --now fail2ban

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "Bootstrap complete. Install secrets in /etc/haydevos/haydevos.env, then install a verified release."
echo "The backup timer remains disabled until an encrypted backup destination and /etc/haydevos/backup.env are verified."
echo "The OpenClaw broker unit remains disabled until an isolated Gateway and /etc/haydevos/openclaw-broker.env are independently verified."
