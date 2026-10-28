# JustinNikolaus.com

Personal site for Justin Nikolaus, Product Designer. Static HTML, CSS, and vanilla JavaScript. No frameworks, no build step.

- **Live:** https://justinnikolaus.com
- **Hosting:** Vercel, project `justinnikolaus-com`, auto-deployed from this GitHub repo
- **Repo root = web root.** Every file here is served at the same path on the site.

## What is here

| Path | What it is |
|------|------------|
| `index.html`, `styles.css` | Root landing page. Deliberately does NOT link to the portfolio. |
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

## Where everything else lives

Code moved out of Dropbox to `~/_Developer/JustinNikolaus.com` (this folder) on 2026-10-09. The Dropbox folder `_Projects/Justin/JustinNikolaus.com/` keeps the non-code material: Photoshop sources, the 2015 and 2022 site archives, the Amazon internal portfolio versions, the redesign plan, and the `z Claude Inbox/` drop folder. Its `site/www/` is a frozen snapshot of the old cPanel server and is no longer deployed from.

## Tracking

- Google Analytics 4 `G-HLSGHY8FP3` on all portfolio pages. The root page still carries a dead Universal Analytics tag.
- Open Graph tags on all portfolio pages, preview image at `portfolio/images/og-preview.png` (1200x630).

## Known gaps

- `portfolio/images/previews/wearableai-preview.png` is referenced but Justin has not supplied it.
- Alexa Plus and Context Engine pages still need the external-audience sanitization pass described in PLAN.md.
