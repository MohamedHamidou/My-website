#!/usr/bin/env bash
#
# install.sh - bootstrap the Ubuntu laptop to serve this site.
#
# Run as root on the laptop:
#   sudo bash deploy/install.sh --publish public
#
# Options:
#   --publish <dir>   copy <dir> into the first release and make it live
#   --with-runner     also create the 'runner' service account for the
#                     self-hosted GitHub Actions runner and grant it the
#                     right to run deploy-site
#   --no-tunnel       skip installing cloudflared and the site-tunnel service
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PUBLISH_DIR=""
WITH_RUNNER=0
NO_TUNNEL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --publish)     PUBLISH_DIR="${2:-}"; shift 2 ;;
    --with-runner) WITH_RUNNER=1; shift ;;
    --no-tunnel)   NO_TUNNEL=1; shift ;;
    -h|--help)     sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "install.sh: unknown option: $1" >&2; exit 1 ;;
  esac
done

[[ $EUID -eq 0 ]] || { echo "install.sh: must be run as root (sudo)" >&2; exit 1; }

log() { echo "==> $*"; }

# --- packages ---------------------------------------------------------------
log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx rsync git curl ca-certificates ufw >/dev/null

# --- directory layout -------------------------------------------------------
log "Creating /srv/my-website layout"
mkdir -p /srv/my-website/releases
chmod 755 /srv /srv/my-website /srv/my-website/releases

# --- nginx ------------------------------------------------------------------
log "Installing nginx site"
cp "$SCRIPT_DIR/nginx/my-website.conf" /etc/nginx/sites-available/my-website
ln -sfn /etc/nginx/sites-available/my-website /etc/nginx/sites-enabled/my-website
rm -f /etc/nginx/sites-enabled/default
nginx -t

# --- deploy tooling ---------------------------------------------------------
log "Installing deploy tooling"
install -m 0755 "$SCRIPT_DIR/deploy-site" /usr/local/sbin/deploy-site
install -m 0755 "$SCRIPT_DIR/site-url"    /usr/local/bin/site-url

# --- first release ----------------------------------------------------------
if [[ -n "$PUBLISH_DIR" ]]; then
  [[ -d "$PUBLISH_DIR" ]] || { echo "install.sh: publish dir not found: $PUBLISH_DIR" >&2; exit 1; }
  log "Publishing first release from $PUBLISH_DIR"
  release="$(date +%Y%m%d%H%M%S)-initial"
  target="/srv/my-website/releases/$release"
  mkdir -p "$target"
  cp -a "$PUBLISH_DIR/." "$target/"
  chown -R root:root "$target"
  find "$target" -type d -exec chmod 0755 {} +
  find "$target" -type f -exec chmod 0644 {} +
  ln -sfn "$target" /srv/my-website/current.new
  mv -Tf /srv/my-website/current.new /srv/my-website/current
fi

# --- cloudflared tunnel -----------------------------------------------------
if [[ $NO_TUNNEL -eq 0 ]]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    log "Installing cloudflared"
    arch="$(dpkg --print-architecture)"
    case "$arch" in
      amd64) pkg=cloudflared-linux-amd64.deb ;;
      arm64) pkg=cloudflared-linux-arm64.deb ;;
      *) echo "install.sh: unsupported architecture: $arch" >&2; exit 1 ;;
    esac
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/$pkg" "https://github.com/cloudflare/cloudflared/releases/latest/download/$pkg"
    dpkg -i "$tmp/$pkg" >/dev/null
    rm -rf "$tmp"
  else
    log "cloudflared already installed: $(cloudflared --version 2>&1)"
  fi

  log "Installing site-tunnel systemd service"
  touch /var/log/cloudflared.log
  chmod 640 /var/log/cloudflared.log
  cp "$SCRIPT_DIR/systemd/site-tunnel.service" /etc/systemd/system/site-tunnel.service
  systemctl daemon-reload
  systemctl enable --now site-tunnel
fi

# --- firewall ---------------------------------------------------------------
log "Configuring firewall (SSH only, inbound HTTP stays closed)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow OpenSSH >/dev/null 2>&1 || true
  # Never enable the firewall unless the SSH rule is actually in place,
  # otherwise enabling it locks the operator out of the machine.
  if ufw status | grep -q '22/tcp'; then
    ufw --force enable >/dev/null
    ufw status verbose || true
  else
    echo "install.sh: WARNING - no SSH rule found, leaving ufw untouched" >&2
  fi
fi

# --- CI runner account ------------------------------------------------------
if [[ $WITH_RUNNER -eq 1 ]]; then
  log "Creating 'runner' service account"
  if ! id -u runner >/dev/null 2>&1; then
    useradd --system --create-home --home-dir /srv/actions-runner --shell /bin/bash runner
  fi
  mkdir -p /srv/actions-runner
  chown runner:runner /srv/actions-runner
  printf 'runner ALL=(root) NOPASSWD: /usr/local/sbin/deploy-site\n' > /etc/sudoers.d/deploy-site
  chmod 440 /etc/sudoers.d/deploy-site
  visudo -c >/dev/null
fi

# --- start nginx ------------------------------------------------------------
log "Starting nginx"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
systemctl is-active --quiet nginx || { echo "install.sh: nginx failed to start" >&2; exit 1; }

log "Done."
if [[ $NO_TUNNEL -eq 0 ]]; then
  echo "    local:  http://$(hostname -I | awk '{print $1}')/"
  sleep 5
  echo "    public: $(site-url 2>/dev/null || echo 'tunnel still starting, run: site-url')"
fi
