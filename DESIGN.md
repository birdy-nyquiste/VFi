---
name: VFi
description: A US phone number and a configurable AI voice Assistant on one calm, monochrome platform.
colors:
  ink: "#0b0b0c"
  ink-hover: "#33343a"
  canvas: "#fbfaf9"
  surface: "#ffffff"
  wash: "#f3f2ef"
  hairline: "#e8e6e3"
  control-stroke: "#dcd9d5"
  disabled: "#a9a6a1"
  muted-text: "#6e6f75"
  secondary-text: "#55565b"
  ink-raised: "#1f2024"
  signal: "#0e9aa7"
  signal-text: "#0b6670"
  signal-wash: "#e6f5f6"
  signal-tint: "#cdedef"
  attention: "#a15c00"
  attention-text: "#6e3f00"
  attention-wash: "#fbf1e3"
  failure: "#b42318"
  failure-text: "#9b1c14"
  failure-wash: "#fbeae8"
typography:
  display:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 300
    lineHeight: "68px"
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 300
    lineHeight: "50px"
    letterSpacing: "-0.035em"
  figure:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 300
    lineHeight: "38px"
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  page-title:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  card-title:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "22px"
  body:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "23px"
  ui:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Geist, PingFang SC, Hiragino Sans GB, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  nav-item: "10px"
  control: "12px"
  notice: "16px"
  inset: "18px"
  card: "20px"
  feature: "24px"
  stage: "28px"
  pill: "9999px"
spacing:
  inline: "10px"
  card: "24px"
  feature: "28px"
  gutter-mobile: "16px"
  gutter-app: "40px"
  section: "104px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px 18px"
    height: "40px"
    typography: "{typography.ui}"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.disabled}"
  button-primary-lg:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 18px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.failure}"
    rounded: "{rounded.pill}"
    padding: "6px 18px"
    height: "40px"
  button-danger-hover:
    backgroundColor: "{colors.failure-wash}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "24px"
  badge-live:
    backgroundColor: "{colors.signal-wash}"
    textColor: "{colors.signal-text}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  badge-attention:
    backgroundColor: "{colors.attention-wash}"
    textColor: "{colors.attention-text}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  badge-failure:
    backgroundColor: "{colors.failure-wash}"
    textColor: "{colors.failure-text}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  badge-neutral:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  nav-item:
    textColor: "{colors.ink-hover}"
    rounded: "{rounded.nav-item}"
    padding: "8px 12px"
    typography: "{typography.ui}"
  nav-item-active:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
  live-panel:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  segmented:
    backgroundColor: "{colors.wash}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    height: "36px"
---

# Design System: VFi

## Overview

**Creative North Star: "The Quiet Switchboard"**

VFi is the category standard for voice-agent platforms played straight: black ink on a warm off-white canvas, white hairline cards, black and white pill buttons, and a light Geist display face that speaks at large sizes without raising its voice. The public landing page and the signed-in Dashboard are one system; the landing simply uses the larger button size and the lighter, bigger headline steps. The peer and craft bar is ElevenLabs Agents: restrained monochrome, polished console, the product itself as the proof.

