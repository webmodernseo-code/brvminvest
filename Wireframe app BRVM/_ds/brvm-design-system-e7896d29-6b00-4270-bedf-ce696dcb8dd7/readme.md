# BRVM Design System

**BRVM** is a mobile-first product for market news, price alerts, and portfolio
management — a "watch the market, act on the market" app. This design system
was built **from scratch** (no codebase, Figma file, or brand deck was
attached to this project) using one explicit direction from the user: *use
the same color palette as the Nike website* — a strict black/white/gray
monochrome system, with color used ONLY for specific functional meaning
(market gains/losses, alerts), never as a general "brand accent" — applied
here to a financial product instead of athletic retail.

## Sources
None. No Figma link, codebase, or slide deck was provided. Every token,
component, and screen here is an original construction inspired only by the
brief above. If a real BRVM brand kit, product codebase, or Figma file
exists, attach it and this system should be rebuilt/reconciled against it —
treat everything below as a strong starting point, not ground truth.

## Brand naming & logo
No wordmark or logo asset was supplied. **No logo has been invented or
drawn.** Wherever a mark would appear, the system renders the wordmark
"BRVM" in the display type family (see Visual Foundations). If a real logo
exists, drop its files into `assets/logo/` and swap the wordmark usages in
`ui_kits/`.

## Content fundamentals
BRVM's copy voice borrows the confidence of athletic-brand marketing and
applies it to money: short, declarative, imperative-mood. It talks *to* the
reader ("you"), never about itself in the third person.

- **Sentence shape:** short, punchy, front-loaded with the verb or the number.
  "Up 4.2% today." "Set an alert." "Never miss a move." Avoid subordinate
  clauses and hedging ("might", "could potentially").
- **Casing:** Sentence case for body copy and buttons ("Create alert", not
  "Create Alert"). Display headlines are set in the condensed display face
  and are often run in full uppercase for emphasis (handled by type style,
  not by shouting in the copy itself — write normal case, let the type
  transform it).
- **Person:** Second person ("Your portfolio", "Your watchlist"). The product
  never refers to itself as "we" in-product; system messages are neutral and
  factual ("Alert created", not "We've created your alert!").
- **Numbers lead.** Because this is a market app, prices/percentages are
  treated as headline content, not supporting detail — put the number first:
  "+4.2% · BRVM Composite" rather than "BRVM Composite is up 4.2% today."
- **Tone:** confident, urgent-but-not-alarmist, motivational without being
  cheesy. Think locker-room energy redirected at discipline and follow-through
  ("Stay on it.", "Don't miss the close.") rather than hype ("🚀 TO THE MOON").
- **Emoji:** not used in-product UI (status is communicated with color +
  arrows/icons, not emoji). Fine in informal marketing/social copy only.
- **Punctuation:** periods omitted on short labels/buttons ("Set alert"), used
  on full sentences in body copy and system messages. Avoid exclamation
  points outside of true celebration moments (e.g. onboarding completion).

**Examples**
- Button: `Set alert` · `Add to watchlist` · `View portfolio`
- Empty state: "No alerts yet. Set one on any stock to get notified the
  moment it moves."
- Push notification: "BAOAB +6.1% — biggest mover on BRVM Composite today."
- Error: "Couldn't refresh prices. Check your connection and try again."

## Visual foundations
- **Color:** true white (`--surface-app`) as the dominant field, true black
  text, and black-fill buttons/nav/focus states (`--action-primary` is
  `--gray-950`, not a color) — exactly Nike.com's logic: the site is
  monochrome, and color only ever shows up for a specific functional
  reason. Here that's the market app's semantic set: green for gains
  (`--market-up-500`), red for losses (`--market-down-500`), a deeper muted
  green reserved strictly for alerts/warnings (`--alert-500`, distinct in
  tone from the brighter gains-green so the two are never confused), blue for
  informational notices (`--info-500`). No general-purpose "brand color"
  exists — don't reach for a tint just for decoration. See
  `guidelines/colors-semantic.html`.
- **Type:** two-family system. **Barlow Condensed** (700–900) for display —
  tight leading, tight-to-negative tracking, frequently uppercase — is the
  "shout" register for prices, headlines, and section headers. **Barlow**
  (400–700) is the neutral body/UI face for everything readable. **JetBrains
  Mono** is used narrowly for tabular figures (price tickers, tables) where
  digit alignment matters.
- **Spacing:** 4px base unit, generous gutters (20px default screen margin) —
  athletic-brand layouts breathe; nothing is cramped. See `tokens/spacing.css`.
- **Backgrounds:** flat true-white surfaces, no gradients, no textures, no
  hand-drawn illustration. The one full-bleed image use case is editorial
  news imagery (photos accompanying articles) — treated in grayscale-leaning
  duotone crops where possible to keep the mono palette intact; avoid
  saturated warm/orange photography that would compete with the semantic
  colors' meaning.
