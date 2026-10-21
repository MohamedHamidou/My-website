# Deployment

This site is served as static files from a self-hosted Ubuntu laptop. There is no
build step, no framework and no runtime server — the `public/` directory is the
publishable artifact.

---

## Topology

```
                    outbound-only reverse tunnel
  ┌──────────────┐   (no inbound ports, ever)   ┌──────────────────────────┐
  │  Internet    │ ◀────────────────────────────▶ │  Cloudflare edge        │
  └──────────────┘                               └────────────┬─────────────┘
                                                            │ https
  ┌──────────────────────────────────────────────────────────▼───────────────┐
  │  Ubuntu laptop - 192.168.0.101                                           │
  │                                                                          │
  │  cloudflared ──▶ nginx :80 ──▶ /srv/my-website/current                  │
  │                            (symlink)  └──▶ /srv/my-website/releases/<sha>│
  │                                                                          │
  │  GitHub Actions self-hosted runner ──▶ sudo deploy-site --release <sha>  │
  └──────────────────────────────────────────────────────────────────────────┘
```

### Why a tunnel and not port forwarding

The network this laptop sits on has **three NAT layers** and a shared public IP:

```
traceroute 8.8.8.8
  1   192.168.0.1     TP-Link TL-WR841N      (yours)
  2   192.168.68.9    upstream router        (not yours)
  3   10.10.10.9      carrier / CGNAT        (not yours)
  4   103.82.174.5    public campus egress
```

Port 80 forwarded on the TL-WR841N dies at hop 2. Nothing inbound can ever reach
the laptop, so the tunnel is initiated **outbound** and the edge dials back in.

The same constraint is why a **hosted** GitHub Actions runner cannot SSH to the
laptop — it has no route to `192.168.0.101`. The CI runner is therefore
**self-hosted on the laptop itself**.

> The public hostname is a random `*.trycloudflare.com` name and **changes every
> time the tunnel restarts**. Run `site-url` to get the current one. For a stable
> address, put a domain in front of the tunnel (Cloudflare DNS + named tunnel, or
> Tailscale Funnel) — the tunnel sits in front of nginx either way, so swapping is
> a config change, not a redeploy.

---

## One-time setup on the laptop

```bash
# from a machine that has the repo
scp -r deploy ubuntu@192.168.0.101:~/

ssh ubuntu@192.168.0.101
sudo bash ~/deploy/install.sh --publish ~/public --with-runner
```

`install.sh` installs nginx / rsync / git, creates `/srv/my-website`, installs the
nginx vhost, `deploy-site`, `site-url` and the `site-tunnel` systemd service,
tightens `ufw` to SSH-only inbound, and creates the `runner` service account
with NOPASSWD sudo for `deploy-site` alone.

### Manual equivalents

| Step | Command |
|------|---------|
| Firewall | `ufw allow OpenSSH && ufw --force enable` |
| Reload nginx after config edits | `nginx -t && systemctl reload nginx` |
| Tunnel status | `systemctl status site-tunnel` |
| Current public URL | `site-url` |
| Deploy state | `deploy-site --status` |

> **DHCP reservation.** Set a static lease for `192.168.0.101` in the TL-WR841N
> (192.168.0.1 → DHCP Server → Address Reservation). Otherwise the laptop can move
> to a different address and the tunnel's target changes.

---

## Deploy flow

```
push to main
   │
   ├─ validate · lint-css · link-check · accessibility   (GitHub-hosted runners)
   │        └─ any failure blocks BOTH deploys
   │
   ├─▶ deploy-pages   (GitHub-hosted)  → uploads public/ to GitHub Pages
   └─▶ deploy-server  (self-hosted)    → sudo deploy-site --release $GITHUB_SHA
                                             → copies public/ to releases/<sha>
                                             → atomically swaps the `current` symlink
                                             → nginx -t && systemctl reload nginx
```

### Releasing manually

```bash
rsync -a --delete public/ ubuntu@192.168.0.101:/tmp/release/
ssh ubuntu@192.168.0.101 'sudo /usr/local/sbin/deploy-site --release manual-$(date +%s) --source /tmp/release'
```

### Rollback

```bash
ssh ubuntu@192.168.0.101 'sudo /usr/local/sbin/deploy-site --rollback'
```

`deploy-site` keeps the last 5 releases on disk and records the one it replaced in
`/srv/my-website/previous`, so a rollback is a single symlink swap. The swap is
atomic (`ln -sfn` to a temp name + `mv -T`), so a failed copy never leaves a
half-published site in front of users.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `public/` | The publishable site. This is what nginx and GitHub Pages serve. |
| `deploy/` | Server-side tooling: `install.sh`, `deploy-site`, `site-url`, nginx vhost, systemd unit. |
| `deploy/install.sh` | Idempotent bootstrap for the laptop. |
| `deploy/deploy-site` | Release / rollback engine, installed at `/usr/local/sbin/deploy-site`. |
| `skills/` | Agent skill definitions. **Not published** — they live outside `public/`. |
| `project-history/` | Project notes. **Not published.** |

Anything outside `public/` stays private. `skills/`, `package.json` and
`project-history/*.pdf` were publicly served by the old GitHub Pages config
(`path: '.'`); the publish root is now `public/`, so they are not.

---

## GitHub repository settings

Two settings are required and are **not** configurable from the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   Required by the `deploy-pages` job (`actions/configure-pages`).
2. **Settings → Actions → Runners → New self-hosted runner** (Linux, x64).
   The registration token is single-use and expires in one hour.

The runner should be registered with a **runner group restricted to this
repository**. The `deploy-server` job only triggers on `push` to `main`, never on
`pull_request`, so a fork pull request cannot execute code on the laptop. The four
quality gates always run on GitHub-hosted runners.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `site-url` reports no URL | Tunnel not up | `systemctl status site-tunnel && journalctl -u site-tunnel -n 50` |
| Public URL 502 | nginx not serving the release | `curl -I http://127.0.0.1/` on the laptop; check `/var/log/nginx/my-website.error.log` |
| Public URL 404 | `current` symlink dangling | `deploy-site --status`; `ls -l /srv/my-website/current` |
| CI job stuck "waiting for runner" | Self-hosted runner offline | The runner must be running: `systemctl status actions.runner` |
| `deploy-site` permission denied | Runner user not provisioned | `visudo -c` and check `/etc/sudoers.d/deploy-site` |
| Site serves old content | Browser cache | Assets are cached 7 days; hard-reload |
| Cloudflare error 1033 | Tunnel disconnected | `systemctl restart site-tunnel` |
