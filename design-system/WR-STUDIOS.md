# WR Studios — Interface System

## Design direction

**Working concept:** The Folio — a quiet, editorial story archive with cinematic depth. The interface gives the stories the strongest visual voice; navigation and controls remain calm, direct, and readable.

The WR brand palette is **70% black, 20% milk white, and 10% cobalt blue**. Black owns the canvas and primary surfaces; milk white carries typography, separators, and editorial contrast; cobalt is reserved for actionable states and shader-like blue illumination. The full brand gradient can still be supplied later and will be wired through the shared tokens.

## Token architecture

```css
/* Primitive values */
--wr-ink-950: #050608;
--wr-ink-900: #090b10;
--wr-paper-100: #f5f2e8;
--wr-paper-200: #eae7dd;
--wr-cobalt: #0047ab;
--wr-cobalt-light: #3d78ff;
--wr-shader-glow: rgba(0, 71, 171, .22);

/* Semantic aliases */
--wr-bg: var(--wr-ink-950);
--wr-surface: var(--wr-ink-850);
--wr-text: var(--wr-paper-200);
--wr-text-strong: var(--wr-paper-100);

/* Component/system */
--wr-page-gutter: clamp(1.1rem, 5vw, 5rem);
--wr-content-width: 1120px;
--wr-reading-width: 740px;
--wr-gradient: none;
```

All tokens currently live in `wr-ui.css`.

## Typography

- **Cormorant Garamond:** story titles, chapter headings, long-form prose, and editorial display.
- **Inter:** navigation, metadata, forms, filters, and interface labels.
- **Kalam:** restrained handwritten notes and selected pull quotes only.

Long-form paragraphs are constrained to a comfortable measure. Headings scale with `clamp()` and wrap naturally on mobile.

## Layout and components

- **Archive:** editorial introduction, featured story, category chips, combined live search, result count, and a responsive story shelf.
- **Story pages:** shared top navigation, cover-led introduction, chapter index, reading progress, centered prose column, dialogue/pull-quote treatments, and an end-of-story destination.
- **Standalone reader:** Midnight Escape keeps its original story content and navigation structure while adopting the same surfaces and type hierarchy.
- **Shared components:** `wr-ui.css` is applied after legacy page styles; story-specific narrative markup remains in each HTML file.

## Interaction and accessibility

- Visible keyboard focus, skip links, archive-return links, and mobile touch targets.
- Archive story cards are native anchors rather than click-only containers; the catalog remains navigable with JavaScript disabled.
- The archive count is derived from the story-card collection at runtime. Reading-progress storage is optional, guarded, and constrained to same-origin story pages.
- Reduced-motion preferences disable particle/tilt animation and shorten loading transitions.
- The shared Lenis reader loop runs through the GSAP ticker once; reading progress is optional and storage failures must not prevent reading.
- Story cards remain readable on touch screens; no hover-only content is required to identify the story.

## Palette and shader lighting

The palette is applied through `wr-ui.css` and the shared particle engine:

- **70% black:** page canvases, story surfaces, navigation, and deep panels (`--wr-bg`, `--wr-ink-*`).
- **20% milk white:** primary and secondary reading text, labels, dividers, and editorial contrast (`--wr-paper-*`).
- **10% cobalt blue:** active filters, primary actions, progress, focus, small rules, borders, and controlled shader-like light (`--wr-cobalt`, `--wr-cobalt-light`, `--wr-shader-glow`).

The shader-style blue illumination uses layered radial light and cobalt particle glow—not a fourth hue or a full-page saturated wash. The full custom WR gradient is still pending; `--wr-gradient` remains a single central handoff point. Keep text and controls mapped to semantic tokens and check contrast before changing the gradient.

## Verification status

Run `node scripts/audit-site.cjs` to repeat the source-level checks for page semantics, IDs, image alternatives, local references, card targets/counts, JavaScript syntax, and stylesheet structure; the GitHub Actions quality gate runs it on pull requests. A rendered browser pass, responsive screenshot review, and live Render deployment check are still required before calling the redesign fully verified.
