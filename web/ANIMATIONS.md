# Trellis — Animation Implementation Guide

This document explains every animation in the app: what it does, what triggers it,
which technology drives it, and why that choice was made.

## Tooling

| Tool | Used for | Why |
|---|---|---|
| **Motion** (`motion/react`, v12) | Drawer open/close, page-view transitions | These need **exit animations** — animating an element while React unmounts it — which plain CSS cannot do. Motion's `AnimatePresence` handles this. |
| **Native CSS** (transitions + keyframes) | Everything else (hovers, presses, modal entrances, spinner) | Simple one-shot or state-based effects don't justify routing through a JS animation runtime. |

**Performance rule:** every animation in the app only touches `transform` and
`opacity` (plus `box-shadow` on hovers, which is compositor-cheap at these sizes).
Nothing animates `width`, `height`, or `margin`.

**Reduced motion:** honored at two levels —
1. `<MotionConfig reducedMotion="user">` wraps the app in `App.tsx`, so Motion
   automatically disables transform-based animations for users who set
   "reduce motion" in their OS.
2. A global CSS override collapses all CSS transitions/animations to 0.01ms
   under `@media (prefers-reduced-motion: reduce)` (end of `index.css`).

---

## 1. Sidebar / drawer (Motion)

**Where:** `App.tsx` — `<AnimatePresence>` around the scrim and `<motion.aside>`.

The same sidebar animates differently depending on viewport (detected with a
`matchMedia('(max-width: 900px)')` hook, so it updates live on resize):

### Mobile (≤ 900px): slide-in drawer
- **Trigger:** hamburger button; closes on scrim tap, page selection, or Settings.
- **Drawer:** `x: '-100%' → 0` on open, reversed on close.
  Duration `0.28s`, easing `cubic-bezier(0.16, 1, 0.3, 1)` ("ease-out-expo" feel:
  fast start, soft landing).
- **Scrim:** `opacity: 0 → 1` (`0.2s ease-out`), reversed on close. Rendered only
  on mobile.

### Desktop (> 900px): collapse/expand
- **Trigger:** hamburger button.
- **Sidebar:** `x: -24, opacity: 0 → x: 0, opacity: 1` — a short slide-fade
  rather than a full slide, because on desktop the sidebar is part of the page
  layout (the content reflows) and a subtle fade reads better than a long travel.
- Same duration/easing as mobile for consistency.

`initial={false}` on `AnimatePresence` prevents the sidebar from animating on
first page load — it only animates on user interaction.

## 2. Page-view transition (Motion)

**Where:** `App.tsx` — `<motion.div key={view} className="studio-view">` inside `<main>`.

- **Trigger:** switching between Dashboard / Past Analysis / Agents.
- **Effect:** incoming page fades up: `opacity 0 → 1`, `y: 8px → 0`,
  `0.25s ease-out`.
- Keying the wrapper by `view` makes React remount it per page, so the entrance
  runs on every switch. No exit animation — waiting for an outgoing page before
  showing the next one would add latency to navigation, which hurts more than it
  helps for a tool UI.

## 3. Modal entrances (CSS)

**Where:** `index.css` — `overlayFade` and `modalPop` keyframes on
`.modal-overlay` / `.modal-content`. Applies to the Settings modal and the
Agent Inspector modal.

- **Overlay:** fades in, `0.2s ease-out`.
- **Dialog:** scales `0.96 → 1` while fading in, `0.22s cubic-bezier(0.16, 1, 0.3, 1)`.
- Entrance-only (closing is instant). Done in CSS because the mount-time
  animation needs no JS; adding `AnimatePresence` here would buy only an exit
  fade at the cost of more wiring.

## 4. Press feedback (CSS)

**Where:** `index.css` — the `:active` block near the end.

- **Trigger:** pressing any button — Analyze, chips, tabs, pills, nav items,
  hamburger, delete icon, config list items.
- **Effect:** `transform: scale(0.96)` while held (`0.98` for sidebar nav items,
  which are wide and would look warped at 0.96).
- Disabled buttons are excluded via `:not(:disabled)`.

## 5. Hover micro-interactions (CSS)

**Where:** `index.css`.

| Element | Effect |
|---|---|
| Agent cards (pipeline diagram) | Lift `translateY(-2px)` + soft shadow, `0.2s` |
| Past-analysis rows | Lift `translateY(-1px)` + existing background tint, `0.15s` |
| Insight cards (Dashboard) | Soft accent-tinted shadow, `0.2s` |
| Buttons/chips/nav items | Background tint transitions (pre-existing), `0.15–0.2s` |

## 6. Status / loading (CSS, pre-existing)

- **Spinner** (`.spinner`): infinite `rotate` during analysis.
- **fadeIn** keyframe: used by the loading state, error banner, and Dashboard
  results (`opacity` + `translateY(10px)`).
- Under reduced motion these freeze to their final frame via the global override.

---

## Conventions for future animations

- **Durations:** 0.15–0.3s for micro-interactions. Anything longer starts to
  feel like waiting.
- **Easing:** `ease-out` (or `cubic-bezier(0.16, 1, 0.3, 1)` for entrances) —
  motion should decelerate into place.
- **Properties:** `transform`, `opacity`, `filter` only.
- **Choose CSS first**; reach for Motion when you need exit animations,
  spring physics, gestures, or animation driven by React state.
- **Always test with "Reduce Motion" enabled** (macOS: System Settings →
  Accessibility → Display → Reduce motion).
