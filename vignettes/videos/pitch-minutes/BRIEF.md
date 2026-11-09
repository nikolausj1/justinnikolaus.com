---
workflow: general-video
flow: automation
storyboard: no
message: "Splash, a live clock, then a two-player sub"
destination: website-card
aspect: 1800x1200
language: en
length: 11 to 14s
angle: product-vignette
---

## Intent

One of the homepage project vignettes on justinnikolaus.com, built on the system locked with the Mosaic prototype (see `PLAN.md` at the repo root): the loop opens on the product mark, a framed piece of footage on a dark stage with a slight tilt, one push into the hero moment held through the payoff, one pull-out, back to the mark. Shared stage and camera in `lib/` (source of truth: `vignettes/lib/`). The camera keys and beats are in `index.html`.

## Assets

- assets/pitch-flow-1206.mp4: iPhone 17 simulator, `-resetData -seedRoster -autostartLiveGame`, fresh launch so the splash plays. Cut from one take with one-second jump cuts inside the static states, where the only change is the clock's tick.
- The mark: the app or site icon in `assets/`.

## Customizations

- Justin 2026-11-08: open on the app's splash screen, live field with the clock running, stage two players, confirm, counters restart.
- No text of any kind in the video. Captions live in the site HTML. Poster is the first frame.

## Notes

- Render with `tools/render.sh pitch-minutes` from `vignettes/`. No em dashes anywhere.