- **Animation:** minimal and functional, never decorative. Standard
  easing (`--ease-standard`, 200ms) for state changes (tab switches, sheet
  opens); a slightly springier `--ease-out` for things entering the screen
  (toasts, modals). No infinite/looping decorative motion. Numbers ticking
  up/down (price changes) may animate briefly on refresh — this is the one
  place a touch of playfulness is welcome.
- **Hover states (where applicable, e.g. companion web surfaces):** primary
  (black-fill) buttons lighten slightly toward dark gray
  (`--action-primary-hover`); ghost/text buttons gain a faint black wash
  (`--action-ghost-hover`, 6% black). Always move toward more contrast on
  hover, never toward washed-out — and never introduce color on hover.
- **Press states:** buttons don't scale/shrink; they step one shade darker
  again (`--action-primary-active` / `--action-secondary-active`) — a
  color-based press, not a transform-based one, to keep the flat/industrial
  feel.
- **Borders:** hairline only (1px), always low-opacity black
  (`--border-subtle` 8%, `--border-default` 14%) on the white surfaces — never a
  heavy stroke. Focus states are the one place border gets loud: a solid
  2px black ring (`--border-focus`) — monochrome, not colored.
- **Shadows:** on the white base, shadows do real separation work — soft,
  cool-toned drop shadows (`--shadow-s/m/l`) lift cards and sheets off the
  page. Elevated/floating surfaces (modals, sheets) combine a slightly
  lighter fill (`--surface-card-raised`, pure white vs. the card's faint
  off-white) with the stronger shadow. No colored glow states.
- **Corner radii:** intentionally tight/industrial, not bubbly — 6–16px for
  UI surfaces (buttons, inputs, cards), scaling up to 24px only for large
  sheets/modals. Full-pill radius (`--radius-pill`) is reserved for
  chips/badges/tags, never for buttons or cards.
- **Cards:** `--surface-card` fill, 1px `--border-subtle` hairline, `--radius-l`
  (16px), `--shadow-s`. No colored left-border accent stripes, no gradient
  fills. A "raised" variant (`--surface-card-raised`) is used for cards that
  need to visually pop off other cards (e.g. a modal sheet over a card list).
- **Transparency/blur:** used narrowly — sheet/modal scrims
  (`--surface-overlay`, 50% black) and nothing else. No frosted-glass
  navigation bars or blurred card backgrounds; keeping blur rare keeps it
  meaningful when it appears.
- **Imagery color vibe:** cool, high-contrast, slightly desaturated —
  editorial/reportage feel for news photography, not lifestyle-warm. Avoid
  warm oranges/golden-hour tones entirely — there is no warm color anywhere
  in this system anymore; every functional color (gains, losses, alerts,
  info) is either green, red, or blue.

## Iconography
No icon font, sprite sheet, or SVG set was supplied with the brief. This
system uses **Lucide** icons loaded from CDN (`assets/icons/README.md` has
the exact import) — a clean 1.5–2px stroke-weight outline set that reads well
at the small sizes a market/alerts app needs (chevrons, bell, arrow-up-right,
search, filter, settings). Unicode/emoji glyphs are **not** used as icon
substitutes anywhere in the product; gain/loss direction is communicated with
Lucide's `arrow-up-right` / `arrow-down-right`, always paired with color.
If BRVM has its own icon set, replace the CDN link in `assets/icons/README.md`
and re-point component `Icon` usages.

## Caveats — please help me iterate
- **No real brand assets.** No logo, product screenshots, codebase, or Figma
  file was attached — this entire system, including the "BRVM" name's visual
  treatment, product surfaces, and copy, is a first-pass invention against a
  one-line brief. If you have a real brand kit or app, attach it and I will
  reconcile this system against it.
- **Fonts are a Google Fonts substitution**, not real BRVM brand fonts (none
  were provided). Barlow Condensed / Barlow / JetBrains Mono were chosen for
  an athletic-condensed-meets-financial-utility feel. Send real font files if
  they exist and I'll swap `tokens/fonts.css`.
- **Icons are Lucide (CDN),** not a real BRVM icon set (none was provided).
- Only one product surface (the BRVM mobile app) was built, since that's the
  only one described. Tell me if there's a companion website/dashboard to add.

## Index
- `styles.css` — root stylesheet, import this one file.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radii.css`, `fonts.css`
- `guidelines/` — foundation specimen cards (colors, type, spacing, radii/shadow)
- `components/` — reusable primitives, grouped:
  - `components/core/` — Button, IconButton, Badge, Tag, Card
  - `components/forms/` — Input, Select, Checkbox, Radio, Switch
  - `components/navigation/` — Tabs
  - `components/feedback/` — Dialog, Toast, Tooltip
- `ui_kits/mobile-app/` — BRVM mobile app: onboarding, news feed, alerts, portfolio
- `assets/icons/README.md` — icon sourcing notes (Lucide via CDN)
- `SKILL.md` — portable skill definition for use in Claude Code

### Intentional additions
- **Icon** (`components/core/Icon.jsx`) — thin wrapper around Lucide's CDN
  icon set, added because the brief didn't supply a component inventory to
  enumerate from; needed as the single source of truth for icon usage.
