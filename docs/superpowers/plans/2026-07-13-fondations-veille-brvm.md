# Fondations + Veille.BRVM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js foundations (design system, auth, dashboard shell) and ship the Veille.BRVM module — automated scraping of BRVM articles/videos, a public feed with favorites and email subscription.

**Architecture:** Next.js 14 App Router project in `web/`, Supabase for Postgres + Auth, Vercel Cron hitting API routes that scrape via Firecrawl (articles) and YouTube Data API (videos), Resend for email notifications. Business logic (dedup, selection, favorite toggling) is isolated in pure functions under `lib/veille/` so it can be unit tested without hitting real APIs.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), `@mendable/firecrawl-js`, Resend + `@react-email/components`, Lucide React, Vitest.

## Global Constraints

- Design tokens must be ported verbatim from `Wireframe app BRVM/_ds/brvm-design-system-e7896d29-6b00-4270-bedf-ce696dcb8dd7/tokens/*.css` — do not invent new color/spacing values.
- No AI summarization: article/video text is the raw title + excerpt/meta-description extracted by Firecrawl. No `ANTHROPIC_API_KEY` anywhere in this plan.
- Cron cadence: Monday & Thursday 08:00 UTC → articles; Tuesday & Friday 08:00 UTC → videos. Never more than once/day per job (Vercel Hobby plan constraint).
- Dedup is enforced at the database level: `veille_articles.source_url` UNIQUE, `veille_videos.youtube_video_id` UNIQUE.
- Cron routes are protected by a `CRON_SECRET` bearer header — never publicly callable without it.
- A failed email send must never block content publication (`sent_at` stays `null` and is retried, but the row is already committed).
- Single account system: one Supabase Auth user (`profiles` row) unlocks both DiviAlerte/Gestia (out of scope here) and Veille favorites.
- Never print real API key values inside this repo's committed files (plan, spec, code comments) — only reference `.env.local` keys by name.
- Package manager: npm. Node 18.17+.

---

## File Structure Overview

```
web/
  app/
    layout.tsx                        # root layout, loads fonts + globals.css
    globals.css                       # imports design tokens
    page.tsx                          # Dashboard
    signup/page.tsx
    login/page.tsx
    veille/
      page.tsx                        # Articles / Vidéos / Favoris tabs
      unsubscribe/page.tsx
    divialerte/page.tsx                # stub page, proves route-guard works
    gestia/page.tsx                    # stub page, proves route-guard works
    api/
      cron/
        veille-articles/route.ts
        veille-videos/route.ts
      veille/
        subscribe/route.ts
        unsubscribe/route.ts
        favorites/route.ts
  components/
    ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Input.tsx
      Tag.tsx
      Icon.tsx
    veille/
      ArticleCard.tsx
      VideoCard.tsx
      FavoriteButton.tsx
      SubscribeForm.tsx
      VeilleTabs.tsx
  lib/
    supabase/
      client.ts                       # browser client
      server.ts                       # server component / route handler client
      middleware.ts                   # updateSession helper
    firecrawl.ts
    youtube.ts
    resend.ts
    unsubscribeToken.ts
    veille/
      types.ts
      articleSelection.ts
      articleSelection.test.ts
      videoSelection.ts
      videoSelection.test.ts
  emails/
    VeilleNotification.tsx
  supabase/
    migrations/
      0001_init.sql
  middleware.ts
  vitest.config.ts
  tailwind.config.ts
  .env.local                          # moved from repo root, never committed
```

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `web/` (via `create-next-app`)
- Move: repo-root `.env.local` → `web/.env.local`

**Interfaces:**
- Produces: a runnable Next.js 14 App Router project at `web/`, TypeScript + Tailwind already wired by the scaffolder.

- [ ] **Step 1: Scaffold the app**

Run from the repo root (`BRVM/`):

```bash
npx create-next-app@14 web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Move the existing env file into the project**

The repo root already has a `.env.local` with `YOUTUBE_API_KEY` and `FIRECRAWL_API_KEY` (created during design). Move it — do not retype the key values anywhere, including in commit messages:

```bash
mv .env.local web/.env.local
```

- [ ] **Step 3: Add the remaining env var placeholders**

Open `web/.env.local` and append (leave values blank until you have them):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CRON_SECRET=
UNSUBSCRIBE_SECRET=
```

- [ ] **Step 4: Install remaining dependencies**

```bash
cd web
npm install @supabase/supabase-js @supabase/ssr @mendable/firecrawl-js resend @react-email/components @react-email/render lucide-react
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

- [ ] **Step 5: Verify the app builds**

```bash
npm run build
```

Expected: build succeeds with the default Next.js starter page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 app with Tailwind, Supabase, Firecrawl, Resend deps"
```

---

### Task 2: Supabase schema migration

**Files:**
- Create: `web/supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `profiles`, `veille_articles`, `veille_videos`, `veille_youtube_channels`, `veille_subscribers`, `veille_favorites` — every later task's Supabase queries assume these exact table/column names.

- [ ] **Step 1: Write the migration file**

```sql
-- web/supabase/migrations/0001_init.sql

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  prenom text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists veille_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null,
  source_name text not null,
  source_url text not null unique,
  published_at timestamptz not null,
  scraped_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists veille_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null unique,
  channel_name text not null,
  published_at timestamptz not null,
  scraped_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists veille_youtube_channels (
  id uuid primary key default gen_random_uuid(),
  channel_name text not null,
  channel_id text not null unique,
  active boolean not null default true
);

create table if not exists veille_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists veille_favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  content_type text not null check (content_type in ('article', 'video')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, content_type, content_id)
);

alter table profiles enable row level security;
alter table veille_favorites enable row level security;
alter table veille_articles enable row level security;
alter table veille_videos enable row level security;
alter table veille_youtube_channels enable row level security;
alter table veille_subscribers enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can view own favorites" on veille_favorites
  for select using (auth.uid() = profile_id);
create policy "Users can insert own favorites" on veille_favorites
  for insert with check (auth.uid() = profile_id);
create policy "Users can delete own favorites" on veille_favorites
  for delete using (auth.uid() = profile_id);

create policy "Public read articles" on veille_articles
  for select using (true);
create policy "Public read videos" on veille_videos
  for select using (true);
create policy "Public read channels" on veille_youtube_channels
  for select using (true);
```

Notes for the engineer applying this:
- `veille_subscribers` has RLS enabled with **no** policies for the `anon`/`authenticated` roles — it is only reachable via the service-role key from server-side API routes (Task 18). This keeps subscriber emails from being readable or writable directly from the browser.
- `veille_articles`/`veille_videos`/`veille_youtube_channels` are publicly readable but only writable via the service-role key (cron routes), since no insert/update/delete policy exists for anon.

- [ ] **Step 2: Apply the migration**

Open the Supabase project's SQL Editor (Studio) and paste the contents of `0001_init.sql`, then run it.

Expected: 6 tables created, visible in Table Editor.

- [ ] **Step 3: Seed one YouTube channel row for local testing**

In the SQL editor:

```sql
insert into veille_youtube_channels (channel_name, channel_id, active)
values ('Sikarium', 'REPLACE_WITH_REAL_CHANNEL_ID', true);
```

(Look up Sikarium's real `channel_id` from its YouTube channel page — About tab — before running this.)

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/0001_init.sql
git commit -m "feat: add Supabase schema migration for profiles and Veille tables"
```

---

### Task 3: Port design tokens

**Files:**
- Create: `web/app/globals-tokens.css`
- Modify: `web/app/globals.css`
- Modify: `web/tailwind.config.ts`

**Interfaces:**
- Produces: CSS custom properties (`--surface-app`, `--text-primary`, `--market-up-500`, etc.) available globally, plus matching Tailwind theme extensions so classes like `bg-surface-card` work.

- [ ] **Step 1: Copy the token files verbatim**

