# DSource.AI — "Atelier" Design System

The visual identity of DSource.AI's creative surfaces: the AI Visualizer
workspace, the global navigation bar, and the footer. This document is the
source of truth for why every visual decision was made and how to extend the
system without diluting it.

---

## 1. Thesis

DSource.AI is a **creative space**. People bring photographs of rooms they
care about — their homes, their clients' projects — and ask a machine to show
them something better. That transaction runs on two emotions:

1. **Confidence** — "this platform will produce the design I actually asked
   for." We earn this with *proof, not posture*: the pipeline genuinely
   verifies every render against the brief with vision AI, and the UI
   surfaces that verification (the PROOF cell, the before/after compare).
2. **Safety** — "I can experiment here without losing anything." Every
   version is kept, the original photo is never touched, and the interface
   says so in warm, plain language.

The aesthetic that carries both is **the atelier**: a working design studio
with paper, print artifacts, and one dark lightbox where the work is viewed.
Warm and human (safe), materially crafted (not templated), with editorial
serif type that has the authority to make promises (confident).

### Lineage

The direction was chosen against the reference **contralabs.com**, whose
moves we translated (never copied):

| Contra Labs move | Our translation |
|---|---|
| Old-master painting × dithered laptop | Engraved-line interior illustration in the empty canvas; halftone "develop" reveal when a render arrives |
| Crop/registration marks around imagery | `.viz-crop` marks at the four corners of the canvas plate |
| Halftone dot gradients dissolving across sections | `.viz-dots` divider under the page header; `.viz-dots-light` across the footer band |
| Paper grain ground | `.viz-grain` SVG-noise ground on the workspace board |
| Editorial Caslon headlines making a promise | Libre Caslon Text for the title, panel headings, and promise copy |
| Warmth as safety | Greige/paper palette, warm ink instead of pure black |

### Rejected directions (kept for the record)

- **The Drawing Set (v1, shipped briefly)** — DIN/drafting utility: Saira
  Condensed caps, plotter-blue buttons, pure title-block vernacular.
  Disciplined but *administrative*; read as "vibe coded" / templated. Its two
  best ideas survived: the live title block and the sheet-tab structure.
- **The Swatch Table (full)** — UI built entirely from material textures.
  Too much color chrome around the canvas (renders must read true). Its best
  idea survived as the swatch-strip palette pickers (`ChipGroup`).
- **The Darkroom** — cinematic dark theme, renders "developing" in amber.
  Closest to the generic dark-AI-tool cluster and the least safe-feeling.
  Its best idea survived as the `steps()` develop animation.

---

## 2. Color tokens

Defined on `:root` in `src/app/globals.css`. **Never introduce a new color
to these surfaces without adding it here first.** All are warm-biased; pure
black and pure white are deliberately absent.

| Token | Hex | Name | Role and rules |
|---|---|---|---|
| `--viz-ground` | `#EEEBE2` | Greige board | Workspace board background (always through `.viz-grain`); hover fill for white controls |
| `--viz-paper` | `#FBF9F4` | Paper | Panels, cells, pills on dark surfaces; text color on ink buttons |
| `--viz-ink` | `#26221A` | Warm ink | All body text; primary action fill (Generate, nav bar); selected segmented controls |
| `--viz-muted` | `#77705F` | Faded ink | Secondary text, labels, footer links at rest |
| `--viz-line` | `#D9D2C2` | Hairline | Every border; title-block cell dividers; disabled button fill |
| `--viz-well` | `#2A261E` | Lightbox | The canvas well and footer CTA band — the only large dark surfaces. Dark so renders/photos read with true color |
| `--viz-blue` | `#35418C` | Indigo | **Interactive-only**: focus rings, sliders, hotspots, drag-select box, compare divider chip, similarity badges, spec-sheet count, the PROOF cell. The dye indigo — Indian material lineage, trust color. Never used for large fills or text blocks |
| `--viz-blue-deep` | `#2A3470` | Indigo pressed | Hover/active state of indigo elements |

Supporting neutrals on dark surfaces: Tailwind `stone-100/200/300/400/500/600`
(warm gray ramp) for text and strokes inside the well and footer band.

**Swatch data** (`PALETTE_SWATCHES` in `src/utils/visualizer/params.js`) is
*content, not chrome* — the four-stop strips shown inside palette chips. The
server never reads it; only the palette *name* is validated and composed.

