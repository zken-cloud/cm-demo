#!/usr/bin/env bash
# Roll back a CodeMender demo run:
#   1. go back to the main branch
#   2. remove the cm-demo branch locally
#   3. remove the cm-demo branch on GitHub (origin)
#
# Usage: ./rollback.sh            (defaults to branch "cm-demo", remote "origin")
#        ./rollback.sh <branch>   (override the branch name)
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="${1:-cm-demo}"
REMOTE="${REMOTE:-origin}"

# 1) go back to the main branch
git checkout main

# 2) remove the cm-demo branch locally (if present)
if git show-ref --quiet --verify "refs/heads/$BRANCH"; then
  git branch -D "$BRANCH"
  echo "removed local branch '$BRANCH'"
fi

# 3) remove the cm-demo branch on GitHub (if present)
if git ls-remote --exit-code --heads "$REMOTE" "$BRANCH" >/dev/null 2>&1; then
  git push "$REMOTE" --delete "$BRANCH"
  echo "removed remote branch '$REMOTE/$BRANCH'"
fi

git fetch --prune "$REMOTE" >/dev/null 2>&1 || true
echo "✅ Back on main; '$BRANCH' removed locally and on $REMOTE."
