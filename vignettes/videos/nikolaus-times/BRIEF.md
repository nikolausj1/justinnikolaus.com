---
workflow: general-video
flow: automation
storyboard: no
message: "AI drafts the paper, my red pen edits it, and it arrives on paper"
destination: website-card
aspect: 1800x1200
language: en
length: 12 to 13s with shot two, 9.9s draft without it
angle: product-vignette
---

## Intent

The Nikolaus Times card on the 2026 Gallery, built on the locked vignette system (see `PLAN.md` at the repo root): the mark, a framed shot on the dark stage, one push into the hero moment held through the payoff, one pull-out, back to the mark. Two shots, like Paper Telegram: a screen, then the object.

## Shots

1. Browser frame: the Friday review of issue 2, page 2. The first pass ran "Pumpkin Pies Get Baked on Sunday" with a 13-word story and pie art that guessed the pies were baked. The camera pushes into the story; Justin's red pen strikes "Baked", rings the thin story and slashes the guessed art. The page dissolves to the printed final ("Sunday Forecast: Frost on the Pumpkin", the real story, the layered pie art) and the pen ticks it. Pull out to the full page.
2. Physical, no frame: Justin's phone footage of the paper coming out of the printer on a Saturday morning. Not shot yet. Hard cut in after shot one's pull-out, a slow push as the sheet rises, then back to the mark.

## Assets

- `assets/page2-first-pass.png` and `assets/page2-final.png`: real renders from the Family Newspaper repo (`editions/2026-11-21/chase/renders/snap-001/page-2.png` and `editions/2026-11-21/final/chase/page-2.png`). The only picture on the page is generated art, no photo of the children. Justin chose real issues as they are (2026-11-26).
- `assets/nt-icon.png`: the mark. "NT" in Didot, the nameplate's face, over the masthead's thin and thick rules.
- Shot two (to come): about 3 s, landscape, steady, 3:2 crop around the paper rising from the printer.

## Customizations

- Shot one is composed from stills, not captured footage: the page swap and the pen are drawn in `extra(t)`, a pure function of time like the camera.
- The red pen is the only added mark. No words in the video. Captions live in the site HTML.

## Notes

- Render with `tools/render.sh nikolaus-times` from `vignettes/`. No em dashes anywhere.
