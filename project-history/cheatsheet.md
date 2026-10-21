# Git & GitHub Cheat Sheet

## Your Project Info
- **Local folder:** D:\AntiGravity\my-website
- **GitHub repo:** https://github.com/MohamedHamidou/My-website
- **Live website:** https://mohamedhamidou.github.io/My-website/

---

## Daily Workflow (What to do each time you work)

### 1. Check what changed
```
git status
```

### 2. Save your work
```
git add .
git commit -m "describe what you did"
```

### 3. Send to GitHub
```
git push
```

---

## Common Commands

| I want to... | Command |
|--------------|---------|
| See what files changed | `git status` |
| See save history | `git log --oneline` |
| Save all changes | `git add .` |
| Save with a message | `git commit -m "your message"` |
| Send to GitHub | `git push` |
| Get from GitHub | `git pull` |
| Undo a change (not saved yet) | `git checkout -- filename` |
| See what changed in a file | `git diff filename` |

---

## Commit Message Examples

- `git commit -m "add contact page"`
- `git commit -m "fix broken link"`
- `git commit -m "update website styles"`
- `git commit -m "add images folder"`

---

## Troubleshooting

**Problem:** `git push` asks for username/password
**Solution:** Use a GitHub Personal Access Token instead of password

**Problem:** Files not showing on website
**Solution:** Make sure you pushed with `git push` and wait 2 minutes

**Problem:** Made a mistake, want to undo
**Solution:** `git revert HEAD` (undoes last commit)
