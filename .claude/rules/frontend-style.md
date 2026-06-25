# Frontend Style

How the DSource Studio frontend looks, feels, and is built. Loaded every session. Applies to all `frontend/` work. When this conflicts with personal taste, this wins; when it conflicts with `no-bloat.md`, no-bloat wins.

The aesthetic in one line: **warm paper, ink, one ember.** A quiet editorial gallery — confident typography, generous space, a single terracotta accent used sparingly. Never a dashboard; never neon; never glassy SaaS.

## 1. Tokens are the only source of truth

Everything visual comes from `src/design/tokens.css`. **Never hardcode a color, font, space, radius, shadow, or duration in a component** — reference the `var(--token)`. If a value you need isn't a token, add a token; don't inline a hex.

- Surfaces: `--paper` / `--paper-2` / `--paper-3` (warm gallery paper, light).
- Ink: `--ink` (warm near-black), `--ink-2` (secondary), `--muted` (labels), `--faint` (disabled/hints).
- Hairlines: `--line` / `--line-2`. Borders are 1px hairlines, not heavy strokes.
- Accent: `--accent` (terracotta) + `--accent-press` / `--accent-soft` / `--accent-line`. **Exactly one accent.** No second brand color.

## 2. Type

- **Fraunces (`--serif`)** for display, titles, and **all numerals/stats** (`--t-display`, `--t-title`, `--t-numeral`, `--t-lead`). Numbers are the heroes — prices, counts, scores render in Fraunces.
- **Inter (`--sans`)** for body, labels, UI text (`--t-body`, `--t-small`).
- **Eyebrows**: small uppercase section labels, letter-spaced `--tracking-eyebrow`, color `--muted`. Use the `<Eyebrow>` component, not ad-hoc `<span>`.
- Don't introduce new font families, weights beyond what tokens define, or all-caps body text.

## 3. Color usage & semantic meaning

- Default palette is paper + ink + muted. Color is **information**, not decoration.
- The accent marks **one** primary action or the single most important figure on a view — not every interactive element.
- **Semantic states are consistent everywhere** (define once, reuse):
  - Match confidence: `exact` = soft green, `close` = soft amber/terracotta, `no_match` = muted/neutral (see `.match-tag.is-*`).
  - Provenance: `real`/`exact` = confident; `est.`/estimated = muted with a marker.
- Contrast: body text ≥ 4.5:1, large text/UI ≥ 3:1 against its surface. `--muted` on `--paper` is for secondary text only, never primary content.

## 4. Space, radius, elevation, motion

- Space uses the 4-based scale (`--s1`…`--s8`). Compose layouts from these; no magic margins.
- Radius is **mostly sharp** — `--r0`/`--r1` for most surfaces, `--r2` for cards/overlays, `--r-pill` only for tags/toggles. No big rounded "friendly" cards.
- Elevation is paper, not glass: `--shadow-1` / `--shadow-2` only. No hard drop shadows, no glows. Backdrop blur is used sparingly on floating panels (already established for `.mat-panel` / `.render-card`).
- Motion: transitions use `--ease` with `--dur-1` (micro), `--dur-2` (panel), `--dur-3` (entrance). Animate opacity/transform, not layout. Entrances are a gentle rise/fade — never bouncy.

## 5. Components — use the library

Build from `src/design/ui.tsx`: `Button` (`primary`/`ghost`/`quiet`), `Field`, `Card` (`flat`/`raised`), `Stat`, `Tag`, `Callout`, `Divider`, `Eyebrow`, `Segmented`. Style lives in `system.css`. **Import these instead of writing ad-hoc markup.** If a primitive is missing, add it to `ui.tsx` + `system.css` (tokens only) — don't one-off it in a feature file.

- One primary action per view (`ds-btn--primary`); everything else is `ghost`/`quiet`.
- Feature-specific styles (e.g. `.mat-panel`, `.bom-*`) live in `styles.css` and must still use tokens.

## 6. Honest-data UI (the product's defining rule, made visual)

The "never fake data" rule from `no-bloat.md`/`CLAUDE.md` is a **visual contract**:
- Estimated/derived values carry a marker (`≈`, an `est.` chip, a `basis` note) — never shown as if measured.
- "No real match" / unpriced / missing is **stated plainly**, never hidden or filled with a placeholder number.
- Money is real and localized: INR via the `inr()` formatter (`en-IN`, `₹`, grouping). Don't print raw numbers or the wrong currency.
- Confidence is surfaced (the `exact`/`close`/`no_match` label rides with every match). Don't show a match without its confidence.

## 7. Accessibility (non-negotiable)

- **Semantic HTML first**: real `<button>`, `<label>`+`<input>`, `<nav>`, `<main>`, `<aside>`, headings in order. Never a clickable `<div>`.
- **Keyboard**: everything interactive is focusable and operable by keyboard; visible focus ring (use `--accent-line`); logical tab order; no focus traps.
- **ARIA correctly**: tabs use `role="tab"` + `aria-selected` (not `aria-pressed`); toggles use `aria-pressed`; name controls with `aria-label` when there's no visible text. (Known gap: `Segmented` currently uses `aria-pressed` on `role="tab"` — fix to `aria-selected` when next touched.)
- **Images**: every `<img>` has meaningful `alt`; decorative imagery is `alt=""`.
- **Color is never the only signal**: pair it with text/icon (match labels show the word *and* the tint).
- **Motion**: respect `prefers-reduced-motion` — gate entrance animations behind it.
- **Targets**: interactive hit areas ≥ 24×24px.

## 8. 3D / canvas (react-three-fiber)

- The 3D scene reads finishes from the material tokens/palettes — swaps are real-time and consistent (the model is the source of truth; AI render is the on-demand beauty layer).
- Lighting/materials stay in the warm-paper world (no blue studio lighting). Floating controls over the canvas use the same panel treatment (paper + hairline + soft shadow + sparing blur).
- Provide a non-canvas affordance for key info (don't lock essential data inside WebGL only).

## 9. Don'ts

- No hardcoded hex/px-magic/inline fonts. No second accent color. No heavy borders, hard shadows, or glassmorphism.
- No dense dashboard grids of equal-weight tiles — establish hierarchy (one hero number, supporting stats).
- No emoji as UI chrome, no icon zoo. No placeholder/lorem data shipped to the UI.
- No new dependency for something CSS + a token can do.

When in doubt: fewer elements, more space, one accent, Fraunces on the number, and tell the truth about the data.
