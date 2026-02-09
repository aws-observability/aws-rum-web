# Git Safety Rules

## Read-Only Commands (allowed without permission)
- `git status`
- `git diff` (any variant)
- `git log`
- `git show`
- `git branch` (listing only)
- `git ls-remote`
- `git merge-base`

## All Other Git Commands — NEVER run without explicit user request
- `git add`
- `git commit`
- `git checkout` / `git switch`
- `git reset`
- `git revert`
- `git stash`
- `git push` / `git pull` / `git fetch`
- `git merge` / `git rebase`
- `git tag`
- `git rm`
- Any other command that modifies the working tree, index, or history
