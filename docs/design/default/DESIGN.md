# Design System: Glassmorphism Baseline

This document serves as the canonical reference for the visual design of the Agentic Booster application as of its initial V1 state. It documents the core design tokens, structural patterns, and micro-interactions used to create a premium, dark-mode-first aesthetic.

## 1. Core Philosophy
- **Dark Mode Native:** The application is fundamentally built for dark mode to reduce eye strain and make vibrant UI accents "pop."
- **Glassmorphism:** Heavy use of semi-transparent backgrounds, background blurs (`backdrop-filter`), and subtle borders to create depth and hierarchy without relying on harsh shadows or flat opaque layers.
- **Cinematic Feedback:** Replacing static loading states with dynamic, multi-stage animations (e.g., the pulsing Orchestrator feedback loop) to make the AI process feel alive and valuable.

## 2. Design Tokens

### Color Palette
- **Backgrounds:**
  - `Primary`: `#0a0a0f` (Deepest black, used for `body`)
  - `Secondary`: `#12121c` (Slightly elevated, used for modals/cards)
  - `Tertiary`: `#1a1a2e` (Highest elevation)
- **Text:**
  - `Primary`: `#ffffff` (Headings, primary values)
  - `Secondary`: `#a0a0b0` (Paragraphs, sub-labels)
  - `Muted`: `#6e6e80` (Hints, placeholders, empty states)
- **Accents:**
  - `Primary Accent`: `#8b5cf6` (Vibrant Purple)
  - `Secondary Accent`: `#3b82f6` (Bright Blue)
  - `Gradient`: Linear 135deg from Purple to Blue.
- **Semantic Status:**
  - `Success`: `#10b981` (Green)
  - `Warning`: `#f59e0b` (Orange/Yellow)
  - `Error`: `#ef4444` (Red)

### Typography
- **Font Family:** `Inter`, falling back to `system-ui`.
- **Headings:** Bold (700) or Semi-Bold (600), often stylized with `--accent-gradient` as a text fill.
- **Body:** Regular (400) or Medium (500), `1.5` line height.

### Shape & Structure
- **Border Radii:**
  - `sm`: `0.5rem` (Inputs, small buttons)
  - `md`: `0.75rem` (Primary buttons, standard cards)
  - `lg`: `1rem` (Main glass panels, modal windows)
  - `xl`: `1.5rem` (Extra large containers)
- **Glass Effect (The `.glass-panel` class):**
  - Background: `rgba(255, 255, 255, 0.03)`
  - Border: `1px solid rgba(255, 255, 255, 0.08)`
  - Blur: `backdrop-filter: blur(12px)`
  - Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`

## 3. Component Library

### Inputs
- **`.premium-input`**: A dark, slightly transparent input field (`rgba(0, 0, 0, 0.2)`) with a subtle glass border. On focus, the border transitions to `--accent-primary` with a glowing box-shadow.

### Buttons
- **Primary Action (`.btn-primary`)**: Utilizes the `--accent-gradient` background. Hover states trigger a slight `translateY(-2px)` lift and a colored drop shadow.
- **Secondary Action (`.btn-secondary`)**: Transparent background with a standard glass border. Hovering fills the background with a subtle white wash (`rgba(255, 255, 255, 0.03)`).
- **Chips (`.chip`)**: Pill-shaped (`border-radius: 20px`) buttons used for "Quick Try" suggestions. Hover states transition to a purple-tinted border and background.

### Loading States
- **The Cinematic Spinner**: A custom 40px CSS spinner utilizing `--accent-primary` for the top border, rotating infinitely.
- **Textual Feedback**: While the spinner runs, dynamic text reads the internal state of the `Orchestrator` to display exactly which AI agent is currently active, building trust and anticipation.

### Data Visualization
- **Dev Mode Overlay**: A sliding drawer (`translateX(100%)` to `0`) that displays raw JSON payloads.
- **Pipeline Stages**: Standard AI agents use standard dark cards. Data Harvesters use a dashed blue border (`.pipeline-stage`) to differentiate them as data-gathering nodes rather than LLM inference nodes.
- **Diagnosis Cards**: Uses a colored left-border (`borderLeft: 4px solid var(--success)`) to immediately signal whether the AI found a Strength or a Weakness.
