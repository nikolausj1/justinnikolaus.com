#!/bin/bash
# Render one vignette project and encode it to the site's clip spec.
# Usage: tools/render.sh <project>   (writes videos/<project>/renders/<project>.mp4 and review/clips/<project>.mp4 + poster)
set -euo pipefail
cd "$(dirname "$0")/../videos/$1"
mkdir -p renders ../../review/clips
npx --yes hyperframes@0.9.23 render --quality looks --fps 30 --output "renders/$1.mp4"
# Site spec: 1200x800, H.264 high, yuv420p, 30 fps, no audio, faststart.
ffmpeg -v error -y -i "renders/$1.mp4" -vf "scale=1200:800:flags=lanczos,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 23 -an -movflags +faststart "../../review/clips/$1.mp4"
ffmpeg -v error -y -i "../../review/clips/$1.mp4" -frames:v 1 -q:v 2 "../../review/clips/$1-poster.jpg"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "../../review/clips/$1.mp4"
echo "done $1"
