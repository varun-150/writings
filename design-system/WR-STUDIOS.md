# WR Studios — Interface System

## Design direction

**Working concept:** The Folio — a quiet, editorial story archive with cinematic depth. The interface gives the stories the strongest visual voice; navigation and controls remain calm, direct, and readable.

The color gradient is intentionally not selected yet. The current default is a neutral graphite/off-white surface so the future WR gradient can be introduced centrally without rewriting page components.

## Token architecture

```css
/* Primitive values */
--wr-ink-950: #080908;
--wr-ink-900: #0d0e0d;
--wr-paper-100: #f3f1ea;
--wr-paper-200: #e8e5dc;

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
- Reduced-motion preferences disable particle/tilt animation and shorten loading transitions.
- The shared Lenis reader loop runs through the GSAP ticker once; reading progress is optional and storage failures must not prevent reading.
- Story cards remain readable on touch screens; no hover-only content is required to identify the story.

## Gradient handoff

When the WR gradient is supplied, set it at the top of `wr-ui.css`:

- `--wr-gradient`: the site/hero background treatment.
- `--wr-accent`: the primary accent for controls and small emphasis.
- `--wr-glow`: low-opacity ambient light, if desired.

Keep text and controls mapped to semantic tokens instead of adding one-off hex values to page rules. Check contrast for both the gradient's lightest and darkest regions before release.

## Verification status

The source files have been checked for stylesheet inclusion, script/style tag balance, duplicate IDs on inspected pages, JavaScript syntax, and balanced CSS delimiters. A rendered browser pass, responsive screenshot review, and live Render deployment check are still required before calling the redesign fully verified.
