# WR Studio â€” curated static website bundle

This branch contains a reviewed, curated static-website bundle of the WR Studio
short-story site: exactly 64 website files committed under `site/` as a
dedicated snapshot commit. The repository's default branch (`main`) holds an
older, unrelated snapshot of the site; this branch leaves it unchanged.

## Repository layout

- `site/` â€” the complete static website (64 files). This directory is the
  publish root for hosting.
- `README.md` â€” this file, at repository root, outside `site/`, so repository
  documentation never becomes part of the deployed website.

## Website contents (`site/`)

| Group | Files | Description |
| --- | --- | --- |
| Landing page | `index.html` | Landing page and story index |
| Story pages | 15 `.html` files | Individual short-story pages |
| Covers | `New cover/` (16 PNG) | Story cover images |
| *Ink to Ash* page scans | `ink-to-ash/pages/` (25 JPG) | Scanned story pages |
| Reading engine | `story-cinematic.css`, `story-cinematic.js` | Page styling and cinematic reading behaviour |
| Cursor effect | `fire-cursor.css`, `fire-cursor.js` | Ambient cursor effect |
| Libraries | `vendor/` (GSAP, ScrollTrigger, Lenis) | Third-party runtime libraries used by the pages |

Story text lives in the static HTML files; the CSS and JavaScript add
animation and visual effects. Pages load Google Fonts and link to the author's
public profiles (GitHub, LinkedIn, Instagram).

## Serving and publishing

The site is plain static files with no build step. To preview locally, serve
the `site/` directory with any static file server:

    cd site
    python -m http.server 8000

For hosting, set the publish/directory root to `site/` â€” not the repository
root â€” so this README and other repository files stay out of the website.

## Scope and review status

- The payload is a fixed, hash-verified 64-file allowlist; it is not a copy of
  the full local authoring workspace.
- Privacy review of this branch's payload: no phone numbers, no `tel:` links,
  no secret values and no local filesystem paths; all 204 checked internal
  references resolve without broken links or path escapes.
- Known limitation: this branch does not rewrite the public default branch or
  its Git history, which still contain contact details from the legacy
  snapshot. None of that data is present in this branch's `site/` payload.
- This branch is provided for review only: it has not been merged into
  `main`, and no deployment is configured from it.