| Palette | Stops |
|---|---|
| Neutral | `#E8E3D8 #CFC8B8 #A79E8C #6E675A` |
| Warm Tones | `#E7C9A9 #D99A6C #B65F3F #7C3A2D` |
| Cool Tones | `#D7E0E4 #A6BCC9 #6E93A6 #3F5E70` |
| Monochrome | `#F2F2F0 #C8C8C6 #8A8A88 #2E2E2C` |
| Bold & Vibrant | `#D94A3D #E8A13C #3E7C5B #35449C` |
| Earthy | `#D9C9A3 #A98B5F #7A6A45 #4C4632` |

---

## 3. Typography

Three roles, three faces, loaded once in `src/app/layout.js` via `next/font`:

| Role | Face | CSS | Where |
|---|---|---|---|
| **Promise** | Libre Caslon Text 400/700 + italic | `.viz-serif` (`--font-caslon`) | Page title, italic promise line, panel `<h2>`s, modal `<h3>`s, empty-state invitation, overlay message, footer headline, header wordmark |
| **Interface** | Bricolage Grotesque | default body (`--font-sans`) | Body copy, helper text, form inputs — a grotesque with ink traps and quirky terminals, never the system-default look. (History: an unloaded "Inter" declaration silently fell back to the system font for weeks — always verify the body face actually loads) |
| **Instrument** | Geist Mono | `.viz-mono`, `.viz-label`, `.viz-btn` | Field labels, title-block values, version labels, BEFORE/AFTER tags, ©-line, sheet tabs — **and every primary action**: buttons are set in `.viz-btn` (mono caps, 12px, 0.09em tracking), the stamp voice |

Rules:

- The serif is reserved for **moments that speak to the user's ambition** —
  titles, promises, invitations. It never labels a control and never
  exceeds roughly six words at display size. Italic is its emphatic voice
  ("*Bring a room.*").
- The mono is the **spec-sheet voice**: facts, parameters, coordinates.
  `.viz-label` = 11px, uppercase, `0.08em` tracking, muted. It states; it
  never sells.
- Bricolage does everything else and stays between 12–16px. No font-black,
  no display-size sans.
- Type scale for the serif: page H1 ≈ 3.4rem, footer H2 ≈ 2.25rem, panel
  H2 = 1.5rem, modal H3 = 1.25rem.

---

## 4. Print-craft details (the texture layer)

These are what make the surface feel made-by-hand. All live in
`globals.css`; all are `aria-hidden` decoration.

- **`.viz-grain`** — the workspace board's paper grain: an inline SVG
  `feTurbulence` noise tile (alpha slope 0.055) layered over
  `--viz-ground`. Applied only to the board container. Felt, not seen — if a
  screenshot makes it obvious, it's too strong.
- **`.viz-dots-rule` / `.viz-dots-light`** — halftone dot fields (7px cell,
  1px dot at ~30% ink or paper). Dots must always **bleed out of an
  element**, never float as a free band — a uniform rectangle of texture is
  an instant AI tell. `.viz-dots-rule` hangs off the right end of the
  masthead's ink rule, densest at the rule and dissolving to the bottom
  left; `.viz-dots-light` drifts across the footer's ink band. Use at most
  one per viewport.
- **`.viz-crop`** (`-tl/-tr/-bl/-br`) — 13px, 2px-stroke registration
  corners sitting 9px outside the canvas plate. They mark the canvas as
  *the artwork* of the page. Only the canvas gets them — crop marks on more
  than one element per page stop meaning anything.

---

## 5. Motion

Motion is rationed to moments that map to something true, and every
animation has a `prefers-reduced-motion: reduce` kill switch.

