---
workflow: general-video
flow: automation
storyboard: no
message: "A note typed on the web arrives on paper"
destination: website-card
aspect: 1800x1200
language: en
length: 11 to 14s
angle: product-vignette
---

## Intent

One of the homepage project vignettes on justinnikolaus.com, built on the system locked with the Mosaic prototype (see `PLAN.md` at the repo root): the loop opens on the product mark, a framed piece of footage on a dark stage with a slight tilt, one push into the hero moment held through the payoff, one pull-out, back to the mark. Shared stage and camera in `lib/` (source of truth: `vignettes/lib/`). The camera keys and beats are in `index.html`.

## Assets

- assets/paper-web-2400.mp4: Playwright on papertelegram.com, Vinny picked, Dad, then "I love you two!" typed at a human pace. The form was never submitted. assets/paper-print-1800.mp4: Justin's phone footage of that note printing (IMG_4093), cropped to 3:2 around the slot.
- The mark: the app or site icon in `assets/`.

## Customizations

- Justin 2026-11-08: no reshoot, use the existing printer video. The typed words match the printed note.
- No text of any kind in the video. Captions live in the site HTML. Poster is the first frame.

## Notes

- Render with `tools/render.sh paper-telegram` from `vignettes/`. No em dashes anywhere.