```bash
cp "../Wireframe app BRVM/_ds/brvm-design-system-e7896d29-6b00-4270-bedf-ce696dcb8dd7/tokens/colors.css" web/app/tokens-colors.css
cp "../Wireframe app BRVM/_ds/brvm-design-system-e7896d29-6b00-4270-bedf-ce696dcb8dd7/tokens/typography.css" web/app/tokens-typography.css
cp "../Wireframe app BRVM/_ds/brvm-design-system-e7896d29-6b00-4270-bedf-ce696dcb8dd7/tokens/spacing.css" web/app/tokens-spacing.css
cp "../Wireframe app BRVM/_ds/brvm-design-system-e7896d29-6b00-4270-bedf-ce696dcb8dd7/tokens/radii.css" web/app/tokens-radii.css
cp "../Wireframe app BRVM/_ds/brvm-design-system-e7896d29-6b00-4270-bedf-ce696dcb8dd7/tokens/fonts.css" web/app/tokens-fonts.css
```

- [ ] **Step 2: Import them in `globals.css`**

At the top of `web/app/globals.css`, before the `@tailwind` directives:

```css
@import "./tokens-fonts.css";
@import "./tokens-colors.css";
@import "./tokens-typography.css";
@import "./tokens-spacing.css";
@import "./tokens-radii.css";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Map key tokens into Tailwind's theme**

Edit `web/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-app": "var(--surface-app)",
        "surface-card": "var(--surface-card)",
        "surface-card-raised": "var(--surface-card-raised)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "market-up": "var(--market-up-500)",
        "market-down": "var(--market-down-500)",
        alert: "var(--alert-500)",
        info: "var(--info-500)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "action-primary": "var(--action-primary)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        m: "var(--radius-m)",
        l: "var(--radius-l)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Verify the build still compiles**

```bash
cd web
npm run build
```

Expected: build succeeds, no CSS import errors.

- [ ] **Step 5: Commit**

```bash
git add web/app/tokens-*.css web/app/globals.css web/tailwind.config.ts
git commit -m "feat: port BRVM design tokens into the Next.js app"
```

---

### Task 4: Base UI primitives

**Files:**
- Create: `web/components/ui/Button.tsx`
- Create: `web/components/ui/Card.tsx`
- Create: `web/components/ui/Badge.tsx`
- Create: `web/components/ui/Input.tsx`
- Create: `web/components/ui/Tag.tsx`
- Create: `web/components/ui/Icon.tsx`

**Interfaces:**
- Produces: `<Button variant="primary" | "outline" | "success" size="s" | "l" fullWidth?>`, `<Card raised? padding?>`, `<Badge tone="success" | "warning" | "error" | "neutral">`, `<Input label placeholder type?>`, `<Tag active?>`, `<Icon name size color>` (thin wrapper choosing the right `lucide-react` icon by name).
- These are pure presentational components with no business logic — per the spec (section 7), UI is not pixel-tested; skip the TDD ceremony here and just build + typecheck.

- [ ] **Step 1: Button**

```tsx
// web/components/ui/Button.tsx
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "success" | "danger";
type Size = "s" | "l";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-action-primary text-white hover:opacity-90",
  outline: "border border-border-default text-text-primary hover:bg-black/5",
  success: "bg-market-up text-white hover:opacity-90",
  danger: "bg-market-down text-white hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  s: "h-9 px-3 text-sm",
  l: "h-[52px] px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "l",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "rounded-m font-body font-semibold transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Card**

```tsx
// web/components/ui/Card.tsx
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
  padding?: number;
}

export function Card({ raised = false, padding = 16, className = "", style, ...props }: CardProps) {
  return (
    <div
      className={[
        raised ? "bg-surface-card-raised shadow-sm" : "bg-surface-card",
        "border border-border-subtle rounded-m",
        className,
      ].join(" ")}
      style={{ padding, ...style }}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Badge**

```tsx
// web/components/ui/Badge.tsx
import { HTMLAttributes } from "react";

type Tone = "success" | "warning" | "error" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-[rgba(23,201,100,0.12)] text-market-up",
  warning: "bg-[rgba(47,107,79,0.12)] text-alert",
  error: "bg-[rgba(239,68,68,0.12)] text-market-down",
  neutral: "bg-black/5 text-text-secondary",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Input**

```tsx
// web/components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, className = "", id, ...props },
  ref
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </span>
      <input
        ref={ref}
        id={inputId}
        className={[
          "h-14 rounded-m border border-border-default bg-surface-card px-3.5 font-body text-text-primary",
          className,
        ].join(" ")}
        {...props}
      />
    </label>
  );
});
```

- [ ] **Step 5: Tag**

```tsx
// web/components/ui/Tag.tsx
import { ButtonHTMLAttributes } from "react";

