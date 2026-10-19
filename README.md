<p align="center">
  <img src="New%20cover/ChatGPT%20Image%20Jun%2015,%202026,%2010_41_45%20PM.png" alt="WR story archive banner" width="100%" />
</p>

# WR — Writings of WazirV
### An independent story archive for original fiction and cinematic reading

WR is a personal collection of original stories, scripts, and interactive narratives. Each story keeps its own mood and voice, while the archive and reading interface share one coherent visual system.

## Stories in the archive

| Story | Mood / genre |
| --- | --- |
| **Abhinayam** | Devotion, longing, and tragedy |
| **Almost** | Quiet romance and bittersweet calm |
| **Dharshan** | Devotion and reflection |
| **Dhruvendra — The Treasure Seeker** | Adventure, mystery, and obsession |
| **Green Hollow — Act I** | Mystery and tension |
| **Kadha Laga Modhalaina Oka Parichayam** | Telugu romance and nostalgia |
| **Kali — The Five Paths** | Tragedy and cosmic conflict |
| **Malli Kalisi…** | Romance, separation, and memory |
| **Midnight Escape** | Freedom, escape, and psychological drama |
| **NONPARTICIPANT** | Isolation and quiet grief |
| **Telugu Ammai** | Determination and family expectations |
| **The Night Only I Remember** | Tragedy and mystery |
| **Unsaid** | Romance and unspoken feelings |

## Reading experience

The site is more than a list of documents. It combines the archive with a purpose-built reading experience:

- **Story discovery:** live search across titles, mood, and story details, alongside genre/category filters.
- **Editorial archive:** a featured story, illustrated covers, reading notes, and a responsive story shelf.
- **Cinematic reading:** chapter navigation, scroll-driven reveals, changing chapter atmosphere, reading progress, and focus mode on supported story pages.
- **Reading continuity:** local reading progress can be saved in the browser and used to continue a story on the same device.
- **Accessible controls:** visible keyboard focus, skip links, return-to-archive navigation, and reduced-motion support.
- **Responsive layout:** archive and story pages adapt for desktop, tablet, and mobile widths.

## Shared interface system

The shared design layer lives in `wr-ui.css`. It contains the primitive, semantic, and component tokens for typography, spacing, surfaces, borders, focus states, and responsive behavior. The current base palette is intentionally neutral while the final WR brand gradient is being decided.

To apply the future gradient, start with the `--wr-gradient`, `--wr-accent`, and `--wr-glow` tokens near the top of `wr-ui.css`. Avoid adding one-off colors to individual pages.

The shared cinematic reading engine remains in:

- `story-cinematic.css` — narrative layout, chapter components, and reading effects.
- `story-cinematic.js` — chapter navigation, animations, progress, theme transitions, and focus interactions.

The interface design decisions are documented in [`design-system/WR-STUDIOS.md`](design-system/WR-STUDIOS.md).

## Built with

- Semantic HTML5
- CSS with design tokens and responsive layouts
- Vanilla JavaScript
- GSAP and ScrollTrigger for story motion
- Lenis for smooth scrolling on supported readers
- Browser `localStorage` for optional reading progress

The site has no application build step; all files are served as a static site.

## Run locally

From the repository root:

```bash
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

You can also use the Live Server extension in VS Code. A local server is recommended so relative assets and reading progress behave like a deployed site.

## Deploy to Render

The repository includes [`render.yaml`](render.yaml), configured to publish the repository root as a static site.

1. Connect this repository to Render, or create a Blueprint from the repository.
2. Let Render read `render.yaml`.
3. Confirm the published root includes `index.html`, `wr-ui.css`, `story-cinematic.css`, `story-cinematic.js`, all story HTML pages, and the `New cover/` asset folder.
4. After each merge to the deployment branch, confirm the latest deploy is live before reviewing visual changes.

## Contact and portfolio

- **Email:** [akurivarun@gmail.com](mailto:akurivarun@gmail.com)
- **LinkedIn:** [Akuri Venkata Surya Varun](https://linkedin.com/in/akuri-venkata-surya-varun50b244366)
- **GitHub:** [varun-150](https://github.com/varun-150)
- **Instagram:** [@writings_of_wazirv](https://www.instagram.com/writings_of_wazirv/)
