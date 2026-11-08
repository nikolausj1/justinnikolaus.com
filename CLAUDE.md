# JustinNikolaus.com

Personal site for Justin Nikolaus, Product Designer. Static HTML, CSS, and vanilla JavaScript. No frameworks, no build step.

- **Live:** https://justinnikolaus.com
- **Hosting:** Vercel, project `justinnikolaus-com`, auto-deployed from this GitHub repo
- **Repo root = web root.** Every file here is served at the same path on the site.

## What is here

| Path | What it is |
|------|------------|
| `index.html`, `styles.css`, `app.js` | Root homepage: the 2026 Gallery. Intro, 15 equally weighted projects, AI coding activity calendar, Experience, Books, Contact. Deliberately does NOT link to the portfolio. |
| `pitch-minutes.html` | Pitch Minutes project detail page, linked from the gallery. |
| `token-activity.html` | Self-contained AI usage explorer linked from the activity section. Snapshot data is inlined; it has a CSP that blocks network requests. |
| `assets/` | Images for the root homepage and its detail pages. |
| `sitemap.xml`, `favicon-*.png` | Root sitemap and favicon (same JN mark as the portfolio). |
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
- Any other branch or pull request = a preview URL posted on the PR.
- Check a deploy from the terminal with `vercel ls` or `vercel inspect <url>`.
- Vercel CLI is logged in on Justin's machine. The project is linked from this folder (`.vercel/`, gitignored).

Verify a change before merging by opening the preview URL. For a quick local look, any static server works, for example `python3 -m http.server` from the repo root.

## Rules

- **Selective sharing:** the root page must never link to `/portfolio/`. Justin shares the portfolio URL directly with specific people.
- **No em dashes** in any copy or writing.
- **Content sensitivity:** some portfolio projects describe unreleased Amazon work. Tier 3 pages (Alexa Plus, Context Engine, Wearable AI, Alexa Core OS) must stay free of internal codenames, team sizes, org structure, architecture, roadmap signals, LLM specifics, and unreleased UI screenshots. The full per-project treatment lives in Dropbox at `_Projects/Justin/JustinNikolaus.com/Portfolio2026/PLAN.md`.
- **Plan before executing** on anything beyond a small copy or style fix.
- **Concise communication.**

## Homepage source

The root homepage was designed with Codex as a static-site study in Dropbox at `_Projects/Justin/JustinNikolaus.com/homepage-layouts/` (its own git repo, `python3 build.py` builds `dist/`). The files at this repo's root are that build output with the study-only parts removed: the noindex tag, the "Working draft" banner, the concept selector, and the `gallery.html` links. Edit the root files here directly for live changes. If the study is rebuilt, re-apply those removals when porting. Project order, copy, and media sources are documented in the study's `content.json`, `project-asset-sources.json`, and `README.md`. Animated project images replace the stills card by card; see the study README's handoff section for the brief.

### Animated project cards

A card animates by adding `project-preview` to its `.project-media` element and placing a poster `<img>` plus a muted `<video data-project-preview loop preload="none">` inside it. The handler in `app.js` starts the clip when the card is half visible, loops it, and pauses it offscreen; `prefers-reduced-motion` shows the poster only. Clip rules: 3:2 frame (1200x800, or 1080x720), H.264 high profile, yuv420p, 30 fps, no audio stream, no added text or controls, poster is the exact first frame, 4 to 10 seconds, under about 1.6 MB. Phone screens keep native proportions and would sit inside the existing CSS composition rather than a baked background. Cards with sample or fictional data carry a `sample-caption` span in the HTML, never text in the video.

Animated so far (11 of 15): Chocolate Frog (cut from the demo video), Paper Telegram (a two-shot: the website, then the phone footage of the note printing), Lunch Box Drawings and Track & Field (Playwright recordings of the live sites), six iPhone simulator recordings with each app's fixture or demo data (Mosaic, Pitch Minutes, Patio Finder, Wine Cellar, ForeSome, Ziggy), and Math Adventures on an iPad simulator with its -demoProgress map. Simulator recordings use a 9:41 status bar override, a fresh launch from the home screen so no back-link shows, and motion interpolation because the simulator recorder only writes changed frames. Kept as stills on purpose: BarTab (illustrative preview), SmartScreen (its demo fixtures contain real family names), Home 3D (the fixture model renders as a plain box in the real app), SportsBox (needs the live backend and its content names stream sources). When a clip is replaced, give the new files a new name: the cache headers keep media for seven days.

## Where everything else lives

Code moved out of Dropbox to `~/_Developer/JustinNikolaus.com` (this folder) on 2026-10-09. The Dropbox folder `_Projects/Justin/JustinNikolaus.com/` keeps the non-code material: Photoshop sources, the 2015 and 2022 site archives, the Amazon internal portfolio versions, the redesign plan, and the `z Claude Inbox/` drop folder. Its `site/www/` is a frozen snapshot of the old cPanel server and is no longer deployed from.

## Tracking

- Google Analytics 4 `G-HLSGHY8FP3` on all portfolio pages and on the root homepage and Pitch Minutes page. The old Universal Analytics tag is gone. The activity explorer carries no analytics because of its CSP.
- Open Graph tags on all portfolio pages, preview image at `portfolio/images/og-preview.png` (1200x630).
- Open Graph tags on the root homepage without an image. The portfolio preview image shows the `/portfolio/` URL, so it is not reused there. A root-page preview image is still needed.

## Known gaps

- `portfolio/images/previews/wearableai-preview.png` is referenced but Justin has not supplied it.
- Alexa Plus and Context Engine pages still need the external-audience sanitization pass described in PLAN.md.
