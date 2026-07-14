# Bottom Navigation + Login Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent bottom tab bar (Accueil / Veille / DiviAlerte / Gestia) across the app, and round out the login page with a contextual redirect message, a signup link, and a full forgot/reset-password flow.

**Architecture:** A pure, unit-tested `lib/nav.ts` module drives a thin client-side `BottomNav` component rendered once from the root layout; visibility and the active tab are derived from the current pathname, so no new state or context is needed. The login flow gains two new standalone pages (`/forgot-password`, `/reset-password`) that reuse the existing Supabase browser client and `Input`/`Button` primitives, plus a small extracted `validatePassword` helper shared between signup and reset.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, `@supabase/supabase-js` (`resetPasswordForEmail`, `updateUser`), Vitest.

## Global Constraints

- Package manager: npm. Run all commands from `web/`.
- UI components (pages, `BottomNav`) are not unit-tested per existing project convention — only pure logic (`lib/*.ts`) gets tests. Verify UI changes with a manual `npm run dev` check.
- French copy throughout, matching existing tone (e.g. "Se connecter", "Déverrouiller").
- Reuse existing design tokens/components (`Icon`, `Input`, `Button`, `BackHomeLink`) — no new colors or spacing values.

---

## File Structure Overview

```
web/
  lib/
    nav.ts                          # pure: NAV_ITEMS, isNavHidden, getActiveNavId
    nav.test.ts
    redirectMessage.ts              # pure: redirectMessage(redirectTo)
    redirectMessage.test.ts
    validation.ts                   # modified: extract validatePassword
    validation.test.ts              # modified: add validatePassword cases
  components/
    ui/
      BottomNav.tsx                 # new
  app/
    layout.tsx                      # modified: render <BottomNav />
    login/page.tsx                  # modified: contextual message + links
    forgot-password/page.tsx        # new
    reset-password/page.tsx         # new
    veille/VeilleFeedClient.tsx     # modified: remove BackHomeLink (covered by BottomNav)
    divialerte/page.tsx             # modified: remove BackHomeLink
    gestia/page.tsx                 # modified: remove BackHomeLink
```

---

### Task 1: Bottom nav pure logic

**Files:**
- Create: `web/lib/nav.ts`
- Test: `web/lib/nav.test.ts`

**Interfaces:**
- Produces: `NavItem { id: string; href: string; label: string; icon: IconName }`, `NAV_ITEMS: NavItem[]`, `isNavHidden(pathname: string): boolean`, `getActiveNavId(pathname: string): string | null` — all consumed by Task 2's `BottomNav`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/lib/nav.test.ts
import { describe, it, expect } from "vitest";
import { isNavHidden, getActiveNavId } from "./nav";

describe("isNavHidden", () => {
  it("hides the bar on standalone auth/unsubscribe routes", () => {
    expect(isNavHidden("/login")).toBe(true);
    expect(isNavHidden("/signup")).toBe(true);
    expect(isNavHidden("/veille/unsubscribe")).toBe(true);
    expect(isNavHidden("/forgot-password")).toBe(true);
    expect(isNavHidden("/reset-password")).toBe(true);
  });

  it("shows the bar everywhere else", () => {
    expect(isNavHidden("/")).toBe(false);
    expect(isNavHidden("/veille")).toBe(false);
    expect(isNavHidden("/divialerte")).toBe(false);
    expect(isNavHidden("/gestia")).toBe(false);
  });
});

