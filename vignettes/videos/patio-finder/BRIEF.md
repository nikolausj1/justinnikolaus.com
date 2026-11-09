---
workflow: general-video
flow: automation
storyboard: no
message: "The compass, a swipe to the next patio, then the map"
destination: website-card
aspect: 1800x1200
language: en
length: 11 to 14s
angle: product-vignette
---

## Intent

One of the homepage project vignettes on justinnikolaus.com, built on the system locked with the Mosaic prototype (see `PLAN.md` at the repo root): the loop opens on the product mark, a framed piece of footage on a dark stage with a slight tilt, one push into the hero moment held through the payoff, one pull-out, back to the mark. Shared stage and camera in `lib/` (source of truth: `vignettes/lib/`). The camera keys and beats are in `index.html`.

## Assets

- assets/patio-flow-1206.mp4: iPhone 17 simulator at a simulated Ballard location (47.668702,-122.387579) with `-demoHeading 10 -hideSwipeDiscovery -patioCategory all`, so the places are real Seattle patios. The swipe is a touch_path across the needle.
- The mark: the app or site icon in `assets/`.

## Customizations

- Justin 2026-11-08: compass pointing at a patio, swipe for the next patio and the needle swings, switch to the map.
- No text of any kind in the video. Captions live in the site HTML. Poster is the first frame.

## Notes

- Render with `tools/render.sh patio-finder` from `vignettes/`. No em dashes anywhere.
