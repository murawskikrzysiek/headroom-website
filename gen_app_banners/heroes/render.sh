#!/bin/zsh
# Renders the app-page hero images from their HTML sources at 2x.
#   ./render.sh   -> ../../lyra/lyra-hero.png, ../../audita/audita-hero.png
# The Audita numbers (dose, on-target shares) are computed from the plotted
# session inside audita-hero.html, so edit the session plan there, not the labels.
here=${0:A:h}
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # <html> <png> <width> <height>
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$3,$4" --screenshot="$2" "file://$here/$1" 2>/dev/null
}
render lyra-hero.html   "$here/../../lyra/lyra-hero.png"     960 540
render audita-hero.html "$here/../../audita/audita-hero.png" 960 560