| Animation | Trigger | Spec | Meaning |
|---|---|---|---|
| `viz-develop-img` + `viz-develop-screen` | Any new image on the canvas (keyed remount) | 650ms, `steps(6, end)`; image steps from 0.15 opacity/high-contrast desaturation to true; a 5px halftone screen overlay steps out | The machine *prints* your image. Discrete steps read as mechanical process, not a soft fade |
| `viz-tab-enter` | Mode tab switch (`display:none` → visible replays it) | 380ms `cubic-bezier(0.22, 0.7, 0.3, 1)`, fade + 10px rise | Graceful hand-off between sheets; panels stay mounted so state survives |
| `viz-scan` | Generation overlay and reverse-search stage bars | 1.6s sweep, infinite | Work in progress |
| `viz-draw` | Engravings (hero sketch, auth door) on load | 1.7s dashoffset sweep; dash constant 1600px > longest path — never rely on `pathLength` for CSS dash values (Chrome ignores it); dotted-attr paths excluded | The pen draws the sketch |
| `Reveal` + `viz-rule` | Folio headers site-wide, footer band | Once-only rise (0.7s) + the ink rule plots left-to-right (0.9s). Scroll-position check, not IntersectionObserver — IO misses instant jumps and strands content invisible | Each section is a fresh sheet laid down |
| `viz-page-enter` (`template.js`) | Every route change | 450ms opacity fade. **Opacity only** — a transform on this wrapper becomes the containing block for pinned/fixed descendants and breaks ScrollTrigger | Page arrives like a fresh sheet |
| `viz-dots-drift` | Halftone fields on ink surfaces (footer, auth vignette) | 60s linear loop, background-position | The print is alive, barely |
| `viz-value-tick` | Title-block values on change (keyed remount) | 0.7s indigo → ink color decay | The plate label registers your edit |
| `transition-colors` (200ms) | Nav links, tabs, footer links, chips | Tailwind utility | Baseline hover politeness; arrows nudge 4px on hover |

**Motion zoning — the stage vs. the studio.** The homepage is the stage:
theatrical, scroll-driven, 3D (see §12). The workspace is the studio: no
parallax, no scroll-triggered reveals, no spring physics, no skeleton
shimmer — people work there. Never let stage motion leak into the studio;
never let studio restraint flatten the stage.

---

## 6. Signature moments (product truths made visible)

1. **The title block + PROOF cell** (`TitleBlock.js`) — a drafting-sheet
   plate label under the canvas: `SHEET / REV / SPACE / STYLE / LIGHT /
   PALETTE / MODE / PROOF` in mono cells with hairline dividers. It updates
   live as controls change; REV counts kept versions; sheets are numbered
   A-01 (render), M-01 (mood board), C-01 (CAD). The **PROOF** cell turns
   indigo bold — "VERIFIED ✓" — only when `useVisualizerTab.isVerified` is
   true, i.e. the API's Gemini-vision adherence check ran and every checked
   parameter passed. **Never fake this cell.** It is the confidence story:
   evidence, not decoration.
2. **Before/after compare** (`UploadCanvas.js`) — once a render differs from
   the original upload, a "Compare original" chip appears; a full-height
   draggable divider clips the original over the render with mono
   BEFORE/AFTER tags. Proof you can *feel*.
3. **The engraved invitation** (`UploadCanvas.js` empty state) — a
   single-stroke line drawing of an interior (pendant, armchair, side
   table, window) in warm stone on the dark well, over the serif line
   *"Every room starts as a sketch. Bring yours."* The empty canvas is an
   invitation, never a gray void.
4. **The develop reveal** — see Motion. Upload, render, or version select:
   the image always *arrives* like a print.

---

## 7. Copy voice

Confidence with warmth; facts in mono, promises in serif, instructions in
plain Geist. Active voice, sentence case everywhere except mono labels.

| Instead of | We say | Why |
|---|---|---|
| "AI Visualizer" alone | + "Show us the room you have. We'll help you see the one you imagined." | The promise, stated once, at the top |
| "Prompt" | "In your words" | The controls are the brief; the textarea is for what they can't say |
| "Generating..." | "Rendering the room you briefed…" | Ties output to *their* input |
| "History" | "Versions — every render is kept, try anything." | Safety made explicit |
| "Submit" / "Generate" | "Generate render" / "Generate board" / "Convert to CAD" | The button says exactly what happens |
| Spinner + silence | "We compare the result against your brief and quietly retry if it drifts. Your original photo is untouched." | The verification pipeline is real — say so |
| "7 days free trial" | "Seven days on us. *Bring a room.*" | Same offer, atelier voice |

Errors explain and direct, never apologize theatrically. Notices get a mono
`NOTICE` eyebrow in the amber box — the one place amber appears.

---

## 8. Layout system

- **Page masthead — the folio.** Never the eyebrow→H1→subtitle stack (the
  single most templated composition on the web). Instead: a mono meta line
  (`DSOURCE STUDIO` left, `VIEW TUTORIAL →` right) sitting **above a 2px ink
  rule**; below the rule, the serif H1 on the left with the italic promise
  set as a right-aligned deck at its baseline; `.viz-dots-rule` drifting off
  the rule's right end. Asymmetric on purpose.
