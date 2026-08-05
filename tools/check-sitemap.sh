#!/usr/bin/env bash
# Verify sitemap.xml matches the pages on disk.
#
# Run from anywhere:  ./tools/check-sitemap.sh
# Exits non-zero if a page is missing from the sitemap or the sitemap points at
# a file that no longer exists. Add new pages to sitemap.xml in the same PR.
#
# Deliberate exclusions live in EXCLUDE below. Keep the reasons in sitemap.xml's
# header comment in sync when you change them.

set -euo pipefail

cd "$(dirname "$0")/.."

# Pages that must NOT be in the sitemap, and why:
#   404.html                        - error page
#   auris/*                         - sunset app; three are noindex redirects to
#                                     Audita, releases.html is kept for old links
#   blog/pairing-auris-and-lyra.html - superseded by the Audita post, noindex
#   gen_app_banners/*               - OG-image tooling, not published content
EXCLUDE='^(404\.html|auris/|blog/pairing-auris-and-lyra\.html|gen_app_banners/)'

on_disk=$(find . -name '*.html' -not -path './.git/*' \
  | sed 's|^\./||' \
  | grep -Ev "$EXCLUDE" \
  | sort)

# Normalise sitemap URLs to repo-relative paths: "/" -> index.html, "/x/" -> x/index.html
in_sitemap=$(grep -oE 'https://headroomstudio\.dev/[^<]*' sitemap.xml \
  | sed 's|https://headroomstudio.dev/||' \
  | sed 's|^$|index.html|' \
  | sed 's|/$|/index.html|' \
  | sort)

missing=$(comm -13 <(echo "$in_sitemap") <(echo "$on_disk"))
stale=$(comm -23 <(echo "$in_sitemap") <(echo "$on_disk"))

status=0

if [ -n "$missing" ]; then
  echo "Pages on disk but MISSING from sitemap.xml:"
  echo "$missing" | sed 's|^|  |'
  status=1
fi

if [ -n "$stale" ]; then
  echo "sitemap.xml entries with NO file on disk:"
  echo "$stale" | sed 's|^|  |'
  status=1
fi

if command -v xmllint >/dev/null 2>&1; then
  if ! xmllint --noout sitemap.xml 2>/dev/null; then
    echo "sitemap.xml is not well-formed XML"
    status=1
  fi
fi

if [ "$status" -eq 0 ]; then
  echo "sitemap.xml OK - $(echo "$on_disk" | wc -l | tr -d ' ') pages, all listed"
fi

exit "$status"
