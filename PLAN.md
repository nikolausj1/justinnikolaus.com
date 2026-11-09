# Homepage project vignettes

Plan for replacing the gallery's screen recordings with directed vignettes. Started 2026-11-08. The gallery shipped to production on 2026-11-08 (PR #1). The site lives in `site/`, the production work in `vignettes/`. This file holds direction and decisions; `CLAUDE.md` holds the technical card conventions.

## Goal

Fifteen short looping clips, one per project, that each show the one moment that proves the product, shot and cut like a professional product vignette. Dramatic, intentional, consistent. These are the visuals that represent Justin's work on his own URL.

## Decisions so far (2026-11-08)

- Motion energy: slow and deliberate. Apple product page pace. One or two long camera pushes, at most one cut, a hold. 6 to 8 seconds, looping.
- All fifteen get real footage. SportsBox, SmartScreen, Home 3D, and Wine Cellar's camera flow get fixture or demo-mode work in their own repos first.
- Locked 2026-11-08 from the Mosaic prototype (`vignettes/videos/mosaic-proto`, variant `device-mark-r2`). Every vignette follows this system:
  - Common thread: the loop opens on the product mark (icon on near-black with a soft brand glow, about a second), hands off to the footage over 0.75 s, and fades back to the mark over 0.9 s at the end. The footage's first frame holds under the handoff.
  - Framing: a real device frame on a dark stage with a slight 3D tilt (rotateY about 14 degrees, rotateX 4), which flattens to a few degrees whenever the camera is tight.
  - Camera: one push into the hero moment, as deep as the footage allows (about 2.4x on a phone screen), held there through the payoff, then one pull-out to a frame that shows the app's chrome. Never zoom out to reveal a build; stay tight and let it happen in frame. Measure the footage before keying the camera.
  - Length: 12 to 13 seconds for a four-beat flow is fine. Shorter flows should not be padded.
- Production tool: HyperFrames HTML compositions rendered to mp4. Footage from simulators, Playwright, and reshoots feeds in as media. ffmpeg only for final encode conformance.
- Rules carried over: no text in the video, no em dashes anywhere, posters are the first frame, sample or fictional data is captioned in the HTML, replaced clips get new filenames.

## Draft hero moments

| Project | The moment that proves it | Treatment | Needs |
|---|---|---|---|
| Mosaic | Pick four photos, the faces light up, the layout builds itself | The app's own Magic Layout sequence, slowed with `-magicSlow 2`: picks, Next, face scan, assemble, then one seam drag | Icon from the Xcode asset. Justin's call 2026-11-08: the flow is the hero, the seam drag comes last |
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
2. Prototype. Done. Mosaic built four ways, then two passes of round 2. Justin locked device plus mark in the video on 2026-11-08 (see Decisions). The round 2 clip is the Mosaic vignette unless a later batch changes the system.
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
- Footage is captured with the 9:41 status bar override and a fresh launch so no back link shows.
- Camera lesson from Mosaic round 2: measure the footage before keying the camera. The arrival grid and the assembled layout have different centers (source rows 1090 and 1237 on the 1206x2622 capture), and the assembled layout plus its bracket corners is about 1150 rows tall, which sets the tightest scale that still holds it (2.44 on the 1800x1200 stage).

## Log

- 2026-11-08: plan written. Fixture sessions started for SportsBox, SmartScreen, Home 3D, Wine Cellar. Prototype on Mosaic begun.
- 2026-11-08: Mosaic prototype built four ways (device or bare, mark or no mark), 1800x1200, slow push into the seam, pure-function timeline. Renders encoded to 1200x800 for the review page at `review/mosaic-proto.html`.
- 2026-11-08: fixture work landed uncommitted in the four app repos: SportsBox `-demoData`, SmartScreen `?record=1`, Home 3D `?house=demo`, Wine Cellar `-demoCamera`. Gallery PR merged. Repo restructured: site moved into `site/`, vignettes and this plan moved in from outside the repo and Dropbox.
- 2026-11-08: Found justinnikolaus.com was still served by HostGator (the 2015 page). Root Directory set to `site`, restructure PR 2 merged, apex A and www CNAME pointed at Vercel in WHM, MX untouched. Zone snapshot in `docs/dns-zone-2026-11-08.md`. Phase 2 (DNS off HostGator, SPF, DKIM, DMARC, cancel) still open; the HostGator WHM also hosts DNS for 14 other family domains.
- 2026-11-08: Justin redirected the Mosaic hero to the full flow (pick, faces found, layout built, adjust last). Recorded on the iPhone 17 simulator with `-magicSlow 2`; the simulator tool's swipe jumps instead of dragging, so seam drags use `touch_path` with 60 ms samples and no initial hold (a hold on a photo starts a photo swap). Master cut with ffmpeg from two takes, face scan at double speed.
- 2026-11-08: Mosaic round 1 review. Justin liked B's tight framing on the faces and A's device frame and 3D angle, and did not want the camera to pull out while the layout assembles. Round 2 built as one variant, `device-mark-r2`: A's frame, B's push, scale held from the face scan through the assemble with only the center drifting down to the layout, pull-out on the seam drag, device flattening to a few degrees while tight. On the review page under Round 2. A render died on a full disk; the DerivedData copies in the session scratchpad were removed to free space, and the Mac is still near full.
- 2026-11-08: Round 2 second pass from Justin's review (round 2 looks good): the last beat opens to scale 1.2 so the editor's top bar and bottom tabs are in frame, the fade into the mark runs 0.9 s (clip now 12.8 s) and the handoff out of it 0.75 s. Found and fixed a flash of the finished collage during the handoff: the video is hidden before its start, so the footage's first frame now holds until the video begins.
- 2026-11-08: Justin locked the system on round 2 second pass: device frame, mark in the video, tight push held through the payoff, pull-out to the chrome. Recorded under Decisions. Next: direction page and shot lists for the other fourteen, then capture in batches.