- **The board**: one `.viz-grain` rounded panel (`rounded-2xl`, squared
  top-left corner where the active tab attaches) that contains the entire
  workspace. Tabs are physical dividers attached to it — mono caps,
  active = board-colored with hairline border.
- **Inside each tab**: 12-column grid; the brief (controls panel, `viz-panel`)
  spans 4, the work column spans 8: canvas plate → title block →
  contextual rows (materials search, progress) → notices → versions →
  action bar.
- **Radii**: 16px (`rounded-2xl`) for the board/panels/canvas; 8px
  (`rounded-lg`) for the title block and inner elements; 6px (`rounded-md`)
  for form controls and chips; `rounded-full` for the primary pill, header
  search, and floating chips on the canvas.
- **The one dark surface rule**: at most one `--viz-well` region per
  viewport (workspace: the canvas; footer: the CTA band). Everything else
  stays paper.

### Global chrome

- **Nav bar** (`header.js`): pure typography — one line of type sitting
  directly on the page with **no container at all**: serif wordmark,
  mono-caps links (active route underlined, 8px offset), a search icon,
  quiet Vendor/Log-in, and exactly one filled element (the small ink
  Sign-up pill). Past 24px of scroll it gains a **solid** paper backing
  and hairline rule — opaque, never translucent. The mobile menu is a
  full-height paper sheet with the links set at 30px serif on ruled
  lines with folio numbers (01–04); the active page is italic.
  History, for whoever is tempted: a frosted-glass strip and a
  hanging-file-tab concept were both built and rejected here — chrome
  loses to typography in this system every time.
- **Auth pages** (`login/`, `signup/` on `components/auth/AuthShell.js`):
  a centered paper plate on the grain ground — form left, dark vignette
  right with an engraved entry hall (the studio door, ajar) and a serif
  line. Safe-space copy does the selling: "Welcome back. / Your versions
  are where you left them." and "Set up your studio. / Every version
  kept." Mono labels, token inputs, one ink pill; success feedback is
  indigo (the proof color), errors red. The vignette hides below `lg` —
  mobile gets the form alone.
- **Footer** (`footer.js` + `quick-links.js`): the ink CTA band
  (`--viz-well`, `.viz-dots-light`, serif headline, transparent email
  field with stone stroke, paper button) followed by the link directory —
  mono `.viz-label` column headings (PRODUCT / SUPPORT / COMPANY), muted
  links hovering to ink, serif wordmark, mono © line.

---

## 9. Component inventory

All in `src/components/visualizer/` unless noted.

| Component | Design intent |
|---|---|
| `ai-visualizer/page.js` (app) | Owns the header moment, dots band, sheet tabs, grain board, tab-enter animation |
| `RenderControls.js` | "The brief." Serif heading, mono labels, segmented space-kind (ink when selected), `ChipGroup` style + palette pickers, native selects (`.viz-select` with inline-SVG chevron) only for long lists |
| `ChipGroup.js` | Single-select pickers set as **type, not boxes** (fieldset/legend). Text mode: a wrapped inline run of option names, ink-filled when selected — a highlighted word on a spec sheet. Swatch mode: fan-deck rows (color strip + name), the selected strip ruled in ink. Grids of uniform bordered chips are banned — that's the template tag-picker. Click the selected option to clear |
| `UploadCanvas.js` | The plate: dark well + crop marks, develop animation, drag-to-select region search, compare slider, engraved empty state. The image is the hero: it sizes to the full working viewport (`max-h-[75vh]`, full column width) and the well hugs it — never a small image floating in dark space. The shrink-wrapped wrapper must always equal the rendered image box exactly (hotspot/drag/compare math depends on it), so never give the `<img>` a fixed width plus a competing height cap |
| `TitleBlock.js` | The plate label + PROOF cell (see Signature moments) |
| `HistoryStrip.js` | "Versions" + safety copy; indigo ring on the active thumbnail. Empty state is one mono sentence ("No versions yet — REV 01 appears here after your first render."), never skeleton ghost boxes |
| `ActionBar.js` | Creativity slider (indigo accent, mono tick labels) + the ink pill primary action |
| `NoticesBox.js` | Amber advisory with mono NOTICE eyebrow |
| `HotspotOverlay.js` | Indigo hotspot dots; hover outlines the exact region that will be searched |
| `MatchResultsModal.js`, `ProductPickerModal.js` | Paper cards on `#2A261E/60` blur scrim; serif headings; indigo similarity/selection accents |
| `GeneratingOverlay.js` (in `RenderTab.js`) | A plate label, not a centered modal card: left-aligned mono meta row (IN THE STUDIO / SHEET IN PROGRESS), serif italic message, ink traveling a hairline rule, safety reassurance. Bottom-sheet placement on mobile |
| `header.js`, `footer.js`, `quick-links.js` (components/) | Global chrome, see §8 |

