#!/usr/bin/bash

set -eo pipefail

SELF=$(readlink -f "$0")
DIR=$(dirname "$SELF")

cd "$DIR"

branch=$(git rev-parse --abbrev-ref HEAD)

if [[ "$branch" = gh-pages ]]; then
    echo 'Already on gh-pages branch!'>&2
    exit 1
fi

if [[ -e docs ]]; then
    rm -rf docs
fi

git checkout gh-pages

cp -r docs/* .

if git status --porcelain --untracked-files=no | grep '^.M' >/dev/null; then
    git add *.html .nojekyll functions assets types classes media
    git commit -m "updated API documentation"
    git push
    echo "Updated API documentation."
else
    echo 'No changes!'>&2
fi

git checkout "$branch"
