#!/usr/bin/env bash
# Roll the demo app back to its pristine vulnerable baseline.
#
# Run this AFTER `cm fix` (or `cm find verify`) to:
#   1. drop any local commits that never went through a PR
#      (keeps commits on origin/<default> and commits belonging to any PR),
#   2. revert applied patches / working-tree edits,
#   3. remove CodeMender artifacts (.exploit/, *.bak, .cm_project, logs).
#
# It only rewrites LOCAL history; it never force-pushes the remote.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "✗ No git repo here." >&2; exit 1
fi

# ── 1. drop commits with no PR ────────────────────────────────────────────────
DEF="$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p')"
DEF="${DEF:-main}"

if git remote get-url origin >/dev/null 2>&1; then
  git fetch -q origin "$DEF" 2>/dev/null || true

  PROT="$(mktemp)"
  # protected = every commit merged into the remote default branch ...
  git rev-list "origin/$DEF" >>"$PROT" 2>/dev/null || true
  # ... plus every commit that belongs to a PR (open or merged), if gh is usable.
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    for n in $(gh pr list --state all --json number --jq '.[].number' 2>/dev/null); do
      gh pr view "$n" --json commits --jq '.commits[].oid' 2>/dev/null >>"$PROT" || true
    done
  fi

  # newest ancestor of HEAD that is protected -> reset there (drops non-PR commits)
  TARGET=""
  for c in $(git rev-list HEAD); do
    if grep -qx "$c" "$PROT"; then TARGET="$c"; break; fi
  done
  rm -f "$PROT"

  if [ -n "$TARGET" ] && [ "$TARGET" != "$(git rev-parse HEAD)" ]; then
    echo "Dropping local commits with no PR:"
    git --no-pager log --oneline "$TARGET"..HEAD | sed 's/^/   - /'
    git reset --hard "$TARGET" >/dev/null
  fi
fi

# ── 2 & 3. revert working-tree edits + remove cm artifacts ────────────────────
git checkout -- .
git clean -fdx >/dev/null

echo "✅ Rolled back to vulnerable baseline ($(git rev-parse --short HEAD))."
echo "   Restart the app:  node server/api.js"
