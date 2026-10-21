# My Website - Project History

## What We Built

A simple website hosted on GitHub Pages using agent-skills for AI-assisted development.

## Live Website

**URL:** https://mohamedhamidou.github.io/My-website/

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
  index.html               <-- Your website file
  project-history/         <-- This summary folder
    README.md              <-- You are here
  skills/                  <-- Agent skills (added later)
  AGENTS.md                <-- OpenCode config (added later)
```

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
