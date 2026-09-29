# OVH VPS production kit

This kit prepares Ubuntu 24.04 for the immutable HayDevOS standalone artifact. It deliberately separates server bootstrap, secret installation, release installation, DNS cutover and public TLS activation.

## Current cutover state

`haydevos.com` and `www.haydevos.com` currently serve the verified Vercel production deployment. Keep those records in place until the OVH VPS has a public IPv4 address, local readiness is green and SSH-key access is confirmed.

## 1. Bootstrap the issued VPS

Upload this repository's `Caddyfile` and `deploy/` directory to a temporary root-owned location, then run:

```bash
sudo HAYDEV_DOMAIN=haydevos.com bash deploy/vps/bootstrap-ubuntu.sh
```

The bootstrap verifies Ubuntu 24.04, installs checksum-verified Node 24.18.0, installs Caddy from its official repository, creates the unprivileged `haydevos` service account, installs hardened systemd units, enables fail2ban and permits only OpenSSH/80/443 through UFW. Caddy remains stopped until cutover.

## 2. Install runtime secrets

Write the production values from `.env.example` to `/etc/haydevos/haydevos.env` as `KEY=value` entries. Ownership must be `root:haydevos` and mode `0640`. Do not install `DIRECT_URL` or bootstrap variables in this runtime file.

Required canonical values include:

```text
NODE_ENV=production
PORT=3000
HAYDEV_DOMAIN=haydevos.com
APP_ORIGINS=https://haydevos.com,https://www.haydevos.com
HAYDEV_ENVIRONMENT=production
```

All database, Storage, scanner and Owner AI values remain server-only.

## 3. Build and transfer an immutable release

On the trusted build workstation:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:security-structure
npm run build
npm run release:package
```

Transfer the resulting archive and `.sha256` file from `.artifacts/` to the VPS. The archive excludes `.env`, Git data, local databases, uploads and downloads.

Install it using the release ID printed by the packaging command:

```bash
sudo bash deploy/vps/install-release.sh /tmp/haydevos-RELEASE.tar.gz /tmp/haydevos-RELEASE.tar.gz.sha256 RELEASE
```

The installer verifies the SHA-256 and archive paths, installs a root-owned immutable release, atomically updates `/opt/haydevos/current`, starts Node on `127.0.0.1:3000` and requires local readiness before success.

## 4. Cut over DNS without downtime

Only after local readiness passes:

1. In Namecheap, replace both apex Vercel A records with the assigned OVH IPv4 address.
2. Change `www` to a CNAME for `haydevos.com.`.
3. If OVH assigns stable IPv6 and the host firewall is ready, add the AAAA record.
4. Wait until public resolvers return the VPS address.
5. On the VPS run `sudo PUBLIC_IPV4=x.x.x.x bash deploy/vps/activate-edge.sh`.

The activation script refuses to start public TLS until DNS resolves to the supplied VPS address, then verifies HTTPS readiness for both hostnames. Keep the Vercel deployment intact as the rollback target through the observation window.

## 5. Backups

Provider automated backup is useful but does not replace an application-level PostgreSQL plus private Storage backup. Mount and verify an encrypted destination at `/var/backups/haydevos`, copy `backup.env.example` to `/etc/haydevos/backup.env`, install the real migration URL there, change `BACKUP_DESTINATION_CONFIRMED_ENCRYPTED` to `YES`, and run one manual backup successfully before enabling the timer:

```bash
sudo systemctl start haydevos-backup.service
sudo systemctl enable --now haydevos-backup.timer
```

Do not enable the timer merely because the directory exists; encryption and off-host replication must be independently verified.

## 6. Evidence and rollback

Run the external `scripts/production-smoke.mjs` against `https://haydevos.com`, record the release ID and readiness output, then follow `docs/production-release-checklist.md`. Rollback is an atomic change of `/opt/haydevos/current` to the previous verified release followed by `systemctl restart haydevos`; never improvise a database down migration.