Color is almost absent on purpose. The palette is ink and its warm grays; one signal teal appears only where something is alive or working for the user (a call in progress, an Assistant that is ready, the Assistant's own voice in a transcript, money arriving, the keyboard focus, the center bar of the Wave V mark). Amber marks what needs attention and red marks failure. Actions are always ink, never color.

Density is calm. App pages sit in a 1152px column with 40px gutters and 20px-radius cards with 24px padding; the landing runs a 1200px column with section rhythm near 104px. Depth is mostly flat: hairline borders and tonal washes separate surfaces, and soft ink-tinted shadows appear only on floating illustrations and floating menus. The system works in five languages; CJK and Vietnamese are first-class, which is why the stack is chosen per language and why case is never styled.

**Key Characteristics:**
- Ink on warm canvas; white hairline cards; one signal teal reserved for life and readiness.
- Pill-shaped ink buttons; the Dashboard uses 40px, the landing and sign-in use 48px.
- Geist light (300) for display and figures, regular for page titles, medium for titles and labels.
- Flat by default; soft ink shadows only on floating things.
- Large, soft radii (20px cards, 28px stages) against small, precise hairlines.
- The Wave V mark and its three-bar live indicator are the only motifs.

## Colors

A monochrome ink-on-canvas palette with one functional teal and two state hues. In code the palette is delivered by remapping Tailwind's stone (neutrals), emerald and sky (both the same signal teal), amber and red ramps in `src/app/globals.css`; pages use the stock class names.

### Primary
- **Switchboard Ink** (ink): every action fill (primary buttons, the active segmented tab, the play button, the unread count), all primary text, the Avatar disc, the dark live panel and the dark sign-in and "after the call" panels. Hover lifts it to **Graphite** (ink-hover), which is also strong secondary text.

### Secondary
- **Signal Teal** (signal): the live indicator disc, live and ready dots, the center bar of the Wave V mark, the keyboard focus ring. On white it keeps 3:1 contrast, which is why it carries focus.
- **Deep Signal** (signal-text): teal as text: "Ready" status words, the Assistant's speaker label in transcripts and the hero call, credit amounts in the billing ledger, live-badge text.
- **Signal Wash** (signal-wash) and **Signal Tint** (signal-tint): live and ready badge backgrounds; the tint is the text-selection color and the input focus halo.

### Tertiary
- **Attention Amber** (attention dot, attention-text, attention-wash): pending, processing and syncing states, warning notices, "follow up" and "to confirm" pills.
- **Failure Red** (failure, failure-text, failure-wash): failed and rejected states, error notices, danger buttons, the zero-balance figure, the low-balance avatar dot, sign-out hover.

### Neutral
- **Warm Canvas** (canvas): the page ground on every surface, the sticky header (at 95% with a light blur), the hover fill of secondary buttons.
- **Paper White** (surface): cards, the sidebar, inputs, secondary buttons, white landing sections.
- **Stone Wash** (wash): the active nav item, segmented-control tracks, illustration stages, the hero call summary, assistant transcript bubbles, neutral badges, direction-icon discs.
- **Hairline** (hairline): every card border, table row rule, section divider and tab baseline.
- **Control Stroke** (control-stroke): input borders, secondary-button ring, dashed empty-state borders, the unplayed bars of the recording waveform, the scrollbar thumb.
- **Disabled Stone** (disabled): disabled primary fills and neutral dots.
- **Muted Text** (muted-text): hints, captions, metadata, placeholders, the back link.
- **Secondary Text** (secondary-text): descriptions, subtitles, inactive tabs.
- **Raised Ink** (ink-raised): the inset card on the dark sign-in panel.

### Named Rules
**The Signal Rule.** Signal teal means the system is alive or working for the user: live, ready, the Assistant speaking, credit arriving, and the keyboard focus. It never fills an action, never decorates, and never marks merely "new" or "saved".

**The Ink Action Rule.** Every button the user presses is ink, white with an ink or stone ring, or white with red for destruction. A colored primary button does not exist.

**The Two Teals Are One Rule.** Emerald and sky are the same ramp; choose by meaning in code (green for ready or live, blue for answered or initiated), never expect them to look different.

## Typography

**Display Font:** Geist (variable, via next/font), with the per-language CJK stack, then system-ui
**Body Font:** Geist, same stack
**Label/Mono Font:** Geist Mono, for Assistant instructions and template variables only

**Character:** One family carries the whole system; hierarchy comes from size and weight, never from case or color. Display and figures are set light (300) with tight negative tracking, so large type reads as calm rather than loud.

Language stacks: Simplified Chinese takes PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC; Japanese swaps to Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic UI, Meiryo, Noto Sans JP so kanji take Japanese forms; Vietnamese pages set Inter and Roboto Mono throughout, because Geist has no Vietnamese glyphs and per-letter fallback would mix faces mid-word.

### Hierarchy
- **Display** (300, 64px/68px, -0.04em; 44px/48px under 640px): the landing hero headline only, balanced wrapping. The closing line uses a sibling step (52px/58px, 38px/44px mobile).
- **Headline** (300, 44px/50px, -0.035em; 34px/40px mobile): landing section headings. The sign-in title (36px/42px) and the dark sign-in panel line (40px/46px) are the same voice.
- **Figure** (300, 34px/38px, -0.03em, tabular): balances and counts on Overview cards; the billing balance steps up to 48px, phone numbers on Numbers sit at 28px/36px.
- **Page Title** (400, 30px/36px, -0.025em): the h1 of every Dashboard page, with a 15px secondary-text description below.
- **Title** (500, 20px, -0.01em): landing value-grid and step titles; feature cards use 18px.
- **Card Title** (500, 15px): headings inside Dashboard cards and field labels at 14px.
- **Body** (400, 15px/23px): running text across landing and app; the hero lead is 19px/29px at 520px max width.
- **UI** (400, 14px): buttons, nav, tabs, table cells, notices (21px line).
- **Label** (400, 13px, normal case): captions, metadata, hints (19px line), speaker names, fine print; badges are 12px.

### Named Rules
**The Sentence Case Rule.** Case is never styled: no uppercase transforms, no ALL-CAPS labels, no wide tracking to fake a label voice. "VFi" is a name, not styling.

**The Tabular Figures Rule.** Prices, durations, balances and phone numbers use tabular numerals (tables get them globally) so they line up in columns.

**The Light Large Rule.** Above 26px, type is light (300) with negative tracking; the Dashboard page title is the single regular-weight exception.

## Layout

The Dashboard is a sidebar plus a centered content column: a 240px white sidebar (collapsible to a 64px icon rail, state kept in a cookie) beside a main column capped at 1152px, with 40px side gutters on desktop and 16px on phones, 32px top and 64px bottom padding. On phones the sidebar becomes a top bar with a horizontally scrolling single row of links. Page headers sit 28px above content. Overview cards run in a 1, 2, then 3 column grid with 16px gaps.

The landing runs a 1200px column with 32px gutters (16px mobile), a 68px sticky header, and sections spaced around 104px (88px hero top, 112px "how it works", 120px close). Layout is built from flex-wrap with flex-basis minimums (440px, 460px, 320px) and auto-fit grids (`minmax(min(100%, 300px), 1fr)`), so columns collapse by content width rather than at fixed breakpoints; Tailwind's sm 640px, md 768px and lg 1024px are the only breakpoints in use. White full-bleed bands with hairline top and bottom borders alternate with canvas sections.

Sign-in is a two-pane split: the form column centered at 380px max, and from 1024px a dark ink panel inset 16px with a 28px radius.

## Elevation & Depth

Flat by default. Surfaces separate by tone (canvas, white, stone wash) and by 1px hairlines, not by shadow. Shadows are soft, ink-tinted (rgba of #0b0b0c), and reserved for things that float above the page: illustrations of the product and transient menus.

### Shadow Vocabulary
- **Hero Float** (`box-shadow: 0 24px 60px rgba(11,11,12,0.08), 0 2px 6px rgba(11,11,12,0.04)`): the landing hero's live call card.
- **Illustration Lift** (`box-shadow: 0 12px 32px rgba(11,11,12,0.06)`): product illustration cards on scenario stages.
- **Thumb** (`box-shadow: 0 1px 3px rgba(11,11,12,0.12)`): the selected thumb of the EN / 中文 segmented toggle.
- **Popover** (Tailwind shadow-lg): the account popover; the rail tooltip takes shadow-md and the sidebar collapse handle shadow-sm.

### Named Rules
**The Float-Only Rule.** A shadow means "this is floating": an illustration or a transient menu. Cards, panels, rows and buttons at rest carry a hairline or nothing.

## Shapes

Soft, generous corners against precise 1px hairlines. Radii grow with the size of the surface: 10px nav items, 12px inputs and small controls, 16px notices, 18px inset panels and transcript bubbles, 20px cards and empty states, 24px landing feature cards, 28px stages (the hero call card, scenario stages, the sign-in panel). Everything the user presses or reads as a status is a full pill: buttons, badges, tags, segmented tracks, the live indicator disc, the avatar. Empty states use a dashed control-stroke border on 60% white. The only recurring silhouette is the voice bar: the rounded bars of the Wave V mark, the three bars of the live indicator, and the 80-bar recording waveform.

## Components

### Buttons
Calm, pill-shaped, ink-first.
- **Shape:** full pill (9999px).
- **Primary:** ink fill, white 14px text, 40px min height, 18px horizontal padding; large size is 48px with 24px padding and 16px text, used only on the landing and sign-in.
- **Hover / Focus:** hover lifts ink to graphite with a color transition; keyboard focus is a 2px signal-teal ring offset 2px from a white offset ring, so it stays visible on ink fills. Disabled fills go to disabled stone with a not-allowed cursor.
- **Secondary:** white with a 1px inset control-stroke ring, ink text, canvas fill on hover.
- **Danger:** white with a 1px inset light-red ring and red text, red wash on hover.
- **Landing rule:** one account button (Sign in, or Dashboard when signed in) is the page's only primary action, repeated in header, hero, pricing and close.

### Chips (Badges and Tags)
- **Status badge:** 24px pill, 10px padding, 12px text, a 6px dot before the label. Teal (live, ready, answered, initiated), amber (pending, processing, syncing), red (failed, rejected), stone (completed, succeeded, released). Never wraps; neighboring text gives way.
- **Tag:** 24px pill, white with a hairline border, 12px ink text; used for summary tags.
- **Strict marker:** a 24px ink pill with white text marks strict answer mode.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** paper white on the canvas.
- **Shadow Strategy:** none at rest (see The Float-Only Rule).
- **Border:** 1px hairline.
- **Internal Padding:** 24px; landing feature cards 28px with a 24px radius.
- **Notice:** 16px radius, tinted wash with a matching 200-step border, 14px/21px text, 12px by 16px padding.
- **Empty:** 20px radius, dashed control-stroke border, 40px padding, centered 15px secondary text.

### Inputs / Fields
- **Style:** white, 1px control-stroke border, 12px radius, 10px by 14px padding, 15px text, muted placeholder.
- **Focus:** border darkens to muted text and a 2px signal-tint halo appears.
- **Field:** a 14px medium label 6px above the control and an optional 13px/19px muted hint wired as the control's description.
- **Mono variant:** Assistant instructions and variables set in Geist Mono at 12px.

### Navigation
- **Sidebar:** white, hairline right border, sticky full height; the Wave V mark with a 20px medium "VFi" wordmark at -0.05em; 20px stroke icons (1.6 stroke, round caps) beside 14px labels. Items are 10px-radius rows; active is stone wash with medium ink text, hover a 70% wash. Collapsing animates width over 200ms ease-out and fades labels; the rail shows ink tooltips. The account card at the foot slides its actions up over 200ms.
- **Tabs:** 14px links over a hairline baseline; active carries a 2px ink underline and medium weight.
- **Segmented control:** stone-wash pill track with 4px padding; the active segment is an ink pill (scenario tabs) or a white pill with the Thumb shadow (language toggle).
- **Landing header:** 68px, sticky, canvas at 95% with a small blur and a hairline bottom; 15px anchor links that fade to secondary text on hover.

### Live Indicator (signature)
Three white 3px bars rising and falling (1.1s ease-in-out, staggered 150ms) inside a 40px signal-teal disc. It appears only where a call is in progress: the dark live panel on Overview and call detail (ink, 20px radius), the hero call card, and the sign-in panel. Animation stops under reduced motion.

### Wave V Mark
Five rounded voice bars dipping into a V; the outer four take the current text color, the center bar is always signal teal. Paired with real-text "VFi" in Geist 500 at -0.05em. Sizes: 20px (footer), 24px (header, sidebar), 56px (landing close).

### Recording Player
An ink 44px play pill beside an 80-bar waveform scrubber: played bars ink, unplayed control-stroke, 2px gaps, with a transparent range input over it as the real control, and a 13px tabular time readout.

### Transcript
Chat bubbles with an 18px radius at 78% max width: the Assistant in stone wash with a deep-signal speaker label, the caller in ink with white text and a light stone label. Lines on the landing hero enter in sequence (0.6s, cubic-bezier(0.16, 1, 0.3, 1), 6px rise, 0.5s stagger).

## Do's and Don'ts

### Do:
- **Do** fill every action with ink (#0b0b0c) and shape it as a full pill; use the 48px size only on the landing and sign-in.
- **Do** reserve signal teal for live, ready, the Assistant's voice, incoming credit and keyboard focus (The Signal Rule).
- **Do** separate surfaces with 1px hairlines and tonal washes; keep cards at 20px radius with 24px padding.
- **Do** set type above 26px in Geist light (300) with negative tracking, and every number in tabular figures.
- **Do** let layouts collapse by content width (flex-basis minimums, auto-fit grids) so CJK, Vietnamese and English all fit without per-language overrides.
- **Do** give each new animated element a reduced-motion stop, as the live bars and line entrances have.

### Don't:
- **Don't** use uppercase text styling or ALL-CAPS labels, anywhere, in any language.
- **Don't** put teal on a button, a link, a "new" or "unread" marker, or a decorative accent.
- **Don't** add shadows to cards, rows or buttons at rest; shadows are for floating illustrations and menus only.
- **Don't** introduce a second accent hue, gradients, or a dark neon theme; the world is ink on warm canvas.
- **Don't** add a second primary call to action beside the account button on the landing page.
- **Don't** use typographic glyphs (arrows, checkmarks) as icons; draw icons as inline SVG with round caps and joins, as the sidebar and direction icons are.
