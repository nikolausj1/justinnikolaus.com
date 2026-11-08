# Homepage project vignettes

Plan for replacing the gallery's screen recordings with directed vignettes. Started 2026-11-08. The gallery shipped to production on 2026-11-08 (PR #1). The site lives in `site/`, the production work in `vignettes/`. This file holds direction and decisions; `CLAUDE.md` holds the technical card conventions.

## Goal

Fifteen short looping clips, one per project, that each show the one moment that proves the product, shot and cut like a professional product vignette. Dramatic, intentional, consistent. These are the visuals that represent Justin's work on his own URL.

## Decisions so far (2026-11-08)

- Motion energy: slow and deliberate. Apple product page pace. One or two long camera pushes, at most one cut, a hold. 6 to 8 seconds, looping.
- All fifteen get real footage. SportsBox, SmartScreen, Home 3D, and Wine Cellar's camera flow get fixture or demo-mode work in their own repos first.
- Still open, to be decided by seeing a prototype of each:
  - Common thread: open on the mark (icon or logo on brand color for about a second, then the moment, loop returns to the mark) versus mark in the HTML (icon beside the title, video is pure product).
  - Framing: real device frames baked into the clip on a stage with slight 3D tilt (video fills the 3:2 card) versus no chrome, UI as rounded rectangles with camera pushes.
- Production tool: HyperFrames HTML compositions rendered to mp4. Footage from simulators, Playwright, and reshoots feeds in as media. ffmpeg only for final encode conformance.
- Rules carried over: no text in the video, no em dashes anywhere, posters are the first frame, sample or fictional data is captioned in the HTML, replaced clips get new filenames.

## Draft hero moments

| Project | The moment that proves it | Treatment | Needs |
|---|---|---|---|
| Mosaic | A seam drag reflows four photos | Push on the seam, pull back to the finished collage | Icon from Photo Collage `_review/phase7-icon-*.png` or the Xcode asset |
| Pitch Minutes | Minutes ticking, then a two-player sub in one tap | Live field, the sub, counters rebalance | Logo in repo |
| Lunch Box Drawings | 2,000 drawings | Fast grid scroll, hard cut to one drawing full frame | Web icon |
| Paper Telegram | A message typed on the web arrives on paper | Typing in the form, cut to the printer | Reshoot of the print, tripod, 4K |
| Chocolate Frog | Lid opens, the portrait moves | Dark set, one light, lid rising | Reshoot |
| Patio Finder | The compass swings to a patio | Map pick, swing, hold on the needle | App icon |
| Ziggy | A morning brief assembled by a staff of roles | Concept open | Decide what Ziggy looks like on screen |
| Math Adventures | A world unlocks | Map, fog lift, first question, celebration | Fixture that leaves a node locked |
| ForeSome | Players confirm one by one from a link | Three confirmations landing in sequence | App icon |
| Wine Cellar | Point the camera at a label, it is identified | Camera, match, save to shelf | Simulator camera fixture |
| SportsBox | TV focus moving across live events | Remote navigation on the home grid | Demo data mode, fictional names |
| SmartScreen | The departure countdown turns yellow | Today view, countdown state change | Sanitized demo fixture |
| Track & Field | A family finds practice, schedule, results | Site scroll, push into the schedule | None |
| Home 3D | Walking into a room, switching floors | Walkthrough, floor switch | Realistic fixture model |
| BarTab | Menu bar icon changes state, flyout opens | macOS screen recording | Sample data mode |

## Phases

1. Direction. Reference board of ten product vignettes, one page of direction, approved by Justin.
2. Prototype. One project (Mosaic) built four ways: mark in video or in HTML, device frame or bare UI. Compared side by side in the real card at localhost. Decides the two open questions.
3. Shot lists. One table for all fifteen: hero moment, beats, footage, brand asset, fixture, privacy check. Approved line by line.
4. Capture. Simulator and web recordings at higher fidelity. Physical reshoots by Justin from a shot sheet. Fixture sessions in the app repos.
5. Compose and review in batches of three. Contact sheets and renders, notes, re-render.
6. Integrate and ship. Card geometry, posters, captions, loop points, weight budget, mobile and reduced motion checks, merge.

## Open questions for Justin

- Two or three sites whose product vignettes are the bar.
- What Ziggy should look like on screen.
- When the two physical reshoots can happen.

## Production setup

- HyperFrames projects live in `vignettes/videos/<project>/`. Each has `BRIEF.md`, `src/template.html`, `build.py` (writes the variant HTML files into `compositions/`), `use.sh <variant>` (copies one variant to `index.html` for snapshot and preview), and `render-all.sh` (renders every variant, then encodes to the site spec into `../../review/clips/`).
- Review pages live in `vignettes/review/`, served locally with the `vignettes-review` launch config on port 8767.
- Lesson from the prototype: chained GSAP tweens on one proxy do not survive out-of-order seeks in the snapshot tool. Every vignette computes its visual state as a pure function of timeline time inside one driver tween.
- The Mosaic prototype footage still shows the old 2:49 status bar and a Photos back link. Final captures use the 9:41 override and a fresh launch.

## Log

- 2026-11-08: plan written. Fixture sessions started for SportsBox, SmartScreen, Home 3D, Wine Cellar. Prototype on Mosaic begun.
- 2026-11-08: Mosaic prototype built four ways (device or bare, mark or no mark), 1800x1200, slow push into the seam, pure-function timeline. Renders encoded to 1200x800 for the review page at `review/mosaic-proto.html`.
- 2026-11-08: fixture work landed uncommitted in the four app repos: SportsBox `-demoData`, SmartScreen `?record=1`, Home 3D `?house=demo`, Wine Cellar `-demoCamera`. Gallery PR merged. Repo restructured: site moved into `site/`, vignettes and this plan moved in from outside the repo and Dropbox.
