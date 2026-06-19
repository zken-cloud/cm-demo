#!/usr/bin/env bash
# Roll back a CodeMender demo run:
#   1. restore files changed by `cm fix` to the committed (vulnerable) baseline
#   2. go back to the main branch
#   3. remove the cm-demo branch locally
#   4. remove the cm-demo branch on GitHub (origin)
#
# Usage: ./rollback.sh            (defaults to branch "cm-demo", remote "origin")
#        ./rollback.sh <branch>   (override the branch name)
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="${1:-cm-demo}"
REMOTE="${REMOTE:-origin}"

# 1) restore files changed by `cm fix` to the committed baseline.
#    `cm fix --auto-apply` edits files in place (uncommitted); discard those edits so the
#    working tree returns to the vulnerable baseline and we can switch branches cleanly.
if git diff --quiet && git diff --cached --quiet; then
  echo "no uncommitted cm fix edits to restore"
else
  git restore --staged --worktree -- .
  echo "restored cm fix edits to the committed (vulnerable) baseline"
fi

# 2) go back to the main branch
git checkout main

# 3) remove the cm-demo branch locally (if present)
if git show-ref --quiet --verify "refs/heads/$BRANCH"; then
  git branch -D "$BRANCH"
  echo "removed local branch '$BRANCH'"
fi

# 4) remove the cm-demo branch on GitHub (if present)
if git ls-remote --exit-code --heads "$REMOTE" "$BRANCH" >/dev/null 2>&1; then
  git push "$REMOTE" --delete "$BRANCH"
  echo "removed remote branch '$REMOTE/$BRANCH'"
fi

git fetch --prune "$REMOTE" >/dev/null 2>&1 || true
echo "✅ Restored vulnerable baseline; back on main; '$BRANCH' removed locally and on $REMOTE."
