#!/usr/bin/env bash
# Roll the demo app back to its pristine vulnerable baseline.
# Run this AFTER `cm fix` (or `cm find verify`) to undo applied patches and
# remove CodeMender's working artifacts, so you can re-run the demo cleanly.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "✗ No git baseline here. (Expected the repo created by the demo.)" >&2
  exit 1
fi

git checkout -- .            # revert any edits cm applied to tracked source files
git clean -fdx >/dev/null    # remove .exploit/, *.bak, .cm_project, logs, stray files

echo "✅ Rolled back to vulnerable baseline ($(git rev-parse --short HEAD))."
echo "   Restart the app:  node server/api.js"
