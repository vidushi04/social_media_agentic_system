# Feature Onboarding Flow — Implementation Plan

**Status:** Plan only. Do not wire this into `App.tsx` until this plan is approved.

**Figma:** [Trellis](https://www.figma.com/design/R3z5RUZioy9huR93RwPtRv/Trellis?node-id=1-132&m=dev)  
**Staging folder:** `onboarding/` (this plan + a reference component). Live app code stays untouched until implementation.

---

## 1. Goal

A 3-step feature onboarding modal that introduces Trellis immediately after a **new** sign-in or **Continue without an account** (brief: “Continue as Guest”). It must match the Figma screens, persist completion state, and never reappear for returning users unless they restart it from help.

---

## 2. Design source of truth

File: `R3z5RUZioy9huR93RwPtRv` · Page 1 · three frames, each **960×696**.

| Step | Frame | Node | Headline | CTA |
|---|---|---|---|---|
| 1 | Onboarding/Screen 1 — Paste video link | `1:132` | Paste your YouTube video link | Next |
| 2 | Onboarding/Screen 2 — Agents in action | `1:165` | Watch your agents in action | Next |
| 3 | Onboarding/Screen 3 — See your analysis | `1:221` | See your analysis, in plain language | Get Started |

### Shared chrome (all three)

- White card, 22px radius, drop shadow `0 24px 64px -8px rgba(0,0,0,0.18)`
- Padding: 20px top, 32px sides, 32px bottom; 24px vertical gaps
- **Skip** top-right, Roboto Regular 16, `#606060`
- Illustration well 380px tall, `#F6F6F6` (screen 2 uses `#F9F9F9`), 20px radius
- Eyebrow `STEP n OF 3` — 11px, `#B3B3B3`, 0.66px letter-spacing
- Headline Roboto Medium 24, black
- Body Roboto Regular 16, `#606060`, max-width 560px, centered
- Bottom row: 3 dots left (active `#000`, idle `#E5E5E5`), black pill CTA right (Roboto Medium 13, 18px radius, 24×10 padding)

### Screen copy (exact)

**Step 1**  
Body: *Drop in your YouTube video’s URL and Trellis’ multi-agent pipeline gets straight to work analyzing your video.*  
Illustration: URL field `https://www.youtube.com/watch?v=`, overlapping video thumbnail, gradient **Run Analysis**, disclaimer + blue Learn more.

**Step 2**  
Body: *Our multi-agent pipeline reverse-engineers the psychology behind your video — live, step by step.*  
Illustration: three tilted agent cards — “I do math for you”, “I read your audience’s mind for you”, “I am your favourite coach”.

**Step 3**  
Body: *No jargon — just what worked, what didn’t, and how to improve engagement by practicing what you learn.*  
Illustration: stacked **AI diagnosis** / **Trellis recommends** cards + gradient **In simple language**.  
Primary CTA label is **Get Started**, not Next.

### Visual tokens (already in the app)

Reuse `--studio-grad-start` / `--studio-grad-end` (`#e32140` → `#d1148f`), `--studio-ink`, `--studio-mute` (`#606060`), Roboto, existing `.modal-overlay` / `.modal-content`. Do not add Tailwind.

### Assets

Download Figma exports during implementation (illustration PNGs, agent icons, pagination if needed). Do not hand-draw those SVGs. Commit bytes under `web/src/assets/onboarding/`. Figma MCP asset URLs expire in ~7 days.

---

## 3. When it appears / does not

**Show immediately after** the user reaches the main studio shell from:

1. A **new** authenticated sign-in (`profile.onboarding_status === 'pending'`).
2. **Continue without an account** (`LoginScreen` button text; same intent as “Continue as Guest”).

Wait until `authLoading` is false and, for signed-in users, `profileReady` and `isAccessApproved`. Do **not** show on `LoginScreen` or `AccessGateScreen`.

**Do not show** if status is `completed` or `skipped`, or if the user has already seen the flow on this identity.

**Restart:** sidebar (or Settings/help) **Product tour** sets status back to `pending` and opens step 1.

**Modal order:** onboarding first. Hide `YoutubeHandlePrompt` while onboarding is open; show it after complete/skip.

---

## 4. User state & persistence

### Status values

`pending` | `completed` | `skipped`

- **Next** on steps 1–2: advance locally only (do not persist mid-flow).
- **Next / Get Started** on step 3: `completed`.
- **Skip**, overlay click, or close: `skipped`.

### Authenticated users

Add `profiles.onboarding_status`.

- New inserts default to `pending` (via column default; `handle_new_user` can omit the field).
- Existing rows: backfill `skipped` so current accounts are not interrupted.
- Client: `supabase.from('profiles').update({ onboarding_status }).eq('user_id', user.id)` then `refreshProfile()`.
- Existing RLS already allows self-update as long as `access_status` does not change.

Also write a per-user localStorage fallback (`TRELLIS_ONBOARDING_STATUS:<userId>`) so a missing column does not reopen the modal every session.

### Guests / local mode

Key: `TRELLIS_ONBOARDING_STATUS`.

- Unset + no local analysis history → treat as new → show.
- Unset + existing `CREATOR_ANALYSIS_HISTORY_V1` → grandfather `skipped` (returning local user).
- `completed` / `skipped` → do not show.

`isLocalMode` covers both “no Supabase” and “Continue without an account”.

### New vs existing

| Identity | New | Existing |
|---|---|---|
| Signed-in | `onboarding_status` pending, or account created in the last ~15 minutes if the column is missing | `completed` / `skipped`, or older account with null status |
| Guest | no onboarding key and no local analyses | key is done, or local analyses exist |

---

## 5. Target files (when implementation starts)

Keep work in this folder until then. Move/adapt into `web/` only during the implementation pass.

| File | Change |
|---|---|
| `onboarding/FeatureOnboardingModal.tsx` | Reference UI (already here). Move to `web/src/components/` and hook up assets/CSS. |
| `web/src/utils/onboarding.ts` | **New.** Show/hide helpers + persist. |
| `web/src/index.css` | `.onboarding-*` styles matching Figma. |
| `web/src/App.tsx` | Open modal, persist, Product tour, defer YouTube handle prompt. |
| `web/src/utils/supabaseClient.ts` | `onboarding_status?: OnboardingStatus \| null` on `Profile`. |
| `web/src/utils/knowledgeBase.ts` | Export `hasLocalAnalysisHistory()` for guest grandfathering. |
| `supabase/onboarding_migration.sql` | **New.** Additive migration. |
| `supabase/schema.sql` | Column on `profiles` for fresh installs. |
| `web/src/assets/onboarding/` | Downloaded Figma assets. |

Do **not** change login copy unless we later rename the button to “Continue as Guest”.

---

## 6. UI behavior

- One modal, internal `stepIndex` 0–2. Reset to 0 whenever it opens.
- Forward only (Figma has no Back).
- Overlay click = skip (same as Skip).
- `role="dialog"` `aria-modal` `aria-labelledby`.
- Reuse existing modal entrance (`overlayFade` / `modalPop`) and `prefers-reduced-motion`.
- Mobile: shrink illustration (~160px) and padding; keep Skip / dots / CTA usable. Figma is desktop-first.

Reference structure lives in `FeatureOnboardingModal.tsx` in this folder.

---

## 7. SQL sketch (run in Supabase SQL editor)

```sql
alter table public.profiles
  add column if not exists onboarding_status text;

-- allow nulls during backfill; then constrain
-- check: pending | completed | skipped

update public.profiles
set onboarding_status = 'skipped'
where onboarding_status is null;

alter table public.profiles
  alter column onboarding_status set default 'pending';

alter table public.profiles
  alter column onboarding_status set not null;
```

Until this runs, the client must still work via localStorage fallback.

---

## 8. Implementation sequence (do this later, in order)

1. **Persistence** — `onboarding.ts`, Profile type, migration, `schema.sql`, `hasLocalAnalysisHistory`.
2. **Styles** — `.onboarding-*` in `index.css` from Figma tokens.
3. **Assets** — export screens 1–3 illustrations/icons into `web/src/assets/onboarding/`.
4. **Modal** — move/adapt `FeatureOnboardingModal.tsx` into `web/src/components/`; wire real images.
5. **App** — show/hide after studio shell mounts; persist complete/skip; hide YouTube prompt while open.
6. **Restart** — sidebar **Product tour**.
7. **Verify** — `npm run build` in `web/`; walk new guest, returning guest, new Google user, existing user, skip, complete, restart.

---

## 9. Test matrix

| Case | Expected |
|---|---|
| New Google user after approval | Modal on first studio view |
| Continue without an account (no local history) | Modal immediately |
| Returning guest (local analyses or stored status) | No modal |
| Existing signed-in user (backfilled skipped) | No modal |
| Skip / overlay | Status skipped; does not return |
| Finish step 3 | Status completed; does not return |
| Product tour | Opens at step 1 |
| Refresh mid-flow | Reopens at step 1 if still pending (acceptable) |
| YouTube handle prompt | Only after onboarding closes |
| Waitlist pending | Access gate only; no onboarding |

---

## 10. Out of scope for v1

- Back button
- Per-step persistence
- Animating illustration cards
- Changing login button label
- Admin UI for onboarding status
- Pixel-perfect 960px card on small phones (responsive shrink is enough)

---

## 11. Explicitly not done yet

- No imports from `App.tsx`
- No CSS added to `index.css`
- No migration applied
- No Figma assets committed

When ready to build, start at **section 8, step 1**.
