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
   └─▶ CI  (GitHub-hosted runners)
          validate · lint-css · link-check · accessibility · test-deploy
                 │
                 ├─▶ Deploy Pages   (GitHub-hosted)  → uploads public/ to GitHub Pages
                 └─▶ Deploy Server  (self-hosted)    → sudo install-deploy-site deploy/deploy-site
                                                            → sudo deploy-site --release <sha>
                                                            → copies public/ to releases/<sha>
                                                            → atomically swaps the `current` symlink
                                                            → nginx -t && systemctl reload nginx
                                                            → smoke test http://localhost/ == 200
```

The two deploy targets live in **separate workflow files** on purpose. GitHub
allows only one running and one pending job per concurrency group, so a single
workflow containing both targets would let a server deploy that is waiting for
an offline self-hosted runner block the Pages deploy of newer commits.

Both deploys are triggered by `workflow_run` on a successful CI run rather than
by the push itself, so they are gated on the same quality checks.

### Only `main`'s tip is ever published

Before publishing, the server deploy re-reads `main` from the GitHub API and
compares it against the commit that was tested. If `main` has moved on, the run
is skipped with a warning rather than publishing a stale commit. The practical
consequence: **if the newest commit on `main` fails CI, nothing deploys** — the
site stays on the last release that passed. That is deliberate; publishing a
commit whose successor broke the build would hide the breakage.

### The release engine updates itself

`deploy/deploy-site` is installed at `/usr/local/sbin/deploy-site`, and every
deploy first refreshes it from the copy in the repository:

```
sudo install-deploy-site "$GITHUB_WORKSPACE/deploy/deploy-site"
```

`install-deploy-site` is a root-owned script that the runner may invoke through
sudo. It syntax-checks the incoming file, refuses anything that is not the
release engine, and installs atomically. The point is that a fix to the deploy
tooling reaches the laptop on the next deploy, instead of waiting for a manual
root session — the failure mode where the laptop silently kept running a
buggy copy of the script.

### Workflow files

| File | Trigger | Runner | Target |
|------|---------|--------|--------|
| `.github/workflows/ci.yml` | PR + push to main | GitHub-hosted | quality gates only |
| `.github/workflows/deploy-pages.yml` | successful CI on main | GitHub-hosted | GitHub Pages |
| `.github/workflows/deploy-server.yml` | successful CI on main | self-hosted (laptop) | the laptop |

### Tests

`deploy/test-deploy-site.sh` exercises the release engine in a sandbox: the
release paths are redirected into a temp directory and `nginx`, `systemctl` and
`chown` are replaced with stubs, so publishing, status, rollback, argument
validation and the installer can all be tested without root and without touching
the live site.

```bash
bash deploy/test-deploy-site.sh
```

It runs in CI as the `test-deploy` job.

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
| `deploy/` | Server-side tooling: `install.sh`, `deploy-site`, `install-deploy-site`, `site-url`, `register-runner.sh`, nginx vhost, systemd unit. |
| `deploy/install.sh` | Idempotent bootstrap for the laptop. |
| `deploy/register-runner.sh` | Installs and registers the self-hosted Actions runner. |
| `deploy/deploy-site` | Release / rollback engine, installed at `/usr/local/sbin/deploy-site`. |
| `deploy/install-deploy-site` | Installs `deploy-site` from the repository copy. Installed at `/usr/local/sbin/install-deploy-site`. |
| `deploy/test-deploy-site.sh` | Sandbox regression tests for the release engine. |
| `skills/` | Agent skill definitions. **Not published** — they live outside `public/`. |
| `project-history/` | Project notes. **Not published.** |

Anything outside `public/` stays private. `skills/`, `package.json` and
`project-history/*.pdf` were publicly served by the old GitHub Pages config
(`path: '.'`); the publish root is now `public/`, so they are not.

---

## GitHub repository settings

**Settings → Pages → Build and deployment → Source: GitHub Actions.** Already
set - the Pages config is `build_type: workflow`.

### Getting a runner registration token

`deploy/register-runner.sh` needs a single-use registration token (valid for one
hour). Either:

- **GitHub UI** - Settings → Actions → Runners → New self-hosted runner, pick
  Linux + x64, copy the token from the configure step.
- **API** -
  ```bash
  gh api -X POST repos/MohamedHamidou/My-website/actions/runners/registration-token --jq .token
  ```

Then on the laptop:

```bash
sudo bash ~/my-website/deploy/register-runner.sh <TOKEN>
```

The runner should be registered in a **runner group restricted to this
repository**. The `deploy-server` job only triggers from a successful CI run on
`main`, never from a pull request, so a fork pull request cannot execute code on
the laptop. The four quality gates always run on GitHub-hosted runners.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `site-url` reports no URL | Tunnel not up | `systemctl status site-tunnel && journalctl -u site-tunnel -n 50` |
| Public URL 502 | nginx not serving the release | `curl -I http://127.0.0.1/` on the laptop; check `/var/log/nginx/my-website.error.log` |
| Public URL 404 | `current` symlink dangling | `deploy-site --status`; `ls -l /srv/my-website/current` |
| CI job stuck "waiting for runner" | Self-hosted runner offline | The runner must be running: `systemctl status actions.runner` |
| `deploy-site` permission denied | Runner user not provisioned | `visudo -c` and check `/etc/sudoers.d/deploy-site` |
| Deploy job fails with `unknown argument` | The laptop is running a stale `deploy-site` | `sudo install-deploy-site <repo>/deploy/deploy-site`; the deploy workflow now does this automatically |
| Site serves old content | Browser cache | Assets are cached 7 days; hard-reload |
| Cloudflare error 1033 | Tunnel disconnected | `systemctl restart site-tunnel` |
