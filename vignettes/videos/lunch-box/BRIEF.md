---
workflow: general-video
flow: automation
storyboard: no
message: "The drawings fly in, the Wall, then one drawing"
destination: website-card
aspect: 1800x1200
language: en
length: 11 to 14s
angle: product-vignette
---

## Intent

One of the homepage project vignettes on justinnikolaus.com, built on the system locked with the Mosaic prototype (see `PLAN.md` at the repo root): the loop opens on the product mark, a framed piece of footage on a dark stage with a slight tilt, one push into the hero moment held through the payoff, one pull-out, back to the mark. Shared stage and camera in `lib/` (source of truth: `vignettes/lib/`). The camera keys and beats are in `index.html`.

## Assets

- assets/lunchbox-flow-2400.mp4: Playwright on lunchboxdrawings.com at 2x. Welcome dismissed, the fly-in, a scripted grid scroll at 1.6x, Wall mode, the year rail to 2022, then drawing #633 "Ad Astra Chase" (Aug 9, 2022) opened full screen. The master ends before the site closes the note again.
- The mark: the app or site icon in `assets/`.

## Customizations

- Justin 2026-11-08: past the welcome message the drawings animate into the grid; scroll the grid; switch to Wall mode; click the astronaut-helmet drawing (Aug 9, 2022) and it fills the screen.
- No text of any kind in the video. Captions live in the site HTML. Poster is the first frame.

## Notes

- Render with `tools/render.sh lunch-box` from `vignettes/`. No em dashes anywhere.
