# JustinNikolaus.com

Personal site for Justin Nikolaus, Product Designer, plus the production work behind it. The site is static HTML, CSS, and vanilla JavaScript. No frameworks, no build step.

- **Live:** https://justinnikolaus.com serves the one-line homepage ("Hi, I'm Justin Nikolaus. I'm a product designer in Seattle."). The 2026 Gallery is staged at https://justinnikolaus.com/new/ until Justin promotes it; it is noindex and disallowed in robots.txt.
- **Hosting:** Vercel, project `justinnikolaus-com`, auto-deployed from this GitHub repo with Root Directory set to `site`. The domain moved from HostGator to Vercel on 2026-11-08; DNS is still hosted on the HostGator reseller nameservers (`ns1/ns2.justinpaulhosting.com`) and email is Google Workspace. See `docs/dns-zone-2026-11-08.md` before touching DNS.
- **`site/` = web root.** Every file under `site/` is served at the same path on the site. Nothing outside `site/` is deployed.

## Repo layout

| Path | What it is |
|------|------------|
| `site/` | The deployed website. See "What is in site/" below. |
| `vignettes/` | Production for the homepage project clips: HyperFrames projects under `videos/<project>/`, review pages under `review/`. Finished clips are copied into `site/assets/`; renders, raw captures, and review clips are gitignored. |
| `inbox/` | Drop folder for footage and files to pull into the project. Gitignored except its README. |
| `PLAN.md` | The homepage vignette plan: decisions, draft hero moments, phases, open questions, log. Keep the log current. |
| `docs/` | Infrastructure notes, such as the DNS zone snapshot taken before the move to Vercel. |
| `CLAUDE.md` | This file. |

Restructured 2026-11-08: the site used to live at the repo root. Before that, code moved out of Dropbox on 2026-10-09. The Dropbox folder `_Projects/Justin/JustinNikolaus.com/` keeps only non-code material: Photoshop sources, the 2015 and 2022 site archives, the Amazon internal portfolio versions, the portfolio redesign plan, and the Codex homepage study. Do not put new project files there.

## What is in site/

| Path | What it is |
|------|------------|
| `index.html`, `styles.css` | Root homepage: the one-line page restored 2026-11-08 (from commit 37d5b9d, copy changed to product designer, GA4 and favicon added, dead Fontdeck and Universal Analytics tags dropped). Deliberately does NOT link to the portfolio. |
| `new/` | The 2026 Gallery, staged. `index.html`, `styles.css`, `app.js`: intro, 15 equally weighted projects, AI coding activity calendar, Experience, Books, Contact. `pitch-minutes.html` is the Pitch Minutes detail page. `token-activity.html` is the self-contained AI usage explorer (inlined snapshot data, a CSP that blocks network requests). `assets/` holds its images and clips. All three pages carry `noindex`; `robots.txt` disallows `/new/`. Promoting it: move the folder's contents to `site/`, point the canonical and `og:url` tags back at the root, make the detail pages' `./` links `/` again, drop the `noindex` tags and the robots line, and add the two pages back to `sitemap.xml`. |
| `sitemap.xml`, `favicon-*.png` | Root sitemap (root and Mosaic pages only while the gallery is staged) and favicon (same JN mark as the portfolio). |
| `portfolio/` | 2026 portfolio: `index.html`, `about.html`, `contact.html`, 11 pages in `projects/`, CSS in `css/`, JS in `js/main.js` |
| `deck/` | Slide deck |
| `printer/` | The original desk printer page. Retired 2026-10-28: `vercel.json` redirects `/printer` to papertelegram.com, which replaced it. The files stay for history. |
| `mosaic/` | Landing, privacy, and support pages for the Mosaic iOS app |
| `robots.txt` | Disallows crawling of `/portfolio/` |
| `google*.html` | Google Search Console verification files. Keep them. |
| `vercel.json` | Cache headers and the `www` to apex redirect. Keep URLs as-is: no clean-URL rewriting, links are relative `.html` paths. |

## Deploying

There is no FTP and no manual upload. Vercel deploys from GitHub.

- Push to `main` = production at justinnikolaus.com within about a minute.
- Any other branch or pull request = a preview URL posted on the PR. Previews are behind Vercel's deployment protection, so they open only in a browser signed in to Vercel.
- Check a deploy from the terminal with `vercel ls` or `vercel inspect <url>`.
- Vercel CLI is logged in on Justin's machine. The project is linked from the repo root (`.vercel/`, gitignored). The Root Directory setting (`site`) lives in the Vercel project, not in `vercel.json`.

Verify a change before merging by opening the preview URL. For a quick local look, `python3 -m http.server 8765 --directory site` from the repo root, or the `static` launch config.

