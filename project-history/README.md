# My Website - Project History

## What We Built

A static website served from a self-hosted Ubuntu laptop, with GitHub Pages kept as a parallel fallback.

The site has no framework and no build step - `public/` is the publishable artifact.

## Live Websites

| Where | URL | Notes |
|-------|-----|-------|
| Ubuntu laptop (LAN) | `http://192.168.0.101/` | nginx on the laptop |
| Ubuntu laptop (public) | `site-url` on the laptop | Cloudflare quick tunnel - **the hostname changes on every restart** |
| GitHub Pages (fallback) | https://mohamedhamidou.github.io/My-website/ | Deployed by CI from `public/` |

To get the current public URL, run `site-url` on the laptop. See [DEPLOY.md](../DEPLOY.md) for the full setup and the reason the URL is not stable.

---

## Steps We Completed

### Step 1: Project Setup
- Created project folder: `D:\AntiGravity\my-website`
- This folder will hold our website and development tools

### Step 2: Git Installation & Configuration
- Installed Git (version 2.55.0)
- Configured Git with your identity:
  - Name: Mohamed Hamidou
  - Email: mhamidou386@gmail.com
- This is a one-time setup for all projects on this machine

### Step 3: Initialize Git Repository
- Ran `git init` to turn the folder into a Git repository
- Created `.git/` folder that tracks all changes
- Created `index.html` with a simple "Hello, World!" page

### Step 4: First Commit (Save to Git)
- Ran `git add index.html` to queue the file
- Ran `git commit -m "First commit: add index.html"` to save
- This created checkpoint #1 in Git history

### Step 5: Create GitHub Repository
- Created repository at: https://github.com/MohamedHamidou/My-website
- This is where your code lives online

### Step 6: Connect Local to GitHub
- Ran `git remote add origin https://github.com/MohamedHamidou/My-website.git`
- This tells Git where GitHub is

### Step 7: Push to GitHub
- Ran `git branch -M main` (renamed branch to "main")
- Ran `git push -u origin main` (sent files to GitHub)
- Now your files are backed up online

### Step 8: Enable GitHub Pages
- Went to Settings > Pages in GitHub
- Selected "main" branch as source
- Clicked Save
- Website went live at: https://mohamedhamidou.github.io/My-website/

---

## Project Structure

```
my-website/
  .git/                    <-- Git tracking folder
  public/                  <-- The publishable site (served by nginx + Pages)
    index.html             <-- Your website file
  deploy/                  <-- Server tooling (bootstrap, deploy, rollback)
  project-history/         <-- This summary folder
    README.md              <-- You are here
  skills/                  <-- Agent skills (not published)
  AGENTS.md                <-- OpenCode config
  DEPLOY.md                <-- Deployment guide
```

### Step 9: Self-Hosted Deployment

- Moved the site to a self-hosted Ubuntu laptop on the LAN (`192.168.0.101`)
- Served by nginx from `/srv/my-website/current`
- Published to the internet through a Cloudflare quick tunnel, because the network
  has three NAT layers and port forwarding cannot work
- GitHub Actions deploys automatically on push to `main` via a self-hosted runner
  on the laptop, gated on the same four quality checks as the Pages deploy
- Branch protection now requires 1 approving review. A single-owner repo cannot
  satisfy that rule, so merges are done by temporarily relaxing the approval
  count to 0 and restoring it immediately afterwards.

---

## Useful Git Commands

| Command | What it does |
|---------|-------------|
| `git status` | See what files have changed |
| `git add .` | Queue all changed files |
| `git commit -m "message"` | Save a checkpoint |
| `git push` | Send saves to GitHub |
| `git pull` | Get latest from GitHub |
| `git log --oneline` | See save history |

---

## What's Next

Adding agent-skills to enable AI-assisted development with OpenCode.
