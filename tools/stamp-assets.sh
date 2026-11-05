#!/usr/bin/env bash
# Stamp every local stylesheet and script link with a content hash, so a page
# always loads the CSS and JS it was written for.
#
# GitHub Pages serves .css and .js with a four-hour max-age and HTML with ten
# minutes. Without a stamp, a browser that visited today pairs the new HTML
# with its cached old stylesheet for up to four hours (what happened on the
# 2026-11-05 rework). With one, a changed file gets a new URL and the old
# copy is never asked for.
#
#   ./tools/stamp-assets.sh          rewrite the links in place
#   ./tools/stamp-assets.sh --check  exit non-zero if any link is stale
#
# Rewrites href="x.css" and src="x.js" (relative paths only; CDN URLs are
# left alone) to x.css?v=<first 8 hex of md5>. Idempotent: running it twice
# changes nothing. Run it before opening a PR that touches a .css or .js
# file; --check is what a pre-push hook or CI step would run.

set -euo pipefail

cd "$(dirname "$0")/.."

mode=${1:-write}
stale=0

# Pages to stamp: every HTML file except the banner tooling (its templates are
# rendered by a script, not served).
pages=$(find . -name '*.html' -not -path './.git/*' -not -path './gen_app_banners/*' | sort)

for page in $pages; do
  dir=$(dirname "$page")
  updated=$(perl -pe '
    s{\b(href|src)="([^"?:]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"}{
      my ($attr, $path) = ($1, $2);
      my $file = "'"$dir"'/$path";
      if (-f $file) {
        my $hash = `md5 -q "$file"`;
        chomp $hash;
        $attr . q{="} . $path . q{?v=} . substr($hash, 0, 8) . q{"};
      } else {
        $attr . q{="} . $path . q{"};
      }
    }ge' "$page")
  if [ "$updated" != "$(cat "$page")" ]; then
    if [ "$mode" = "--check" ]; then
      echo "stale: $page"
      stale=1
    else
      printf '%s\n' "$updated" > "$page"
      echo "stamped: $page"
    fi
  fi
done

if [ "$mode" = "--check" ]; then
  if [ "$stale" -ne 0 ]; then
    echo "Run ./tools/stamp-assets.sh and commit the result." >&2
    exit 1
  fi
  echo "asset stamps up to date"
fi