## Rules

- **Selective sharing:** the root page must never link to `/portfolio/`. Justin shares the portfolio URL directly with specific people.
- **No em dashes** in any copy or writing.
- **Content sensitivity:** some portfolio projects describe unreleased Amazon work. Tier 3 pages (Alexa Plus, Context Engine, Wearable AI, Alexa Core OS) must stay free of internal codenames, team sizes, org structure, architecture, roadmap signals, LLM specifics, and unreleased UI screenshots. The full per-project treatment lives in Dropbox at `_Projects/Justin/JustinNikolaus.com/Portfolio2026/PLAN.md`.
- **Plan before executing** on anything beyond a small copy or style fix.
- **Concise communication.**

## Homepage source

The 2026 Gallery (staged in `site/new/`) was designed with Codex as a static-site study in Dropbox at `_Projects/Justin/JustinNikolaus.com/homepage-layouts/` (its own git repo, `python3 build.py` builds `dist/`). The files in `site/new/` are that build output with the study-only parts removed: the noindex tag, the "Working draft" banner, the concept selector, and the `gallery.html` links. Edit the files in `site/new/` directly for live changes. If the study is rebuilt, re-apply those removals when porting. Project order, copy, and media sources are documented in the study's `content.json`, `project-asset-sources.json`, and `README.md`.

### Animated project cards

A card animates by adding `project-preview` to its `.project-media` element and placing a poster `<img>` plus a muted `<video data-project-preview loop preload="none">` inside it. The handler in `app.js` starts the clip when the card is half visible, loops it, and pauses it offscreen; `prefers-reduced-motion` shows the poster only. Clip rules: 3:2 frame (1200x800, or 1080x720), H.264 high profile, yuv420p, 30 fps, no audio stream, no added text or controls, poster is the exact first frame, 4 to 10 seconds, under about 1.6 MB. Cards with sample or fictional data carry a `sample-caption` span in the HTML, never text in the video. When a clip is replaced, give the new files a new name: the cache headers keep media for seven days.

Current clips (11 of 15, first pass, being replaced by the vignettes in `PLAN.md`): Chocolate Frog (cut from the demo video), Paper Telegram (a two-shot: the website, then the phone footage of the note printing), Lunch Box Drawings and Track & Field (Playwright recordings of the live sites), six iPhone simulator recordings with each app's fixture or demo data (Mosaic, Pitch Minutes, Patio Finder, Wine Cellar, ForeSome, Ziggy), and Math Adventures on an iPad simulator with its -demoProgress map. Simulator recordings use a 9:41 status bar override, a fresh launch from the home screen so no back-link shows, and motion interpolation because the simulator recorder only writes changed frames. Still images for now: BarTab, SmartScreen, Home 3D, SportsBox. Each of those four apps now has a demo or fixture mode for recording (see `PLAN.md`).

### Vignette production

HyperFrames renders the vignettes from HTML compositions. The system (locked 2026-11-08, see `PLAN.md` Decisions) lives in `vignettes/lib/`: `vignette.css` is the stage and the frames (iphone, browser, none), `vignette.js` is the camera, the mark fades, and the single driver tween. Each project under `vignettes/videos/<project>/` has `BRIEF.md`, `index.html` (shot markup plus a `Vignette.init` config with camera keys in footage seconds), `assets/`, and a copy of `lib/` refreshed by `vignettes/tools/scaffold.py <name>`. `vignettes/tools/render.sh <name>` renders and encodes to the site spec into `vignettes/review/clips/`. The Mosaic prototype keeps its older `src/template.html` plus `build.py` shape. Review pages in `vignettes/review/` (`index.html` for all vignettes) are served by the `vignettes-review` launch config on port 8767. Compute every visual state as a pure function of timeline time inside one driver tween: chained GSAP tweens on a shared proxy do not survive out-of-order seeks. Put `data-layout-allow-occlusion` on a framed device, or `check` fails when the push fills the canvas.

## Tracking

- Google Analytics 4 `G-HLSGHY8FP3` on all portfolio pages, the root homepage, and the staged gallery and Pitch Minutes pages. The old Universal Analytics tag is gone. The activity explorer carries no analytics because of its CSP.
- Open Graph tags on all portfolio pages, preview image at `portfolio/images/og-preview.png` (1200x630).
- Open Graph tags on the staged gallery page without an image. The portfolio preview image shows the `/portfolio/` URL, so it is not reused there. A root-page preview image is still needed.

## Known gaps

- `site/portfolio/images/previews/wearableai-preview.png` is referenced but Justin has not supplied it.
- Alexa Plus and Context Engine pages still need the external-audience sanitization pass described in the portfolio PLAN.md in Dropbox.