---

## 10. Accessibility floor

Non-negotiable, already in place — keep it that way:

- Visible focus: 2px indigo `outline` via `.viz-scope :focus-visible`.
- Every animation disabled under `prefers-reduced-motion: reduce`.
- Every `<label>` associated via `htmlFor`/`useId`; chip groups are
  `fieldset`/`legend`; chips and tabs expose `aria-pressed`.
- Decorative SVGs and texture layers are `aria-hidden`; functional icons
  live inside elements with `aria-label`.
- Text on `--viz-ground`/`--viz-paper` uses ink (≈13:1) or muted (≈4.6:1);
  on the well, stone-300+ for meaningful text.
- The compare slider is a real `<input type="range">` with an aria-label;
  keyboard arrows work.

---

## 11. Extending the system

When bringing another page (landing, marketplace, auth) into the atelier:

1. Wrap the region in `.viz-scope`; tokens are already on `:root`.
2. Start from copy: one serif promise per page, everything else quiet.
3. Reuse before inventing: `viz-panel`, `viz-label`, `viz-serif`,
   `viz-mono`, `viz-select`, `ChipGroup`. New patterns go into
   `globals.css` with a `viz-` prefix and a comment saying what they mean.
4. Ration the craft: per viewport, at most one dark well, one dots band,
   one set of crop marks, one develop-style reveal.
5. Tie any new "signature" element to a product truth (as PROOF ties to the
   adherence pipeline). If it's only decoration, cut it.

**Don't:** introduce new hues (especially saturated accents competing with
indigo), use pure `#000`/`#FFF`, set body copy in the serif, add scroll
animations, put grain on white panels, or use the old orange CTA color
anywhere.

### Known AI tells — banned compositions

These patterns were shipped here once, called out as "vibe coded," and
removed. Do not reintroduce them:

1. Eyebrow → big title → subtitle stack with an orphaned link floating right.
2. Free-floating full-width texture bands (dots/grain rectangles attached to
   nothing).
3. Grids of uniform bordered chips/tags for option pickers.
4. Skeleton ghost boxes as empty states.
5. Centered modal cards with a label, a message, and a progress bar in a
   symmetric stack.
6. Naive "decorative" illustration — if a drawing isn't good enough to
   print, cut it or redraw it.
7. Glassmorphism as chrome — frosted translucent bars and cards
   (backdrop-blur surfaces) read as borrowed UI. In this system surfaces
   are opaque paper or ink; blur is allowed only on modal scrims and the
   small in-photo labels that genuinely sit on glass over imagery.

The test for any new composition: cover the copy and squint — if the
skeleton could be any AI-generated page, recompose it (asymmetry, a rule to
hang things on, type doing the work of boxes).

---

## 12. The homepage — "The Room That Assembles"

The landing page is the theater. Same atelier materials, maximal motion,
built on **GSAP + ScrollTrigger** (`gsap.matchMedia`; the full experience
runs only at `min-width: 1024px` + `prefers-reduced-motion: no-preference`;
everyone else gets composed static states).

