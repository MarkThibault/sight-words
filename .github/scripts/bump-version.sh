#!/usr/bin/env bash
# Raises APP_VERSION in js/config.js and the matching ?v= stamps in index.html,
# so tablets load the new files instead of old cached copies.
# Usage: bump-version.sh patch|minor|major   (prints the new version)
set -euo pipefail
cd "$(dirname "$0")/../.."

part="${1:-patch}"
current=$(sed -n "s/^const APP_VERSION = '\([0-9]*\.[0-9]*\.[0-9]*\)'.*/\1/p" js/config.js)
if [ -z "$current" ]; then
  echo "Couldn't find APP_VERSION in js/config.js" >&2
  exit 1
fi

IFS=. read -r major minor patch <<< "$current"
case "$part" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  *) echo "Usage: $0 patch|minor|major" >&2; exit 1 ;;
esac
next="$major.$minor.$patch"

sed -i "s/^const APP_VERSION = '$current'/const APP_VERSION = '$next'/" js/config.js
sed -i "s/?v=[0-9.]*\"/?v=$next\"/g" index.html
echo "$next"