interface TagProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Tag({ active = false, className = "", ...props }: TagProps) {
  return (
    <button
      type="button"
      className={[
        "h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold",
        active ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
```

- [ ] **Step 6: Icon**

```tsx
// web/components/ui/Icon.tsx
import { LucideProps, Telescope, Bell, Lock, ChevronRight, ChevronDown, Search, ShieldCheck, Home, Briefcase, Star } from "lucide-react";

const registry = {
  telescope: Telescope,
  bell: Bell,
  lock: Lock,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  search: Search,
  "shield-check": ShieldCheck,
  home: Home,
  briefcase: Briefcase,
  star: Star,
} as const;

export type IconName = keyof typeof registry;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  const Component = registry[name];
  return <Component {...props} />;
}
```

- [ ] **Step 7: Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add web/components/ui
git commit -m "feat: add base UI primitives (Button, Card, Badge, Input, Tag, Icon)"
```

---

### Task 5: Supabase client utilities

**Files:**
- Create: `web/lib/supabase/client.ts`
- Create: `web/lib/supabase/server.ts`
- Create: `web/lib/supabase/middleware.ts`

**Interfaces:**
- Produces: `createBrowserSupabaseClient()`, `createServerSupabaseClient()` (async, reads/writes cookies via `next/headers`), `updateSession(request: NextRequest): Promise<NextResponse>` — Task 6's `middleware.ts` calls `updateSession` directly.

- [ ] **Step 1: Browser client**

```ts
// web/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server client**

```ts
// web/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware handles refresh instead.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Middleware session helper**

```ts
// web/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
```

- [ ] **Step 4: Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors (env vars are read at runtime, not required for typecheck).

- [ ] **Step 5: Commit**

```bash
git add web/lib/supabase
git commit -m "feat: add Supabase browser/server clients and session middleware helper"
```

---

### Task 6: Route-guard middleware

**Files:**
- Create: `web/middleware.ts`
- Create: `web/app/divialerte/page.tsx`
- Create: `web/app/gestia/page.tsx`
- Test: `web/middleware.test.ts`

**Interfaces:**
- Consumes: `updateSession(request: NextRequest)` from Task 5.
- Produces: unauthenticated requests to `/divialerte*` or `/gestia*` redirect to `/login`; `/veille*` and `/` stay public.

- [ ] **Step 1: Write the failing test**

```ts
// web/middleware.test.ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("./lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

import { updateSession } from "./lib/supabase/middleware";
import { middleware } from "./middleware";

describe("middleware route guard", () => {
  it("redirects to /login when hitting /gestia without a session", async () => {
    (updateSession as any).mockResolvedValue({
      response: new Response(null) as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/gestia");
    const result = await middleware(request);

    expect(result.status).toBe(307);
    expect(result.headers.get("location")).toContain("/login");
  });

  it("passes through /veille without a session", async () => {
    (updateSession as any).mockResolvedValue({
      response: new Response(null, { status: 200 }) as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/veille");
    const result = await middleware(request);

    expect(result.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd web
npx vitest run middleware.test.ts
```

Expected: FAIL — `middleware.ts` doesn't exist yet.

- [ ] **Step 3: Implement the middleware**

```ts
// web/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/divialerte", "/gestia"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/divialerte/:path*", "/gestia/:path*", "/veille/:path*"],
};
```

- [ ] **Step 4: Add stub pages so the matcher has real routes to guard**

```tsx
// web/app/divialerte/page.tsx
export default function DiviAlertePage() {
  return <div className="p-6">DiviAlerte — à construire dans son propre spec.</div>;
}
```

```tsx
// web/app/gestia/page.tsx
export default function GestiaPage() {
  return <div className="p-6">Gestia.BRVM — à construire dans son propre spec.</div>;
}
```

- [ ] **Step 5: Run test again to verify it passes**

```bash
cd web
npx vitest run middleware.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add web/middleware.ts web/middleware.test.ts web/app/divialerte web/app/gestia
git commit -m "feat: add auth route-guard middleware for DiviAlerte/Gestia"
```

---

### Task 7: Signup page

**Files:**
- Create: `web/app/signup/page.tsx`
- Create: `web/lib/validation.ts`
- Test: `web/lib/validation.test.ts`

**Interfaces:**
- Produces: `validateSignupForm(input: { nom: string; prenom: string; email: string; password: string }): string | null` (returns an error message or `null` if valid) — used by the signup form before calling Supabase.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/validation.test.ts
import { describe, it, expect } from "vitest";
import { validateSignupForm } from "./validation";

describe("validateSignupForm", () => {
  it("rejects a missing nom", () => {
    expect(
      validateSignupForm({ nom: "", prenom: "Awa", email: "a@b.com", password: "secret123" })
    ).toBe("Le nom est requis.");
  });

  it("rejects an invalid email", () => {
    expect(
      validateSignupForm({ nom: "Diop", prenom: "Awa", email: "not-an-email", password: "secret123" })
    ).toBe("L'adresse email n'est pas valide.");
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      validateSignupForm({ nom: "Diop", prenom: "Awa", email: "a@b.com", password: "short" })
    ).toBe("Le mot de passe doit contenir au moins 8 caractères.");
  });

  it("accepts a valid form", () => {
    expect(
      validateSignupForm({ nom: "Diop", prenom: "Awa", email: "a@b.com", password: "secret123" })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd web
npx vitest run lib/validation.test.ts
```

Expected: FAIL — `./validation` doesn't exist.

- [ ] **Step 3: Implement validation**

```ts
// web/lib/validation.ts
export interface SignupInput {
  nom: string;
  prenom: string;
  email: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignupForm(input: SignupInput): string | null {
  if (!input.nom.trim()) return "Le nom est requis.";
  if (!input.prenom.trim()) return "Le prénom est requis.";
  if (!EMAIL_RE.test(input.email)) return "L'adresse email n'est pas valide.";
  if (input.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  return null;
}
```

- [ ] **Step 4: Run test again to verify it passes**

```bash
cd web
npx vitest run lib/validation.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Build the signup page**

```tsx
// web/app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { validateSignupForm } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateSignupForm({ nom, prenom, email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "Un compte existe déjà avec cet email."
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({ id: data.user.id, nom, prenom, email });
    }

    setLoading(false);
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Créer un compte
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
        <Input label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <Input
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-market-down">{error}</p>}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Création..." : "Créer mon compte"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/app/signup web/lib/validation.ts web/lib/validation.test.ts
git commit -m "feat: add signup page with form validation"
```

---

### Task 8: Login page

**Files:**
- Create: `web/app/login/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient()` from Task 5.
- Produces: `/login` route used as the redirect target by the middleware (Task 6).

- [ ] **Step 1: Build the login page**

```tsx
// web/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") ?? "/";
    router.push(redirectTo);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Se connecter
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-market-down">{error}</p>}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Connexion..." : "Déverrouiller"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/login`, confirm the form renders without console errors.

- [ ] **Step 3: Commit**

```bash
git add web/app/login
git commit -m "feat: add login page"
```

---

### Task 9: Dashboard shell

**Files:**
- Modify: `web/app/layout.tsx`
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient()` from Task 5, `Card`/`Icon`/`Badge` from Task 4.
- Produces: the `/` route — public dashboard with 3 module cards, CTA state when logged out.

- [ ] **Step 1: Root layout**

```tsx
// web/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investir à la BRVM",
  description: "Veille, alertes de dividendes et gestion de portefeuille pour la BRVM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-surface-app font-body text-text-primary">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Dashboard page**

```tsx
// web/app/page.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-text-tertiary">BRVM</p>
        <h1 className="font-display text-3xl font-extrabold uppercase text-text-primary">
          {user ? "Bonjour" : "Investir à la BRVM"}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/veille">
          <Card raised padding={24}>
            <Icon name="telescope" size={24} color="var(--market-up-700)" />
            <p className="mt-4 font-semibold text-text-primary">Veille.BRVM</p>
            <p className="mt-1 text-sm text-text-tertiary">
              Articles &amp; vidéos hebdo pour comprendre le marché.
            </p>
          </Card>
        </Link>

        <DashboardModuleCta href="/divialerte" iconName="bell" title="DiviAlerte" loggedIn={!!user} />
        <DashboardModuleCta href="/gestia" iconName="lock" title="Gestia.BRVM" loggedIn={!!user} />
      </div>
    </div>
  );
}

function DashboardModuleCta({
  href,
  iconName,
  title,
  loggedIn,
}: {
  href: string;
  iconName: "bell" | "lock";
  title: string;
  loggedIn: boolean;
}) {
  return (
    <Card raised padding={24}>
      <Icon name={iconName} size={24} color="var(--info-700)" />
      <p className="mt-4 font-semibold text-text-primary">{title}</p>
      {loggedIn ? (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-text-primary">
          Ouvrir →
        </Link>
      ) : (
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="outline" size="s">
            Se connecter
          </Button>
        </Link>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/`, confirm 3 cards render and DiviAlerte/Gestia show "Se connecter" when logged out.

- [ ] **Step 3: Commit**

```bash
git add web/app/layout.tsx web/app/page.tsx
git commit -m "feat: add dashboard shell with module cards"
```

---

### Task 10: Firecrawl wrapper

**Files:**
- Create: `web/lib/firecrawl.ts`

**Interfaces:**
- Produces:
  - `scrapeListingLinks(listingUrl: string): Promise<{ url: string }[]>`
  - `scrapeArticleContent(articleUrl: string): Promise<{ title: string; excerpt: string; publishedAt: string | null }>`
  - Both consumed by Task 12's cron route.

- [ ] **Step 1: Implement the wrapper**

```ts
// web/lib/firecrawl.ts
import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

export async function scrapeListingLinks(listingUrl: string): Promise<{ url: string }[]> {
  const result = await firecrawl.scrapeUrl(listingUrl, { formats: ["links"] });
  if (!result.success) {
    throw new Error(`Firecrawl failed to scrape listing ${listingUrl}: ${result.error}`);
  }
  const links = (result as any).links as string[] | undefined;
  return (links ?? []).map((url) => ({ url }));
}

export async function scrapeArticleContent(articleUrl: string): Promise<{
  title: string;
  excerpt: string;
  publishedAt: string | null;
}> {
  const result = await firecrawl.scrapeUrl(articleUrl, {
    formats: ["markdown"],
    onlyMainContent: true,
  });
  if (!result.success) {
    throw new Error(`Firecrawl failed to scrape article ${articleUrl}: ${result.error}`);
  }
  const metadata = (result as any).metadata ?? {};
  return {
    title: metadata.title ?? "Sans titre",
    excerpt: metadata.description ?? (result as any).markdown?.slice(0, 280) ?? "",
    publishedAt: metadata.publishedTime ?? null,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/lib/firecrawl.ts
git commit -m "feat: add Firecrawl scraping wrapper"
```

---

### Task 11: Article selection logic (pure, unit-tested)

**Files:**
- Create: `web/lib/veille/types.ts`
- Create: `web/lib/veille/articleSelection.ts`
- Test: `web/lib/veille/articleSelection.test.ts`

**Interfaces:**
- Produces:
  - `ArticleCandidate { url: string; sourceName: string }`
  - `filterUnseenCandidates(candidates: ArticleCandidate[], knownUrls: Set<string>): ArticleCandidate[]`
  - `pickMostRecentCandidate(candidates: ArticleCandidate[]): ArticleCandidate | null` (picks the first one, since listing pages are already chronological — first candidate found across all sources wins)
- Consumed by Task 12's cron route.

- [ ] **Step 1: Write the failing tests**

```ts
// web/lib/veille/articleSelection.test.ts
import { describe, it, expect } from "vitest";
import { filterUnseenCandidates, pickMostRecentCandidate } from "./articleSelection";
import type { ArticleCandidate } from "./types";

describe("filterUnseenCandidates", () => {
  it("removes candidates whose url is already known", () => {
    const candidates: ArticleCandidate[] = [
      { url: "https://a.com/1", sourceName: "Sika Finance" },
      { url: "https://a.com/2", sourceName: "Sika Finance" },
    ];
    const known = new Set(["https://a.com/1"]);
    expect(filterUnseenCandidates(candidates, known)).toEqual([
      { url: "https://a.com/2", sourceName: "Sika Finance" },
    ]);
  });

  it("returns an empty array when everything is already known", () => {
    const candidates: ArticleCandidate[] = [{ url: "https://a.com/1", sourceName: "Sika Finance" }];
    const known = new Set(["https://a.com/1"]);
    expect(filterUnseenCandidates(candidates, known)).toEqual([]);
  });
});

describe("pickMostRecentCandidate", () => {
  it("picks the first candidate when candidates exist", () => {
    const candidates: ArticleCandidate[] = [
      { url: "https://a.com/1", sourceName: "Sika Finance" },
      { url: "https://b.com/2", sourceName: "Financial Afrik" },
    ];
    expect(pickMostRecentCandidate(candidates)).toEqual({
      url: "https://a.com/1",
      sourceName: "Sika Finance",
    });
  });

  it("returns null when there are no candidates", () => {
    expect(pickMostRecentCandidate([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/veille/articleSelection.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Define the shared types**

```ts
// web/lib/veille/types.ts
export interface ArticleCandidate {
  url: string;
  sourceName: string;
}

export interface VideoCandidate {
  videoId: string;
  url: string;
  title: string;
  channelName: string;
  publishedAt: string;
}
```

- [ ] **Step 4: Implement the selection logic**

```ts
// web/lib/veille/articleSelection.ts
import type { ArticleCandidate } from "./types";

export function filterUnseenCandidates(
  candidates: ArticleCandidate[],
  knownUrls: Set<string>
): ArticleCandidate[] {
  return candidates.filter((candidate) => !knownUrls.has(candidate.url));
}

export function pickMostRecentCandidate(candidates: ArticleCandidate[]): ArticleCandidate | null {
  return candidates[0] ?? null;
}
```

- [ ] **Step 5: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/veille/articleSelection.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add web/lib/veille/types.ts web/lib/veille/articleSelection.ts web/lib/veille/articleSelection.test.ts
git commit -m "feat: add pure article selection/dedup logic with tests"
```

---

### Task 12: Articles cron route

**Files:**
- Create: `web/app/api/cron/veille-articles/route.ts`
- Test: `web/app/api/cron/veille-articles/route.test.ts`

**Interfaces:**
- Consumes: `scrapeListingLinks`, `scrapeArticleContent` (Task 10), `filterUnseenCandidates`, `pickMostRecentCandidate` (Task 11), `sendVeilleNotification` (Task 17 — mocked here until Task 17 lands; see note below).
- Produces: `GET` handler for `/api/cron/veille-articles`, requires `Authorization: Bearer <CRON_SECRET>`.

> **Sequencing note:** this task references `sendVeilleNotification` from `@/lib/resend`, which does not exist until Task 17. Until then, the route test mocks `@/lib/resend` entirely (as shown below), so Task 12 can be implemented and tested standalone. Once Task 17 lands, no changes are needed here — the real implementation satisfies the same mocked interface.

- [ ] **Step 1: Write the failing test**

```ts
// web/app/api/cron/veille-articles/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/firecrawl", () => ({
  scrapeListingLinks: vi.fn(),
  scrapeArticleContent: vi.fn(),
}));
vi.mock("@/lib/resend", () => ({
  sendVeilleNotification: vi.fn().mockResolvedValue(undefined),
}));

import { scrapeListingLinks, scrapeArticleContent } from "@/lib/firecrawl";
import { sendVeilleNotification } from "@/lib/resend";
import { GET } from "./route";

function makeRequest(secret: string) {
  return new NextRequest("http://localhost:3000/api/cron/veille-articles", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/veille-articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct secret", async () => {
    const response = await GET(makeRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("inserts the first unseen article and sends the notification", async () => {
    (scrapeListingLinks as any).mockResolvedValue([{ url: "https://sikafinance.com/article-1" }]);
    (scrapeArticleContent as any).mockResolvedValue({
      title: "BRVM en hausse",
      excerpt: "Le marché progresse cette semaine.",
      publishedAt: "2026-07-13T08:00:00Z",
    });

    const selectChain = { data: [], error: null };
    const insertChain = { data: [{ id: "article-1" }], error: null };
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue(selectChain),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(insertChain),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(sendVeilleNotification).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web
npx vitest run app/api/cron/veille-articles/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 3: Implement the route**

```ts
// web/app/api/cron/veille-articles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeListingLinks, scrapeArticleContent } from "@/lib/firecrawl";
import { filterUnseenCandidates, pickMostRecentCandidate } from "@/lib/veille/articleSelection";
import { sendVeilleNotification } from "@/lib/resend";
import type { ArticleCandidate } from "@/lib/veille/types";

const SOURCES: { name: string; listingUrl: string }[] = [
  { name: "Sika Finance", listingUrl: "https://www.sikafinance.com/marches/actualites_bourse_brvm" },
  { name: "Financial Afrik", listingUrl: "https://www.financialafrik.com/?s=BRVM" },
  { name: "RichBourse", listingUrl: "https://www.richbourse.com/common/news/index" },
  { name: "BRVM.org", listingUrl: "https://www.brvm.org/fr/actualites" },
];

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceRoleClient();

  const { data: existing } = await supabase.from("veille_articles").select("source_url");
  const knownUrls = new Set((existing ?? []).map((row: any) => row.source_url as string));

  const allCandidates: ArticleCandidate[] = [];
  for (const source of SOURCES) {
    try {
      const links = await scrapeListingLinks(source.listingUrl);
      for (const link of links) {
        allCandidates.push({ url: link.url, sourceName: source.name });
      }
    } catch (err) {
      console.error(`[veille-articles] source failed: ${source.name}`, err);
    }
  }

  const unseen = filterUnseenCandidates(allCandidates, knownUrls);
  const picked = pickMostRecentCandidate(unseen);

  if (!picked) {
    return NextResponse.json({ inserted: false, reason: "no new candidates" }, { status: 200 });
  }

  const content = await scrapeArticleContent(picked.url);

  const { data: inserted, error: insertError } = await supabase
    .from("veille_articles")
    .insert({
      title: content.title,
      excerpt: content.excerpt,
      source_name: picked.sourceName,
      source_url: picked.url,
      published_at: content.publishedAt ?? new Date().toISOString(),
    })
    .select();

  if (insertError || !inserted?.[0]) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  try {
    await sendVeilleNotification({
      type: "article",
      title: content.title,
      excerpt: content.excerpt,
      url: picked.url,
    });
    await supabase
      .from("veille_articles")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", inserted[0].id);
  } catch (err) {
    console.error("[veille-articles] email send failed, will retry next cron", err);
  }

  return NextResponse.json({ inserted: true, articleId: inserted[0].id }, { status: 200 });
}
```

- [ ] **Step 4: Run test again to verify it passes**

```bash
cd web
npx vitest run app/api/cron/veille-articles/route.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/app/api/cron/veille-articles
git commit -m "feat: add articles cron route with source isolation and dedup"
```

---

### Task 13: YouTube wrapper

**Files:**
- Create: `web/lib/youtube.ts`

**Interfaces:**
- Produces: `fetchLatestVideosForChannel(channelId: string, channelName: string): Promise<VideoCandidate[]>` (uses `types.ts` from Task 11), consumed by Task 15's cron route.

- [ ] **Step 1: Implement the wrapper**

```ts
// web/lib/youtube.ts
import type { VideoCandidate } from "./veille/types";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export async function fetchLatestVideosForChannel(
  channelId: string,
  channelName: string
): Promise<VideoCandidate[]> {
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "5");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube API error for channel ${channelName}: ${response.status}`);
  }

  const json = await response.json();
  const items = (json.items ?? []) as any[];

  return items.map((item) => ({
    videoId: item.id.videoId,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet.title,
    channelName,
    publishedAt: item.snippet.publishedAt,
  }));
}
```

- [ ] **Step 2: Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/lib/youtube.ts
git commit -m "feat: add YouTube Data API wrapper"
```

---

### Task 14: Video selection logic (pure, unit-tested)

**Files:**
- Create: `web/lib/veille/videoSelection.ts`
- Test: `web/lib/veille/videoSelection.test.ts`

**Interfaces:**
- Produces:
  - `filterUnseenVideos(candidates: VideoCandidate[], knownVideoIds: Set<string>): VideoCandidate[]`
  - `pickMostRecentVideo(candidates: VideoCandidate[]): VideoCandidate | null` (sorts by `publishedAt` descending, since candidates come from multiple channels and aren't pre-merged chronologically)
- Consumed by Task 15's cron route.

- [ ] **Step 1: Write the failing tests**

```ts
// web/lib/veille/videoSelection.test.ts
import { describe, it, expect } from "vitest";
import { filterUnseenVideos, pickMostRecentVideo } from "./videoSelection";
import type { VideoCandidate } from "./types";

const makeCandidate = (overrides: Partial<VideoCandidate>): VideoCandidate => ({
  videoId: "abc",
  url: "https://youtube.com/watch?v=abc",
  title: "Titre",
  channelName: "Sikarium",
  publishedAt: "2026-07-10T00:00:00Z",
  ...overrides,
});

describe("filterUnseenVideos", () => {
  it("removes videos whose id is already known", () => {
    const candidates = [makeCandidate({ videoId: "known" }), makeCandidate({ videoId: "new" })];
    const known = new Set(["known"]);
    expect(filterUnseenVideos(candidates, known)).toEqual([makeCandidate({ videoId: "new" })]);
  });
});

describe("pickMostRecentVideo", () => {
  it("picks the video with the latest publishedAt across channels", () => {
    const older = makeCandidate({ videoId: "older", publishedAt: "2026-07-01T00:00:00Z" });
    const newer = makeCandidate({ videoId: "newer", publishedAt: "2026-07-12T00:00:00Z" });
    expect(pickMostRecentVideo([older, newer])).toEqual(newer);
  });

  it("returns null when there are no candidates", () => {
    expect(pickMostRecentVideo([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/veille/videoSelection.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the selection logic**

```ts
// web/lib/veille/videoSelection.ts
import type { VideoCandidate } from "./types";

export function filterUnseenVideos(
  candidates: VideoCandidate[],
  knownVideoIds: Set<string>
): VideoCandidate[] {
  return candidates.filter((candidate) => !knownVideoIds.has(candidate.videoId));
}

export function pickMostRecentVideo(candidates: VideoCandidate[]): VideoCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )[0];
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/veille/videoSelection.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/veille/videoSelection.ts web/lib/veille/videoSelection.test.ts
git commit -m "feat: add pure video selection/dedup logic with tests"
```

---

### Task 15: Videos cron route

**Files:**
- Create: `web/app/api/cron/veille-videos/route.ts`
- Test: `web/app/api/cron/veille-videos/route.test.ts`

**Interfaces:**
- Consumes: `fetchLatestVideosForChannel` (Task 13), `filterUnseenVideos`, `pickMostRecentVideo` (Task 14), `sendVeilleNotification` (Task 17, mocked here per the same sequencing note as Task 12).
- Produces: `GET` handler for `/api/cron/veille-videos`, same `CRON_SECRET` auth as Task 12.

- [ ] **Step 1: Write the failing test**

```ts
// web/app/api/cron/veille-videos/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/youtube", () => ({
  fetchLatestVideosForChannel: vi.fn(),
}));
vi.mock("@/lib/resend", () => ({
  sendVeilleNotification: vi.fn().mockResolvedValue(undefined),
}));

import { fetchLatestVideosForChannel } from "@/lib/youtube";
import { sendVeilleNotification } from "@/lib/resend";
import { GET } from "./route";

function makeRequest(secret: string) {
  return new NextRequest("http://localhost:3000/api/cron/veille-videos", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/veille-videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct secret", async () => {
    const response = await GET(makeRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("inserts the most recent unseen video and sends the notification", async () => {
    (fetchLatestVideosForChannel as any).mockResolvedValue([
      {
        videoId: "vid-1",
        url: "https://youtube.com/watch?v=vid-1",
        title: "Analyse BRVM",
        channelName: "Sikarium",
        publishedAt: "2026-07-13T08:00:00Z",
      },
    ]);

    mockFrom.mockImplementation((table: string) => {
      if (table === "veille_youtube_channels") {
        return { select: vi.fn().mockResolvedValue({ data: [{ channel_id: "c1", channel_name: "Sikarium" }], error: null }) };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: "video-1" }], error: null }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(sendVeilleNotification).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web
npx vitest run app/api/cron/veille-videos/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 3: Implement the route**

```ts
// web/app/api/cron/veille-videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchLatestVideosForChannel } from "@/lib/youtube";
import { filterUnseenVideos, pickMostRecentVideo } from "@/lib/veille/videoSelection";
import { sendVeilleNotification } from "@/lib/resend";
import type { VideoCandidate } from "@/lib/veille/types";

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceRoleClient();

  const { data: channels } = await supabase
    .from("veille_youtube_channels")
    .select("channel_id, channel_name")
    .eq("active", true);

  const allCandidates: VideoCandidate[] = [];
  for (const channel of channels ?? []) {
    try {
      const videos = await fetchLatestVideosForChannel(channel.channel_id, channel.channel_name);
      allCandidates.push(...videos);
    } catch (err) {
      console.error(`[veille-videos] channel failed: ${channel.channel_name}`, err);
    }
  }

  const { data: existing } = await supabase.from("veille_videos").select("youtube_video_id");
  const knownIds = new Set((existing ?? []).map((row: any) => row.youtube_video_id as string));

  const unseen = filterUnseenVideos(allCandidates, knownIds);
  const picked = pickMostRecentVideo(unseen);

  if (!picked) {
    return NextResponse.json({ inserted: false, reason: "no new candidates" }, { status: 200 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("veille_videos")
    .insert({
      title: picked.title,
      youtube_url: picked.url,
      youtube_video_id: picked.videoId,
      channel_name: picked.channelName,
      published_at: picked.publishedAt,
    })
    .select();

  if (insertError || !inserted?.[0]) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  try {
    await sendVeilleNotification({
      type: "video",
      title: picked.title,
      excerpt: `Nouvelle vidéo de ${picked.channelName}`,
      url: picked.url,
    });
    await supabase
      .from("veille_videos")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", inserted[0].id);
  } catch (err) {
    console.error("[veille-videos] email send failed, will retry next cron", err);
  }

  return NextResponse.json({ inserted: true, videoId: inserted[0].id }, { status: 200 });
}
```

- [ ] **Step 4: Run test again to verify it passes**

```bash
cd web
npx vitest run app/api/cron/veille-videos/route.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/app/api/cron/veille-videos
git commit -m "feat: add videos cron route with multi-channel selection and dedup"
```

---

### Task 16: Vercel Cron configuration

**Files:**
- Create: `web/vercel.json`

**Interfaces:**
- Produces: scheduled triggers wired to Tasks 12 and 15's routes. (Vercel Cron does not send the `Authorization` header automatically for custom secrets on Hobby — this plan uses Vercel's own cron auth: Vercel automatically sends a `Authorization: Bearer $CRON_SECRET` header when `CRON_SECRET` is set as a project env var, per Vercel's convention. No extra code needed beyond what Tasks 12/15 already check.)

- [ ] **Step 1: Write the cron config**

```json
{
  "crons": [
    { "path": "/api/cron/veille-articles", "schedule": "0 8 * * 1,4" },
    { "path": "/api/cron/veille-videos", "schedule": "0 8 * * 2,5" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add web/vercel.json
git commit -m "chore: configure Vercel Cron schedule for Veille scraping"
```

---

### Task 17: Resend email notification

**Files:**
- Create: `web/emails/VeilleNotification.tsx`
- Create: `web/lib/resend.ts`
- Test: `web/lib/resend.test.ts`

**Interfaces:**
- Produces: `sendVeilleNotification(input: { type: "article" | "video"; title: string; excerpt: string; url: string }): Promise<void>` — this is the exact function Tasks 12 and 15 already import and mock.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/resend.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockSend = vi.fn().mockResolvedValue({ data: [{ id: "email-1" }], error: null });

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ batch: { send: mockSend } })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { sendVeilleNotification } from "./resend";

describe("sendVeilleNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ email: "a@b.com" }, { email: "c@d.com" }],
        error: null,
      }),
    });
  });

  it("sends one personalized email per active subscriber via batch", async () => {
    await sendVeilleNotification({
      type: "article",
      title: "BRVM en hausse",
      excerpt: "Le marché progresse.",
      url: "https://example.com/article",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const batch = mockSend.mock.calls[0][0];
    expect(batch).toHaveLength(2);
    expect(batch[0].to).toEqual(["a@b.com"]);
    expect(batch[1].to).toEqual(["c@d.com"]);
    expect(batch[0].subject).toContain("BRVM en hausse");
    // Each recipient gets a distinct unsubscribe link tied to their own email.
    expect(batch[0].html).not.toEqual(batch[1].html);
  });

  it("does nothing when there are no active subscribers", async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) });

    await sendVeilleNotification({
      type: "video",
      title: "Analyse BRVM",
      excerpt: "Nouvelle vidéo",
      url: "https://youtube.com/watch?v=1",
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web
npx vitest run lib/resend.test.ts
```

Expected: FAIL — `./resend` doesn't exist.

- [ ] **Step 3: Build the email template**

```tsx
// web/emails/VeilleNotification.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Link } from "@react-email/components";

interface VeilleNotificationEmailProps {
  title: string;
  excerpt: string;
  url: string;
  unsubscribeUrl: string;
}

export function VeilleNotificationEmail({
  title,
  excerpt,
  url,
  unsubscribeUrl,
}: VeilleNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "sans-serif", color: "#111110" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h2">{title}</Heading>
          <Text>{excerpt}</Text>
          <Button
            href={url}
            style={{ backgroundColor: "#111110", color: "#ffffff", padding: "12px 20px", borderRadius: "8px" }}
          >
            Lire sur l'app
          </Button>
          <Text style={{ marginTop: "32px", fontSize: "12px", color: "#63635c" }}>
            <Link href={unsubscribeUrl}>Se désabonner</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Implement the send function**

```ts
// web/lib/resend.ts
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { VeilleNotificationEmail } from "@/emails/VeilleNotification";
import { createUnsubscribeToken } from "@/lib/unsubscribeToken";

interface NotificationInput {
  type: "article" | "video";
  title: string;
  excerpt: string;
  url: string;
}

export async function sendVeilleNotification(input: NotificationInput): Promise<void> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: subscribers } = await supabase
    .from("veille_subscribers")
    .select("email")
    .is("unsubscribed_at", null);

  if (!subscribers || subscribers.length === 0) {
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const label = input.type === "article" ? "Nouvel article" : "Nouvelle vidéo";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Each recipient gets their own unsubscribe token, so one send never affects
  // another subscriber and no email exposes the others' addresses in "to".
  const emails = await Promise.all(
    subscribers.map(async (subscriber: any) => {
      const token = createUnsubscribeToken(subscriber.email);
      const html = await render(
        VeilleNotificationEmail({
          title: input.title,
          excerpt: input.excerpt,
          url: input.url,
          unsubscribeUrl: `${appUrl}/veille/unsubscribe?token=${token}`,
        })
      );
      return {
        from: "Veille.BRVM <veille@brvm-app.com>",
        to: [subscriber.email as string],
        subject: `${label} Veille.BRVM : ${input.title}`,
        html,
      };
    })
  );

  await resend.batch.send(emails);
}
```

- [ ] **Step 5: Add the unsubscribe token helper (needed by Step 4)**

```ts
// web/lib/unsubscribeToken.ts
import { createHmac } from "crypto";

export function createUnsubscribeToken(email: string): string {
  const hmac = createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!);
  hmac.update(email);
  const signature = hmac.digest("hex");
  return Buffer.from(`${email}:${signature}`).toString("base64url");
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [email, signature] = decoded.split(":");
    const expected = createUnsubscribeToken(email).split(":")[0];
    return signature && createUnsubscribeToken(email) === token ? email : null;
  } catch {
    return null;
  }
}
```

Note: `verifyUnsubscribeToken` re-derives the token from the email and compares it to the one supplied — this is exercised end-to-end in Task 18.

- [ ] **Step 6: Run test again to verify it passes**

```bash
cd web
npx vitest run lib/resend.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add web/emails/VeilleNotification.tsx web/lib/resend.ts web/lib/resend.test.ts web/lib/unsubscribeToken.ts
git commit -m "feat: add Resend email notification with unsubscribe token"
```

---

### Task 18: Email subscription + unsubscribe flow

**Files:**
- Create: `web/app/api/veille/subscribe/route.ts`
- Create: `web/app/api/veille/unsubscribe/route.ts`
- Create: `web/app/veille/unsubscribe/page.tsx`
- Create: `web/components/veille/SubscribeForm.tsx`
- Test: `web/app/api/veille/subscribe/route.test.ts`
- Test: `web/lib/unsubscribeToken.test.ts`

**Interfaces:**
- Consumes: `createUnsubscribeToken`/`verifyUnsubscribeToken` (Task 17).
- Produces: `POST /api/veille/subscribe` (body `{ email }`), `POST /api/veille/unsubscribe` (body `{ token }`), `<SubscribeForm />` component used on the Veille page (Task 21).

- [ ] **Step 1: Write the failing token round-trip test**

```ts
// web/lib/unsubscribeToken.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribeToken";

describe("unsubscribe token", () => {
  beforeAll(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
  });

  it("verifies a token it created", () => {
    const token = createUnsubscribeToken("a@b.com");
    expect(verifyUnsubscribeToken(token)).toBe("a@b.com");
  });

  it("rejects a tampered token", () => {
    const token = createUnsubscribeToken("a@b.com");
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails or reveals the bug**

```bash
cd web
npx vitest run lib/unsubscribeToken.test.ts
```

Expected: the "verifies a token it created" case passes, but re-inspect `verifyUnsubscribeToken` from Task 17 — it compares `createUnsubscribeToken(email) === token`, which is correct since both sides are deterministic. Confirm PASS for both cases; if the tampered case fails, fix `verifyUnsubscribeToken` to always compare full tokens (not just the signature half) before proceeding.

- [ ] **Step 3: Write the failing subscribe route test**

```ts
// web/app/api/veille/subscribe/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/veille/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/veille/subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a new subscriber", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const response = await POST(makeRequest({ email: "new@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.alreadySubscribed).toBe(false);
  });

  it("reports alreadySubscribed instead of erroring on duplicates", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ email: "existing@example.com" }], error: null }),
      }),
      insert: vi.fn(),
    });

    const response = await POST(makeRequest({ email: "existing@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.alreadySubscribed).toBe(true);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

```bash
cd web
npx vitest run app/api/veille/subscribe/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 5: Implement the subscribe route**

```ts
// web/app/api/veille/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(request: NextRequest) {
  const { email } = (await request.json()) as { email: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const supabase = serviceRoleClient();
  const { data: existing } = await supabase.from("veille_subscribers").select("email").eq("email", email);

  if (existing && existing.length > 0) {
    return NextResponse.json({ alreadySubscribed: true }, { status: 200 });
  }

  const { error } = await supabase.from("veille_subscribers").insert({ email });
  if (error) {
    return NextResponse.json({ error: "Inscription impossible." }, { status: 500 });
  }

  return NextResponse.json({ alreadySubscribed: false }, { status: 200 });
}
```

- [ ] **Step 6: Implement the unsubscribe route**

```ts
// web/app/api/veille/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

export async function POST(request: NextRequest) {
  const { token } = (await request.json()) as { token: string };
  const email = verifyUnsubscribeToken(token);

  if (!email) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await supabase
    .from("veille_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email);

  return NextResponse.json({ success: true }, { status: 200 });
}
```

- [ ] **Step 7: Build the unsubscribe page**

```tsx
// web/app/veille/unsubscribe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    fetch("/api/veille/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "done" : "error"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-2 p-6 text-center">
      {status === "loading" && <p>Désabonnement en cours...</p>}
      {status === "done" && <p>Vous avez été désabonné des notifications Veille.BRVM.</p>}
      {status === "error" && <p className="text-market-down">Lien de désabonnement invalide.</p>}
    </div>
  );
}
```

- [ ] **Step 8: Build the subscribe form component**

```tsx
// web/components/veille/SubscribeForm.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/veille/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    const json = await response.json();
    setStatus(json.alreadySubscribed ? "already" : "done");
  }

  return (
    <Card padding={20}>
      <p className="font-semibold text-text-primary">Restez informé</p>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <div className="flex-1">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="s" disabled={status === "loading"}>
          S'abonner
        </Button>
      </form>
      {status === "done" && <p className="mt-2 text-sm text-market-up">Inscription confirmée !</p>}
      {status === "already" && <p className="mt-2 text-sm text-text-tertiary">Vous êtes déjà abonné.</p>}
      {status === "error" && <p className="mt-2 text-sm text-market-down">Une erreur est survenue.</p>}
    </Card>
  );
}
```

- [ ] **Step 9: Run all new tests to verify they pass**

```bash
cd web
npx vitest run lib/unsubscribeToken.test.ts app/api/veille/subscribe/route.test.ts
```

Expected: PASS (4 tests total).

- [ ] **Step 10: Commit**

```bash
git add web/app/api/veille/subscribe web/app/api/veille/unsubscribe web/app/veille/unsubscribe web/components/veille/SubscribeForm.tsx web/lib/unsubscribeToken.test.ts web/app/api/veille/subscribe/route.test.ts
git commit -m "feat: add email subscribe/unsubscribe flow for Veille"
```

---

### Task 19: Favorite toggle logic + API route

**Files:**
- Create: `web/app/api/veille/favorites/route.ts`
- Create: `web/components/veille/FavoriteButton.tsx`
- Test: `web/app/api/veille/favorites/route.test.ts`

**Interfaces:**
- Produces: `POST /api/veille/favorites` (body `{ contentType: "article" | "video"; contentId: string }`, requires session cookie) — toggles: inserts if absent, deletes if present, returns `{ favorited: boolean }`.
- `<FavoriteButton contentType contentId initiallyFavorited loggedIn />` used by Task 20's cards.

- [ ] **Step 1: Write the failing test**

```ts
// web/app/api/veille/favorites/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/veille/favorites", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/veille/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(makeRequest({ contentType: "article", contentId: "a1" }));
    expect(response.status).toBe(401);
  });

  it("adds a favorite when none exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const response = await POST(makeRequest({ contentType: "article", contentId: "a1" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.favorited).toBe(true);
  });

  it("removes the favorite when it already exists (toggle)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: "fav-1" }], error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });

    const response = await POST(makeRequest({ contentType: "article", contentId: "a1" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.favorited).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web
npx vitest run app/api/veille/favorites/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 3: Implement the route**

```ts
// web/app/api/veille/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { contentType, contentId } = (await request.json()) as {
    contentType: "article" | "video";
    contentId: string;
  };

  const { data: existing } = await supabase
    .from("veille_favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (existing && existing.length > 0) {
    await supabase.from("veille_favorites").delete().eq("id", existing[0].id);
    return NextResponse.json({ favorited: false }, { status: 200 });
  }

  await supabase.from("veille_favorites").insert({
    profile_id: user.id,
    content_type: contentType,
    content_id: contentId,
  });
  return NextResponse.json({ favorited: true }, { status: 200 });
}
```

- [ ] **Step 4: Run test again to verify it passes**

```bash
cd web
npx vitest run app/api/veille/favorites/route.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Build the FavoriteButton component**

```tsx
// web/components/veille/FavoriteButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface FavoriteButtonProps {
  contentType: "article" | "video";
  contentId: string;
  initiallyFavorited: boolean;
  loggedIn: boolean;
}

export function FavoriteButton({
  contentType,
  contentId,
  initiallyFavorited,
  loggedIn,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }

    const previous = favorited;
    setFavorited(!previous);
    setPending(true);

    const response = await fetch("/api/veille/favorites", {
      method: "POST",
      body: JSON.stringify({ contentType, contentId }),
    });

    if (!response.ok) {
      setFavorited(previous);
    }
    setPending(false);
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} aria-label="Favori">
      <Icon
        name="star"
        size={18}
        color={favorited ? "var(--action-primary)" : "var(--text-tertiary)"}
      />
    </button>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/app/api/veille/favorites web/components/veille/FavoriteButton.tsx
git commit -m "feat: add favorite toggle route and button component"
```

---

### Task 20: Article and video cards

**Files:**
- Create: `web/components/veille/ArticleCard.tsx`
- Create: `web/components/veille/VideoCard.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge` (Task 4), `FavoriteButton` (Task 19).
- Produces: `<ArticleCard article loggedIn isFavorited />`, `<VideoCard video loggedIn isFavorited />` — used by Task 21's feed page.

- [ ] **Step 1: Article card**

```tsx
// web/components/veille/ArticleCard.tsx
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/veille/FavoriteButton";

export interface ArticleCardData {
  id: string;
  title: string;
  excerpt: string;
  sourceName: string;
  publishedAt: string;
}

function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
}

export function ArticleCard({
  article,
  loggedIn,
  isFavorited,
}: {
  article: ArticleCardData;
  loggedIn: boolean;
  isFavorited: boolean;
}) {
  return (
    <Card padding={16}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text-primary">{article.title}</p>
          <p className="mt-1 text-sm text-text-tertiary">{article.excerpt}</p>
          <p className="mt-2 text-xs text-text-tertiary">
            {article.sourceName} · {new Date(article.publishedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isNew(article.publishedAt) && <Badge tone="success">Nouveau</Badge>}
          <FavoriteButton
            contentType="article"
            contentId={article.id}
            initiallyFavorited={isFavorited}
            loggedIn={loggedIn}
          />
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Video card with inline iframe**

```tsx
// web/components/veille/VideoCard.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/veille/FavoriteButton";

export interface VideoCardData {
  id: string;
  title: string;
  youtubeVideoId: string;
  channelName: string;
  publishedAt: string;
}

function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
}

export function VideoCard({
  video,
  loggedIn,
  isFavorited,
}: {
  video: VideoCardData;
  loggedIn: boolean;
  isFavorited: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <Card padding={16}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-text-primary">{video.title}</p>
          <p className="mt-2 text-xs text-text-tertiary">
            {video.channelName} · {new Date(video.publishedAt).toLocaleDateString("fr-FR")}
          </p>
          {playing ? (
            <div className="mt-3 aspect-video w-full overflow-hidden rounded-m">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="mt-3 aspect-video w-full rounded-m bg-black/5 bg-cover bg-center"
              style={{
                backgroundImage: `url(https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg)`,
              }}
              aria-label={`Lire la vidéo : ${video.title}`}
            />
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {isNew(video.publishedAt) && <Badge tone="success">Nouveau</Badge>}
          <FavoriteButton
            contentType="video"
            contentId={video.id}
            initiallyFavorited={isFavorited}
            loggedIn={loggedIn}
          />
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/components/veille/ArticleCard.tsx web/components/veille/VideoCard.tsx
git commit -m "feat: add article and video cards with inline YouTube playback"
```

---

### Task 21: Veille.BRVM feed page

**Files:**
- Create: `web/components/veille/VeilleTabs.tsx`
- Create: `web/app/veille/page.tsx`

**Interfaces:**
- Consumes: `ArticleCard`/`VideoCard` (Task 20), `SubscribeForm` (Task 18), `createServerSupabaseClient` (Task 5).
- Produces: the public `/veille` route with 3 tabs.

- [ ] **Step 1: Tabs component**

```tsx
// web/components/veille/VeilleTabs.tsx
"use client";

import { useState } from "react";

export type VeilleTab = "articles" | "videos" | "favorites";

export function VeilleTabs({
  active,
  onChange,
}: {
  active: VeilleTab;
  onChange: (tab: VeilleTab) => void;
}) {
  const tabs: { id: VeilleTab; label: string }[] = [
    { id: "articles", label: "Articles" },
    { id: "videos", label: "Vidéos" },
    { id: "favorites", label: "Favoris" },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            active === tab.id ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Feed page (server component fetching data, client sub-component for tab state)**

```tsx
// web/app/veille/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VeilleFeedClient } from "./VeilleFeedClient";

export default async function VeillePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: articles } = await supabase
    .from("veille_articles")
    .select("id, title, excerpt, source_name, published_at")
    .order("published_at", { ascending: false });

  const { data: videos } = await supabase
    .from("veille_videos")
    .select("id, title, youtube_video_id, channel_name, published_at")
    .order("published_at", { ascending: false });

  let favoriteIds = new Set<string>();
  if (user) {
    const { data: favorites } = await supabase
      .from("veille_favorites")
      .select("content_id")
      .eq("profile_id", user.id);
    favoriteIds = new Set((favorites ?? []).map((f: any) => f.content_id as string));
  }

  return (
    <VeilleFeedClient
      loggedIn={!!user}
      favoriteIds={Array.from(favoriteIds)}
      articles={(articles ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        sourceName: a.source_name,
        publishedAt: a.published_at,
      }))}
      videos={(videos ?? []).map((v: any) => ({
        id: v.id,
        title: v.title,
        youtubeVideoId: v.youtube_video_id,
        channelName: v.channel_name,
        publishedAt: v.published_at,
      }))}
    />
  );
}
```

- [ ] **Step 3: Client component holding tab state**

```tsx
// web/app/veille/VeilleFeedClient.tsx
"use client";

import { useState } from "react";
import { VeilleTabs, type VeilleTab } from "@/components/veille/VeilleTabs";
import { ArticleCard, type ArticleCardData } from "@/components/veille/ArticleCard";
import { VideoCard, type VideoCardData } from "@/components/veille/VideoCard";
import { SubscribeForm } from "@/components/veille/SubscribeForm";
import Link from "next/link";

export function VeilleFeedClient({
  loggedIn,
  favoriteIds,
  articles,
  videos,
}: {
  loggedIn: boolean;
  favoriteIds: string[];
  articles: ArticleCardData[];
  videos: VideoCardData[];
}) {
  const [tab, setTab] = useState<VeilleTab>("articles");
  const favoriteSet = new Set(favoriteIds);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Veille.BRVM
      </h1>

      <SubscribeForm />

      <VeilleTabs active={tab} onChange={setTab} />

      {tab === "articles" && (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              loggedIn={loggedIn}
              isFavorited={favoriteSet.has(article.id)}
            />
          ))}
        </div>
      )}

      {tab === "videos" && (
        <div className="flex flex-col gap-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              loggedIn={loggedIn}
              isFavorited={favoriteSet.has(video.id)}
            />
          ))}
        </div>
      )}

      {tab === "favorites" && (
        <FavoritesTab loggedIn={loggedIn} articles={articles} videos={videos} favoriteSet={favoriteSet} />
      )}
    </div>
  );
}

function FavoritesTab({
  loggedIn,
  articles,
  videos,
  favoriteSet,
}: {
  loggedIn: boolean;
  articles: ArticleCardData[];
  videos: VideoCardData[];
  favoriteSet: Set<string>;
}) {
  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-m border border-border-subtle p-8 text-center">
        <p className="text-text-secondary">Connectez-vous pour voir vos favoris.</p>
        <Link href="/login" className="font-semibold text-text-primary underline">
          Se connecter
        </Link>
      </div>
    );
  }

  const favoritedArticles = articles.filter((a) => favoriteSet.has(a.id));
  const favoritedVideos = videos.filter((v) => favoriteSet.has(v.id));

  return (
    <div className="flex flex-col gap-3">
      {favoritedArticles.map((article) => (
        <ArticleCard key={article.id} article={article} loggedIn={loggedIn} isFavorited />
      ))}
      {favoritedVideos.map((video) => (
        <VideoCard key={video.id} video={video} loggedIn={loggedIn} isFavorited />
      ))}
      {favoritedArticles.length === 0 && favoritedVideos.length === 0 && (
        <p className="text-center text-text-tertiary">Aucun favori pour l'instant.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/veille`, confirm the 3 tabs render (empty lists are expected until the cron jobs have run at least once).

- [ ] **Step 5: Commit**

```bash
git add web/components/veille/VeilleTabs.tsx web/app/veille/page.tsx web/app/veille/VeilleFeedClient.tsx
git commit -m "feat: add Veille.BRVM feed page with articles/videos/favorites tabs"
```

---

### Task 22: Vitest configuration and full test run

**Files:**
- Create: `web/vitest.config.ts`

**Interfaces:**
- Produces: a single `npm test` command that runs every test file added in Tasks 6–19.

- [ ] **Step 1: Write the config**

```ts
// web/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Add the `test` script**

Edit `web/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Run the full suite**

```bash
cd web
npm test
```

Expected: all test files from Tasks 6, 7, 11, 12, 14, 15, 17, 18, 19 pass (≥ 20 tests total).

- [ ] **Step 4: Commit**

```bash
git add web/vitest.config.ts web/package.json
git commit -m "chore: wire up Vitest configuration and npm test script"
```

---

## Post-plan checklist (not automated — do manually before going live)

- Look up real YouTube `channel_id` values for Sikarium and any other curated channels, insert them into `veille_youtube_channels`.
- Create Supabase project, populate `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `web/.env.local` and in Vercel's project env vars.
- Create a Resend account + verified sending domain, populate `RESEND_API_KEY`.
- Generate random values for `CRON_SECRET` and `UNSUBSCRIBE_SECRET` (e.g. `openssl rand -hex 32`), set them in `web/.env.local` and Vercel.
- Rotate the Firecrawl and YouTube API keys that were pasted in plaintext during the design conversation, per the earlier security note.
- Deploy to Vercel and confirm the cron jobs appear under Project Settings → Cron Jobs.