describe("getActiveNavId", () => {
  it("matches accueil only on the exact root path", () => {
    expect(getActiveNavId("/")).toBe("accueil");
  });

  it("matches veille by prefix", () => {
    expect(getActiveNavId("/veille")).toBe("veille");
  });

  it("returns null on the excluded unsubscribe route", () => {
    expect(getActiveNavId("/veille/unsubscribe")).toBeNull();
  });

  it("matches divialerte and gestia", () => {
    expect(getActiveNavId("/divialerte")).toBe("divialerte");
    expect(getActiveNavId("/gestia")).toBe("gestia");
  });

  it("returns null for an unrelated path", () => {
    expect(getActiveNavId("/foo")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/nav.test.ts
```

Expected: FAIL — `./nav` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/nav.ts
import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "accueil", href: "/", label: "Accueil", icon: "home" },
  { id: "veille", href: "/veille", label: "Veille", icon: "telescope" },
  { id: "divialerte", href: "/divialerte", label: "DiviAlerte", icon: "bell" },
  { id: "gestia", href: "/gestia", label: "Gestia", icon: "lock" },
];

const HIDDEN_ROUTES = new Set([
  "/login",
  "/signup",
  "/veille/unsubscribe",
  "/forgot-password",
  "/reset-password",
]);

export function isNavHidden(pathname: string): boolean {
  return HIDDEN_ROUTES.has(pathname);
}

export function getActiveNavId(pathname: string): string | null {
  if (isNavHidden(pathname)) {
    return null;
  }
  if (pathname === "/") {
    return "accueil";
  }
  const match = NAV_ITEMS.find((item) => item.id !== "accueil" && pathname.startsWith(item.href));
  return match ? match.id : null;
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/nav.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/nav.ts web/lib/nav.test.ts
git commit -m "feat: add pure bottom-nav visibility/active-tab logic with tests"
```

---

### Task 2: BottomNav component wired into the root layout

**Files:**
- Create: `web/components/ui/BottomNav.tsx`
- Modify: `web/app/layout.tsx`
- Modify: `web/app/veille/VeilleFeedClient.tsx` (remove `BackHomeLink`, now covered by the "Accueil" tab)
- Modify: `web/app/divialerte/page.tsx` (remove `BackHomeLink`)
- Modify: `web/app/gestia/page.tsx` (remove `BackHomeLink`)

**Interfaces:**
- Consumes: `NAV_ITEMS`, `isNavHidden`, `getActiveNavId` (Task 1), `Icon` (existing).
- Produces: `<BottomNav />`, rendered unconditionally from `layout.tsx` — renders `null` on the 5 hidden routes.

- [ ] **Step 1: Implement the component**

```tsx
// web/components/ui/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { NAV_ITEMS, isNavHidden, getActiveNavId } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  if (isNavHidden(pathname)) {
    return null;
  }

  const activeId = getActiveNavId(pathname);

  return (
    <>
      <div className="h-16" />
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 border-t border-border-subtle bg-surface-card">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold",
                isActive ? "text-action-primary" : "text-text-tertiary",
              ].join(" ")}
            >
              <Icon name={item.icon} size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Render it from the root layout**

```tsx
// web/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "Investir à la BRVM",
  description: "Veille, alertes de dividendes et gestion de portefeuille pour la BRVM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-surface-app font-body text-text-primary">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Remove the now-redundant `BackHomeLink` from pages the bottom nav already covers**

```tsx
// web/app/veille/VeilleFeedClient.tsx
// Remove this import line:
import { BackHomeLink } from "@/components/ui/BackHomeLink";
// Remove this line from the JSX, right before the <h1>:
<BackHomeLink />
```

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

- [ ] **Step 4: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/`, `/veille`, `/divialerte`, `/gestia` — confirm the 4-tab bar renders at the bottom on every one, with the current section highlighted. Visit `/login` and `/signup` — confirm the bar is absent (only the `BackHomeLink` shows).

- [ ] **Step 5: Commit**

```bash
git add web/components/ui/BottomNav.tsx web/app/layout.tsx web/app/veille/VeilleFeedClient.tsx web/app/divialerte/page.tsx web/app/gestia/page.tsx
git commit -m "feat: add persistent bottom navigation bar"
```

---

### Task 3: Extract `validatePassword`

**Files:**
- Modify: `web/lib/validation.ts`
- Modify: `web/lib/validation.test.ts`

**Interfaces:**
- Produces: `validatePassword(password: string): string | null` — consumed by Task 5's reset-password page. `validateSignupForm` keeps its existing signature and behavior.

- [ ] **Step 1: Write the failing test**

Add to the existing file:

```ts
// web/lib/validation.test.ts — add this describe block
import { describe, it, expect } from "vitest";
import { validateSignupForm, validatePassword } from "./validation";

// ... existing validateSignupForm describe block stays unchanged ...

describe("validatePassword", () => {
  it("rejects a password shorter than 8 characters", () => {
    expect(validatePassword("short")).toBe("Le mot de passe doit contenir au moins 8 caractères.");
  });

  it("accepts a password of 8 characters or more", () => {
    expect(validatePassword("secret123")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
cd web
npx vitest run lib/validation.test.ts
```

Expected: FAIL — `validatePassword` is not exported.

- [ ] **Step 3: Extract the function**

```ts
// web/lib/validation.ts
export interface SignupInput {
  nom: string;
  prenom: string;
  email: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  return null;
}

export function validateSignupForm(input: SignupInput): string | null {
  if (!input.nom.trim()) return "Le nom est requis.";
  if (!input.prenom.trim()) return "Le prénom est requis.";
  if (!EMAIL_RE.test(input.email)) return "L'adresse email n'est pas valide.";
  return validatePassword(input.password);
}
```

- [ ] **Step 4: Run tests again to verify they all pass**

```bash
cd web
npx vitest run lib/validation.test.ts
```

Expected: PASS (6 tests — 4 existing `validateSignupForm` + 2 new `validatePassword`).

- [ ] **Step 5: Commit**

```bash
git add web/lib/validation.ts web/lib/validation.test.ts
git commit -m "refactor: extract validatePassword from validateSignupForm"
```

---

### Task 4: Forgot-password page

**Files:**
- Create: `web/app/forgot-password/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabaseClient()` (existing), `Input`/`Button`/`BackHomeLink` (existing).
- Produces: the `/forgot-password` route, linked from Task 6's login page.

- [ ] **Step 1: Build the page**

```tsx
// web/app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BackHomeLink } from "@/components/ui/BackHomeLink";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <BackHomeLink />
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Mot de passe oublié
      </h1>
      {submitted ? (
        <p className="text-text-secondary">
          Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Adresse email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </Button>
        </form>
      )}
      <Link href="/login" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
        Retour à la connexion
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/forgot-password`, submit an email, confirm the confirmation message replaces the form.

- [ ] **Step 3: Commit**

```bash
git add web/app/forgot-password
git commit -m "feat: add forgot-password page"
```

---

### Task 5: Reset-password page

**Files:**
- Create: `web/app/reset-password/page.tsx`

**Interfaces:**
- Consumes: `validatePassword` (Task 3), `createBrowserSupabaseClient()`, `Input`/`Button`/`BackHomeLink` (existing).
- Produces: the `/reset-password` route — the `redirectTo` target Task 4's page passes to Supabase.

- [ ] **Step 1: Build the page**

```tsx
// web/app/reset-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BackHomeLink } from "@/components/ui/BackHomeLink";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <BackHomeLink />
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Nouveau mot de passe
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nouveau mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-sm text-market-down">{error}</p>}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
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

Visit `http://localhost:3000/reset-password` directly (no active recovery session): submitting should call `updateUser` and surface Supabase's own error inline, without crashing. Full end-to-end check (real recovery link → this page → success) happens once `RESEND`-free SMTP is confirmed in production, per the earlier deployment checklist.

- [ ] **Step 3: Commit**

```bash
git add web/app/reset-password
git commit -m "feat: add reset-password page"
```

---

### Task 6: Login page — contextual message, signup link, forgot-password link

**Files:**
- Create: `web/lib/redirectMessage.ts`
- Test: `web/lib/redirectMessage.test.ts`
- Modify: `web/app/login/page.tsx`

**Interfaces:**
- Produces: `redirectMessage(redirectTo: string | null): string | null`, consumed by `LoginForm`.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/redirectMessage.test.ts
import { describe, it, expect } from "vitest";
import { redirectMessage } from "./redirectMessage";

describe("redirectMessage", () => {
  it("returns null when there is no redirect target", () => {
    expect(redirectMessage(null)).toBeNull();
  });

  it("explains DiviAlerte redirects", () => {
    expect(redirectMessage("/divialerte")).toBe("Connecte-toi pour accéder à DiviAlerte.");
  });

  it("explains Gestia redirects", () => {
    expect(redirectMessage("/gestia")).toBe("Connecte-toi pour accéder à Gestia.BRVM.");
  });

  it("returns null for an unrelated redirect target", () => {
    expect(redirectMessage("/veille")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web
npx vitest run lib/redirectMessage.test.ts
```

Expected: FAIL — `./redirectMessage` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/redirectMessage.ts
const REDIRECT_MESSAGES: Record<string, string> = {
  "/divialerte": "Connecte-toi pour accéder à DiviAlerte.",
  "/gestia": "Connecte-toi pour accéder à Gestia.BRVM.",
};

export function redirectMessage(redirectTo: string | null): string | null {
  if (!redirectTo) return null;
  const match = Object.keys(REDIRECT_MESSAGES).find((prefix) => redirectTo.startsWith(prefix));
  return match ? REDIRECT_MESSAGES[match] : null;
}
```

- [ ] **Step 4: Run test again to verify it passes**

```bash
cd web
npx vitest run lib/redirectMessage.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Wire it into the login page, add the signup and forgot-password links**

```tsx
// web/app/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { redirectMessage } from "@/lib/redirectMessage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BackHomeLink } from "@/components/ui/BackHomeLink";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const message = redirectMessage(searchParams.get("redirectTo"));

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
      <BackHomeLink />
      {message && <p className="text-sm text-text-secondary">{message}</p>}
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
      <Link href="/forgot-password" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
        Mot de passe oublié ?
      </Link>
      <Link href="/signup" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
        Pas de compte ? Créer un compte
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 6: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/login?redirectTo=/divialerte` — confirm the contextual message appears. Visit `http://localhost:3000/login` with no query param — confirm no message. Confirm both new links navigate correctly.

- [ ] **Step 7: Commit**

```bash
git add web/lib/redirectMessage.ts web/lib/redirectMessage.test.ts web/app/login/page.tsx
git commit -m "feat: add contextual redirect message, signup and forgot-password links to login"
```

---

## Final Verification

- [ ] **Run the full test suite**

```bash
cd web
npm test
```

Expected: all test files pass (existing 31 + 9 nav + 2 validatePassword + 4 redirectMessage = 46 tests).

- [ ] **Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Production build**

```bash
cd web
npm run build
```

Expected: build succeeds, no ESLint errors.
