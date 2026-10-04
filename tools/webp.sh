#!/bin/sh
# Writes a WebP beside each PNG screenshot and prints the <picture> markup
# for it, with the image's own width and height so the page does not shift
# while it loads. The PNG stays as the fallback and the lightbox opens the
# WebP (lightbox.js reads currentSrc).
#
#   tools/webp.sh specula/specula-overview.png [more.png ...]
#
# Quality 85, lossy: on Specula's dark window the small sidebar text stays
# as crisp as the PNG (checked 2026-10-02 on specula-music-module.png,
# 784 KB as PNG, about 220 KB as WebP). Needs cwebp (brew install webp).
set -eu

for png in "$@"; do
    case "$png" in
        *.png) ;;
        *) echo "skipped (not a .png): $png" >&2; continue ;;
    esac
    webp="${png%.png}.webp"
    cwebp -quiet -q 85 -m 6 -mt -metadata none "$png" -o "$webp"
    w=$(sips -g pixelWidth "$png" | awk '/pixelWidth/ { print $2 }')
    h=$(sips -g pixelHeight "$png" | awk '/pixelHeight/ { print $2 }')
    name=$(basename "$png" .png)
    before=$(stat -f %z "$png")
    after=$(stat -f %z "$webp")
    echo "$name: $((before / 1024)) KB PNG, $((after / 1024)) KB WebP" >&2
    printf '<picture><source srcset="%s.webp" type="image/webp"><img src="%s.png" width="%s" height="%s" alt="" loading="lazy" decoding="async"></picture>\n' \
        "$name" "$name" "$w" "$h"
done