**Hero (`VideoScrollHero.js`) — "The House That Designs Itself"** (the
founder's vision, built on the Adaline-style scrubbed frame sequence):

Three acts, one continuous 30s film, 243 frames (`public/frames/`, ~16MB),
pinned for seven viewports, played frame-by-frame on a DPR-scaled canvas:

1. *The approach.* The camera arcs sideways through the garden at golden
   hour, centering on the villa's open teak door. The serif promise rides
   this act and recedes into 3D at the threshold (0–28%); the global nav
   bows out over the first 10%.
2. *The threshold.* Through the door into the completely empty house —
   bare plaster, travertine, sheer curtains. Wordless.
3. *The design.* Camera locks; the room furnishes itself piece by piece —
   rug, sofa, coffee table, armchairs, lamp, gallery wall — until the film
   holds on the fully designed home, then unpins directly into The
   Workflow. The film's argument IS the product's.

Production recipe (all Higgsfield MCP, ~200 credits): villa still via
nano_banana_pro → three kling3_0_turbo clips chained by uploading each
clip's last frame (ffmpeg `-sseof`) as the next clip's `start_image`. The
act 1→2 seam is a single kling3_0 `mode:'4k'` clip pinned at BOTH ends
(start_image = orbit's last frame, end_image = empty room) so both cuts
lock — this is what fixed the "abrupt" transition. Every clip upscaled to
2K via `upscale_video` (bytedance, preset 'aigc') before frame extraction.
Frames: `ffmpeg -vf "select='not(mod(n,3))',scale=2560:1440:...crop" -c:v
libwebp -quality 82` → 243 × 2560×1440 webp (~40MB). Mobile: the three
clips stitched with ffmpeg concat to `public/hero-film.mp4` (720p, ~9MB),
autoplayed muted/looping/playsInline. Canvas sizes to the section's
`getBoundingClientRect`, NOT window.innerWidth (which includes the
scrollbar and leaves a grey gutter). Title sequence: white serif over a
soft radial ink scrim, staggered mask-reveal on load (`.hero-copy-line`
clipped by `overflow-hidden` parents), lifting away with the scrim across
the first 18% so interior beats play undistracted. Lenis smooth scroll
while mounted (homepage only); frames land by 90% of the pin. Reduced
motion: static first frame + title.

**Sections** — every one opens with the folio header (mono meta pair over
a 2px ink rule):

| Section | Motion |
|---|---|
| `WorkflowPlates` | Design/Discover/Source plates rise past each other at staggered parallax depths; STEP 01–03 labels (real sequence: imagine → identify → procure) |
| `MaterialFan` | Five numbered material plates on a 3D carousel ring, pinned; scroll turns the ring like leafing a fan deck. The ring sits at `translateZ(-RADIUS)` so the front card renders at natural scale |
| `CollectionParallax` | Two honest planes: the masked photo drifts slower than the page, the side plates faster |
| `GalleryWall` | Five columns of community renders; odd columns sink, even rise — the hang of a gallery you walk along |

Rules for extending the stage: scrub, don't autoplay; every scrub maps to a
product truth (assembly = rendering, ring = leafing the library); pinned
sections cost real scroll length — never more than two per page; all GSAP
work inside `gsap.matchMedia` with a designed static fallback.

---

## 13. History

- **v1 "Drawing set"** (July 14, 2026) — drafting utility direction;
  superseded same week as too administrative.
- **v2 "Atelier"** (July 15, 2026) — direction chosen with the founder
  against the contralabs.com reference; hybrid of the Atelier direction
  with Swatch Table pickers; committed craft intensity; scope = visualizer
  page + global nav + footer.
- **v3.1 full-site conversion** (July 15, 2026) — current. Every route is
  now in the system: auth (AuthShell), about (the document layout
  reference), material-finder, marketplace, spec-builder (drafting-sheet
  document), vendor app ("the workshop office"), and the content/legal
  set. Global gutter removed from `layout.js` (sections bleed to the
  viewport edge; every page owns its padding) and `body` is paper —
  never white. Site-wide motion vocabulary added (§5): engraving
  draw-ins, folio-rule reveals, page-enter fade, dot drift, value ticks.
- **v3 homepage: "The Room That Assembles"** (July 15, 2026) —
  Founder asked for a truly magical landing page ("crazy parallax, 3D, wow
  first impression"). Rebuilt all five landing sections on GSAP +
  ScrollTrigger per §12, preserving every piece of key content from the
  old page (annotated-room hero with product cards, Design/Discover/Source
  workflow, spec rows, material carousel, Modern Minimalist collection,
  community wall). Old landing components deleted; motion zoning added.
- **v2.1 de-templating pass** (July 15, 2026) — Founder flagged
  residual "vibe coded" compositions; replaced the eyebrow/title/subtitle
  masthead with the folio (meta line, ink rule, right-aligned deck, dots
  off the rule), chip grids with typeset runs and fan-deck rows, ghost-box
  empty states with mono sentences, the centered overlay card with the
  plate label, and redrew the engraving. See "Known AI tells" in §11.
