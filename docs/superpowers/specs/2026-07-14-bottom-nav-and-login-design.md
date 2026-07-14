# Bottom Navigation + Login Enhancements — Design

**Date:** 2026-07-14
**Status:** Approved

## Context

The app currently has no persistent navigation: the dashboard (`/`) links to its three modules via cards, but once on `/veille`, `/divialerte`, or `/gestia` there was no way back until a `BackHomeLink` was added ad hoc to each page. The login page is bare — no path to sign up, no way to recover a forgotten password, and no explanation when the auth middleware redirects a visitor here.

This spec covers two related additions:

1. A persistent bottom tab bar (mobile-app style, YouTube-like) replacing the ad hoc `BackHomeLink` links.
2. Login page enhancements: a contextual "why am I here" message, a link to sign up, and a full forgot/reset-password flow.

## 1. Bottom Navigation

**Tabs (4, fixed order):**

| Tab | Route | Icon (existing registry) |
|---|---|---|
| Accueil | `/` | `home` |
| Veille | `/veille` | `telescope` |
| DiviAlerte | `/divialerte` | `bell` |
| Gestia | `/gestia` | `lock` |

**Visibility:** shown on every route **except** `/login`, `/signup`, `/veille/unsubscribe`, `/forgot-password`, `/reset-password` (the five standalone auth/unsubscribe flows). Shown at all viewport widths (mobile and desktop) — no responsive hiding.

**Access control:** unchanged. Tapping DiviAlerte or Gestia while logged out still goes through the existing `middleware.ts` redirect to `/login?redirectTo=...`. The nav does not duplicate or replace that logic.

**Active tab:** derived from the current pathname. `/veille/unsubscribe` is excluded entirely (see above), so no ambiguity between "Veille" and unsubscribe.

### Architecture

- `web/lib/nav.ts` — pure, unit-tested logic:
  - `NAV_ITEMS: { id: string; href: string; label: string; icon: IconName }[]` — the 4 tabs, single source of truth.
  - `isNavHidden(pathname: string): boolean` — true for the 5 excluded routes (exact match on `/login`, `/signup`, `/veille/unsubscribe`, `/forgot-password`, `/reset-password`).
  - `getActiveNavId(pathname: string): string | null` — returns the matching tab id (`/veille/...` matches "veille" via prefix; `/` matches "accueil" via exact match only, so it doesn't light up on every route).
- `web/components/ui/BottomNav.tsx` — thin client component (`"use client"`, uses `usePathname()`), consumes `lib/nav.ts`, renders `null` when `isNavHidden` is true. Presentational only, matches the existing convention (e.g. `ArticleCard`) of skipping TDD ceremony for pure JSX.
- Rendered once in `web/app/layout.tsx`, below `{children}`. A fixed-position bar needs body content to not sit underneath it: the layout adds bottom padding to accommodate the bar's height on the pages where it renders. Since `layout.tsx` is a Server Component and visibility is a client-side (pathname) decision, the padding lives inside `BottomNav`'s own client boundary (it renders a sibling spacer `div` of matching height alongside the bar, so layout.tsx itself stays a plain Server Component with no conditional logic).
- Replaces the per-page `BackHomeLink` added earlier: `BackHomeLink` is removed from `/veille`, `/divialerte`, `/gestia` (now covered by the "Accueil" tab). It stays on `/login`, `/signup`, `/veille/unsubscribe`, `/forgot-password`, `/reset-password` since those pages have no bottom nav.

### Testing

- `lib/nav.test.ts`: `isNavHidden` for all 5 excluded routes + a couple of normal routes; `getActiveNavId` for `/`, `/veille`, `/veille/unsubscribe` (should NOT match "veille" — excluded route), `/divialerte`, `/gestia`, and an unrelated path (`/foo` → `null`).

## 2. Login Page Enhancements

**Contextual message:** `LoginForm` already reads `redirectTo` via `useSearchParams()`. Add a lookup: if `redirectTo` starts with `/divialerte` → "Connecte-toi pour accéder à DiviAlerte."; if it starts with `/gestia` → "Connecte-toi pour accéder à Gestia.BRVM."; otherwise no message. Rendered above the `<h1>`.

**Signup link:** below the form, "Pas de compte ? Créer un compte" → `/signup`.

**Forgot password link:** below the password field (or near it), "Mot de passe oublié ?" → `/forgot-password`.

### New pages

**`/forgot-password`** (`web/app/forgot-password/page.tsx`):
- Single email `Input` + submit `Button`.
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })`.
- On submit (success or failure — Supabase doesn't reveal whether the email exists, to avoid account enumeration), shows a static confirmation: "Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé."
- Link back to `/login`.

**`/reset-password`** (`web/app/reset-password/page.tsx`):
- Landed on after clicking the email link; `@supabase/ssr`'s browser client auto-detects the recovery session from the URL, no manual token handling needed.
- Two `Input`s: new password, confirm password. Client-side check: both non-empty, match, and pass the same length rule as signup.
- Calls `supabase.auth.updateUser({ password })`.
- On success: redirect to `/`. On failure: inline error message, same pattern as `/login`.

### Shared validation

`web/lib/validation.ts` currently has the "8 characters minimum" rule inlined inside `validateSignupForm`. Extract it into `validatePassword(password: string): string | null`, called from both `validateSignupForm` and the new reset-password page, so the rule lives in one place.

### Testing

- `lib/validation.test.ts`: extend with cases for the extracted `validatePassword` (existing `validateSignupForm` tests continue to pass unchanged since behavior doesn't change).
- No new route-level tests for `/forgot-password` / `/reset-password` pages themselves — consistent with `/login` and `/signup`, which are untested UI shells calling the Supabase client directly (per Task 4's note: "UI is not pixel-tested; skip the TDD ceremony").

## Out of Scope

- Rate-limiting or abuse protection on `/forgot-password` (Supabase applies its own default rate limits).
- Password strength meter or complexity rules beyond the existing 8-character minimum.
- Any change to `middleware.ts` protected-route logic.
