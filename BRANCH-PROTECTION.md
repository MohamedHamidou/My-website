# Branch Protection Setup Guide

Since GitHub CLI is not installed, follow these steps to configure branch protection rules manually:

## Steps to Configure Branch Protection

1. Go to your repository: https://github.com/MohamedHamidou/My-website

2. Click **Settings** (tab at the top)

3. Click **Branches** (left sidebar)

4. Under "Branch protection rules", click **Add rule**

5. Configure the following settings:

   - **Branch name pattern**: `main`
   
   - **Require a pull request before merging**
     - [x] Require approvals: `1`
     - [x] Dismiss stale pull request approvals when new commits are pushed
   
   - **Require status checks to pass before merging**
     - [x] Require branches to be up to date before merging
     - Search and add these required checks:
       - `validate`
       - `lint-css`
       - `link-check`
       - `accessibility`
   
   - **Require conversation resolution before merging**
   
   - **Require linear history** (optional, recommended)
   
   - **Do not allow bypassing the above settings**
     - [x] Include administrators

6. Click **Create** or **Save changes**

## What This Does

- **Blocks direct pushes** to `main` - all changes must go through PRs
- **Requires CI to pass** - HTML validation, CSS linting, link checking, and accessibility checks must all pass
- **Requires 1 approval** - at least one person must review and approve the PR
- **Prevents stale PRs** - PRs must be up-to-date with main before merging

## Optional: Auto-merge

To enable auto-merge when all checks pass and PR is approved:

1. Go to **Settings** → **General**
2. Scroll to **Pull Requests**
3. Check **Allow auto-merge**

## Optional: Dependabot

To enable automated dependency updates:

1. Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

2. Commit and push to `main`
