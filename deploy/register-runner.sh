#!/usr/bin/env bash
#
# register-runner.sh - install and register the GitHub Actions self-hosted runner.
#
# Usage (as root):
#   sudo bash ~/my-website/deploy/register-runner.sh <REGISTRATION_TOKEN>
#
# The runner is installed under /srv/actions-runner, owned by the 'runner'
# service account, and runs as a systemd service.
#
set -euo pipefail

TOKEN="${1:-}"
REPO="${REPO:-MohamedHamidou/My-website}"
RUNNER_DIR=/srv/actions-runner
RUNNER_USER=runner
UNIT=/etc/systemd/system/actions.runner.my-website.service

[[ $EUID -eq 0 ]] || { echo "register-runner.sh: must be run as root" >&2; exit 1; }
[[ -n "$TOKEN" ]] || { echo "register-runner.sh: registration token is required" >&2; exit 1; }

id "$RUNNER_USER" >/dev/null 2>&1 || { echo "register-runner.sh: user '$RUNNER_USER' missing - run install.sh --with-runner first" >&2; exit 1; }

log() { echo "==> $*"; }

# --- download ---------------------------------------------------------------
log "Resolving latest runner release"
case "$(dpkg --print-architecture)" in
  amd64) runner_arch=x64 ;;
  arm64) runner_arch=arm64 ;;
  *) echo "register-runner.sh: unsupported architecture" >&2; exit 1 ;;
esac

api_json=$(curl -fsSL "https://api.github.com/repos/actions/runner/releases/latest")
tarball=$(printf '%s' "$api_json" \
  | grep -oE "https://[^\"]*actions-runner-linux-${runner_arch}-[0-9.]+\.tar\.gz" \
  | head -n1)

[[ -n "$tarball" ]] || { echo "register-runner.sh: could not resolve runner tarball URL" >&2; exit 1; }
log "Downloading $tarball"

tmp="$(mktemp -d)"
curl -fsSL -o "$tmp/runner.tar.gz" "$tarball"
tar -xzf "$tmp/runner.tar.gz" -C "$tmp"

log "Installing into $RUNNER_DIR"
mkdir -p "$RUNNER_DIR"
cp -a "$tmp/." "$RUNNER_DIR/"
rm -rf "$tmp"

log "Installing OS dependencies"
"$RUNNER_DIR/bin/installdependencies.sh" >/dev/null 2>&1 || \
  echo "register-runner.sh: warning - installdependencies.sh reported issues, continuing"

chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"
# cp -a carries the temp dir's restrictive mode onto the target; make the
# runner directory traversable so an operator can inspect the install.
chmod 755 "$RUNNER_DIR"

# --- configure --------------------------------------------------------------
log "Configuring runner for $REPO"
sudo -u "$RUNNER_USER" "$RUNNER_DIR/config.sh" \
  --unattended \
  --replace \
  --url "https://github.com/$REPO" \
  --token "$TOKEN" \
  --name "my-website-$(hostname -s)" \
  --labels "self-hosted,linux,x64" \
  --work "$RUNNER_DIR/_work"

# --- service ----------------------------------------------------------------
log "Installing systemd service"
cat > "$UNIT" <<EOF
[Unit]
Description=GitHub Actions runner for $REPO
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUNNER_USER
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
Restart=always
RestartSec=10
KillSignal=SIGTERM
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable actions.runner.my-website.service >/dev/null
systemctl restart actions.runner.my-website.service
sleep 5

if systemctl is-active --quiet actions.runner.my-website.service; then
  log "Runner service is active"
else
  echo "register-runner.sh: runner service failed to start" >&2
  journalctl -u actions.runner.my-website.service --no-pager -n 30 >&2 || true
  exit 1
fi

# --- verify -----------------------------------------------------------------
# A running service is not the same as a runner GitHub can dispatch to, so
# confirm the registration actually landed.
log "Verifying registration with GitHub"
if command -v gh >/dev/null 2>&1; then
  gh api "repos/$REPO/actions/runners" \
    --jq ".runners[] | \"  runner: \(.name)  status: \(.status)  busy: \(.busy)\"" \
    2>/dev/null || echo "  (gh not authenticated on this host - skipping API check)"
else
  echo "  (gh not installed - skipping API check)"
fi

log "Done. Runner registered as: my-website-$(hostname -s)"
