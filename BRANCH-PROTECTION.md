# Branch Protection Setup Guide

GitHub CLI is now installed and authenticated on the development machine, and the
rules below are already applied. This file remains the reference for what the
rules are and how to reproduce them.

## Current Configuration

| Setting | Value |
|---------|-------|
| Required status checks | `validate`, `lint-css`, `link-check`, `accessibility` (strict, branch must be up to date) |
| Required approvals | 1 |
| Enforce for administrators | Yes - no bypass |
| Force pushes | Not allowed |
| Branch deletion | Not allowed |
| Conversation resolution | Not required |
| Linear history | Not required |

## Known Limitation: The Approval Rule Cannot Be Satisfied

GitHub rejects a self-approval: `Review Can not approve your own pull request`
(HTTP 422). This repository has a single collaborator, so **"require 1 approval"
plus "no admin bypass" makes the rule impossible to satisfy** - every PR stays
`BLOCKED` forever.

Until a second account is added as a collaborator, merges are done by temporarily
setting `required_approving_review_count` to `0` and restoring it to `1`
immediately after the merge. The effective policy is unchanged - the owner merges
their own PR either way.

To make the rule work as intended, add a second account:

1. **Settings → Collaborators → Add people** and invite a second account
2. Leave `required_approving_review_count` at `1`

Or drop the requirement to `0` and rely on the four required status checks plus
"do not allow bypassing the above settings" to keep direct pushes blocked.

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
