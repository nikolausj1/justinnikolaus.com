#!/bin/bash
# Render Mosaic prototype variants one after another, then encode each to the site's clip spec.
# Usage: ./render-all.sh [name ...]   (default: the round 1 four; writes renders/<name>.mp4 and ../../review/clips/mosaic-<name>.mp4)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p renders ../../review/clips
NAMES=("$@"); [ ${#NAMES[@]} -eq 0 ] && NAMES=(device-mark device-nomark bare-mark bare-nomark)
for name in "${NAMES[@]}"; do
  ./use.sh "$name"
  npx --yes hyperframes@0.9.23 render --quality looks --fps 30 --output "renders/$name.mp4"
  # Site spec: 1200x800, H.264 high, yuv420p, 30 fps, no audio, faststart.
  ffmpeg -v error -y -i "renders/$name.mp4" -vf "scale=1200:800:flags=lanczos,format=yuv420p" \
    -c:v libx264 -profile:v high -preset slow -crf 23 -an -movflags +faststart "../../review/clips/mosaic-$name.mp4"
  ffmpeg -v error -y -i "../../review/clips/mosaic-$name.mp4" -frames:v 1 -q:v 2 "../../review/clips/mosaic-$name-poster.jpg"
  echo "done $name"
done
./use.sh device-mark-r2
echo ALL DONE
