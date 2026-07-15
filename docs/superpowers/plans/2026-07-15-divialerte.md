# DiviAlerte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the DiviAlerte module — a public calendar of BRVM dividend dates with per-company countdown and net-of-tax amount, a personal watchlist for logged-in users, and two email alerts (J-3 and J-1 before the ex-dividend date) per watched company.

**Architecture:** A daily cron scrapes two cross-checked sources (Sika Finance, RichBourse) into a pivot `divialerte_companies` table (auto-populated, matched by ticker or normalized name, country captured from Sika's URL suffix) and a `divialerte_dividends` table (RichBourse wins date conflicts, Sika fills gaps). A separate `divialerte_watchlist` table (per-user, like Veille's favorites) drives which users get alerted; `divialerte_alerts_sent` prevents duplicate emails. A small static IRVM rate table converts each gross dividend into a net-of-tax amount by company country. All merge/matching/alert-threshold/tax logic is pure and unit-tested; the cron route and UI are thin wiring layers, following the exact patterns already established by the Veille module.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind, `@supabase/supabase-js`, `@mendable/firecrawl-js` (already used for Veille scraping), `nodemailer` + `@react-email/render` (already used for Veille emails), Vitest.

## Global Constraints

- Package manager: npm. Run all commands from `web/`.
- UI components (pages, `WatchBell`, `DividendCard`, `DiviAlerteClient`) are not unit-tested per existing project convention — only pure logic (`lib/*.ts`) gets tests. Verify UI changes with a manual `npm run dev` check.
- French copy throughout, matching existing tone.
- Reuse existing design tokens/components (`Card`, `Badge`, `Icon`, `Button`) — no new colors or spacing values.
- No new npm dependencies — date parsing uses native `Date`, markdown table parsing uses plain string operations.
- This project has no Supabase CLI config; migrations are applied by hand in the Supabase Dashboard SQL Editor (same as `0001_init.sql` was). Task 1's last step is a manual dashboard action — there is no way to script it from this repo.
- Sources verified live on 2026-07-15: Sika Finance (`sikafinance.com/marches/dividendes`) and RichBourse (`richbourse.com/common/dividende/index`) both expose real HTML tables. BRVM.org's calendar is a yearly PDF and is NOT scraped. See `docs/superpowers/specs/2026-07-15-divialerte-design.md` section 2 for details.
- IRVM rates verified live on 2026-07-15 (see spec section 3bis): CI 10%, SN 10%, BF 12.5%, ML 7%, BJ 5%, TG 3% (individual rate). Niger and Guinée-Bissau rates are unknown and must NOT be guessed — treat as unsupported (net amount not shown).

## File Structure Overview

```
web/
  supabase/migrations/
    0002_divialerte.sql                  # new
  lib/
    divialerte/
      types.ts                           # pure: DividendRow, CompanyRecord, ResolvedDividendFields
      companyMatching.ts                 # pure: normalizeCompanyName, matchCompany
      companyMatching.test.ts
      mergeDividends.ts                  # pure: resolveDividendFields
      mergeDividends.test.ts
      dateUtils.ts                       # pure: daysUntil, deriveExerciceYear
      dateUtils.test.ts
      alertLogic.ts                      # pure: determineAlertsToSend, AlertType
      alertLogic.test.ts
      parseDividendTable.ts              # pure: parseSikaDividendsMarkdown, parseRichBourseDividendsMarkdown
      parseDividendTable.test.ts
      irvm.ts                            # pure: IRVM_RATES_BY_COUNTRY, calculateNetDividend
      irvm.test.ts
    firecrawl.ts                         # modified: add scrapeSikaDividends, scrapeRichBourseDividends
    mailer.ts                            # modified: add sendDivialerteAlert, extract createSmtpTransporter
  emails/
    DivialerteAlert.tsx                  # new
  app/
    api/
      cron/
        divialerte/
          route.ts                       # new
          route.test.ts
      divialerte/
        watchlist/
          route.ts                       # new
          route.test.ts
    divialerte/
      page.tsx                           # modified (was placeholder): server component, fetches data
      DiviAlerteClient.tsx                # new: tabs + list, client component
  components/
    divialerte/
      WatchBell.tsx                       # new: mirrors FavoriteButton
      DividendCard.tsx                    # new: mirrors ArticleCard, shows net-of-IRVM amount
```

---

### Task 1: Supabase migration

**Files:**
- Create: `web/supabase/migrations/0002_divialerte.sql`

**Interfaces:**
- Produces: tables `divialerte_companies` (with `country`), `divialerte_dividends`, `divialerte_watchlist`, `divialerte_alerts_sent`, consumed by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- web/supabase/migrations/0002_divialerte.sql

create table if not exists divialerte_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ticker text,
  country text,
  created_at timestamptz not null default now()
);

create table if not exists divialerte_dividends (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references divialerte_companies(id) on delete cascade,
  exercice_year int not null,
  montant numeric,
  rendement numeric,
  date_detachement date,
  date_paiement date,
  updated_at timestamptz not null default now(),
  unique (company_id, exercice_year)
);

create table if not exists divialerte_watchlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references divialerte_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, company_id)
);

create table if not exists divialerte_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  dividend_id uuid not null references divialerte_dividends(id) on delete cascade,
  alert_type text not null check (alert_type in ('j3', 'j1')),
  sent_at timestamptz not null default now(),
  unique (profile_id, dividend_id, alert_type)
);

alter table divialerte_companies enable row level security;
alter table divialerte_dividends enable row level security;
alter table divialerte_watchlist enable row level security;
alter table divialerte_alerts_sent enable row level security;

create policy "Public read companies" on divialerte_companies
  for select using (true);
create policy "Public read dividends" on divialerte_dividends
  for select using (true);

create policy "Users can view own watchlist" on divialerte_watchlist
  for select using (auth.uid() = profile_id);
create policy "Users can insert own watchlist" on divialerte_watchlist
  for insert with check (auth.uid() = profile_id);
create policy "Users can delete own watchlist" on divialerte_watchlist
  for delete using (auth.uid() = profile_id);
```

- [ ] **Step 2: Commit the migration file**

```bash
git add web/supabase/migrations/0002_divialerte.sql
git commit -m "feat: add DiviAlerte database migration"
```

- [ ] **Step 3: Apply the migration (manual, Supabase Dashboard)**

Open the Supabase Dashboard → SQL Editor → paste the full contents of `web/supabase/migrations/0002_divialerte.sql` → Run.

Verify by running this in the same SQL Editor:
```sql
select count(*) from divialerte_companies;
```
Expected: returns `0` with no error (table exists and is empty).

---

### Task 2: Pure logic — types + company matching

**Files:**
- Create: `web/lib/divialerte/types.ts`
- Create: `web/lib/divialerte/companyMatching.ts`
- Test: `web/lib/divialerte/companyMatching.test.ts`

**Interfaces:**
- Produces: `DividendRow` (includes `country`), `CompanyRecord` (includes `country`), `ResolvedDividendFields` (types), `normalizeCompanyName(name: string): string`, `matchCompany(row: { ticker: string | null; companyName: string }, companies: CompanyRecord[]): CompanyRecord | null` — consumed by Task 6 (parsers), Task 7 (IRVM), Task 10 (cron route).

- [ ] **Step 1: Write the types**

```ts
// web/lib/divialerte/types.ts
export interface DividendRow {
  companyName: string;
  ticker: string | null;
  country: string | null;
  montant: number | null;
  rendement: number | null;
  dateDetachement: string | null;
  datePaiement: string | null;
  sourceName: "Sika Finance" | "RichBourse";
}

export interface CompanyRecord {
  id: string;
  name: string;
  ticker: string | null;
  country: string | null;
}

export interface ResolvedDividendFields {
  montant: number | null;
  rendement: number | null;
  dateDetachement: string | null;
  datePaiement: string | null;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// web/lib/divialerte/companyMatching.test.ts
import { describe, it, expect } from "vitest";
import { normalizeCompanyName, matchCompany } from "./companyMatching";
import type { CompanyRecord } from "./types";

describe("normalizeCompanyName", () => {
  it("uppercases, strips accents, and collapses whitespace", () => {
    expect(normalizeCompanyName("Société  Générale")).toBe("SOCIETE GENERALE");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeCompanyName("  SERVAIR  ")).toBe("SERVAIR");
  });
});

describe("matchCompany", () => {
  const companies: CompanyRecord[] = [
    { id: "1", name: "SERVAIR", ticker: "SVR", country: "ci" },
    { id: "2", name: "SOCIETE GENERALE", ticker: null, country: "ci" },
  ];

  it("matches by ticker case-insensitively", () => {
    expect(matchCompany({ ticker: "svr", companyName: "anything" }, companies)).toEqual(companies[0]);
  });

  it("falls back to normalized name when there is no ticker match", () => {
    expect(matchCompany({ ticker: null, companyName: "Société Générale" }, companies)).toEqual(companies[1]);
  });

  it("returns null when nothing matches", () => {
    expect(matchCompany({ ticker: "ZZZ", companyName: "Unknown Corp" }, companies)).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/divialerte/companyMatching.test.ts
```

Expected: FAIL — `./companyMatching` doesn't exist.

- [ ] **Step 4: Implement**

```ts
// web/lib/divialerte/companyMatching.ts
import type { CompanyRecord } from "./types";

export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function matchCompany(
  row: { ticker: string | null; companyName: string },
  companies: CompanyRecord[]
): CompanyRecord | null {
  if (row.ticker) {
    const byTicker = companies.find(
      (c) => c.ticker && c.ticker.toUpperCase() === row.ticker!.toUpperCase()
    );
    if (byTicker) return byTicker;
  }
  const normalized = normalizeCompanyName(row.companyName);
  return companies.find((c) => normalizeCompanyName(c.name) === normalized) ?? null;
}
```

- [ ] **Step 5: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/divialerte/companyMatching.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add web/lib/divialerte/types.ts web/lib/divialerte/companyMatching.ts web/lib/divialerte/companyMatching.test.ts
git commit -m "feat: add DiviAlerte types and company matching logic"
```

---

### Task 3: Pure logic — dividend field merge

**Files:**
- Create: `web/lib/divialerte/mergeDividends.ts`
- Test: `web/lib/divialerte/mergeDividends.test.ts`

**Interfaces:**
- Consumes: `ResolvedDividendFields` (Task 2).
- Produces: `resolveDividendFields(current: ResolvedDividendFields | null, sika: ResolvedDividendFields | null, richbourse: ResolvedDividendFields | null): ResolvedDividendFields` — consumed by Task 10's cron route.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/divialerte/mergeDividends.test.ts
import { describe, it, expect } from "vitest";
import { resolveDividendFields } from "./mergeDividends";

const empty = { montant: null, rendement: null, dateDetachement: null, datePaiement: null };

describe("resolveDividendFields", () => {
  it("prefers Sika for montant/rendement when both sources have it", () => {
    const sika = { ...empty, montant: 100, rendement: 5 };
    const richbourse = { ...empty, montant: 200, rendement: 6 };
    const result = resolveDividendFields(null, sika, richbourse);
    expect(result.montant).toBe(100);
    expect(result.rendement).toBe(5);
  });

  it("falls back to RichBourse montant when Sika has none", () => {
    const richbourse = { ...empty, montant: 200, rendement: 6 };
    const result = resolveDividendFields(null, null, richbourse);
    expect(result.montant).toBe(200);
    expect(result.rendement).toBe(6);
  });

  it("keeps the current value when neither scraped source has montant", () => {
    const current = { ...empty, montant: 50, rendement: 2 };
    const result = resolveDividendFields(current, null, null);
    expect(result.montant).toBe(50);
    expect(result.rendement).toBe(2);
  });

  it("prefers RichBourse for dates when both sources have them", () => {
    const sika = { ...empty, dateDetachement: "2026-07-10", datePaiement: "2026-07-15" };
    const richbourse = { ...empty, dateDetachement: "2026-07-12", datePaiement: "2026-07-20" };
    const result = resolveDividendFields(null, sika, richbourse);
    expect(result.dateDetachement).toBe("2026-07-12");
    expect(result.datePaiement).toBe("2026-07-20");
  });

  it("falls back to Sika dates when RichBourse has none", () => {
    const sika = { ...empty, dateDetachement: "2026-07-10", datePaiement: "2026-07-15" };
    const result = resolveDividendFields(null, sika, null);
    expect(result.dateDetachement).toBe("2026-07-10");
    expect(result.datePaiement).toBe("2026-07-15");
  });

  it("keeps the current dates when neither scraped source has them", () => {
    const current = { ...empty, dateDetachement: "2026-07-01", datePaiement: "2026-07-05" };
    const result = resolveDividendFields(current, null, null);
    expect(result.dateDetachement).toBe("2026-07-01");
    expect(result.datePaiement).toBe("2026-07-05");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/divialerte/mergeDividends.test.ts
```

Expected: FAIL — `./mergeDividends` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/divialerte/mergeDividends.ts
import type { ResolvedDividendFields } from "./types";

export function resolveDividendFields(
  current: ResolvedDividendFields | null,
  sika: ResolvedDividendFields | null,
  richbourse: ResolvedDividendFields | null
): ResolvedDividendFields {
  return {
    montant: sika?.montant ?? richbourse?.montant ?? current?.montant ?? null,
    rendement: sika?.rendement ?? richbourse?.rendement ?? current?.rendement ?? null,
    dateDetachement:
      richbourse?.dateDetachement ?? sika?.dateDetachement ?? current?.dateDetachement ?? null,
    datePaiement: richbourse?.datePaiement ?? sika?.datePaiement ?? current?.datePaiement ?? null,
  };
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/divialerte/mergeDividends.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/divialerte/mergeDividends.ts web/lib/divialerte/mergeDividends.test.ts
git commit -m "feat: add DiviAlerte dividend source merge logic"
```

---

### Task 4: Pure logic — date utilities (countdown + exercice year)

**Files:**
- Create: `web/lib/divialerte/dateUtils.ts`
- Test: `web/lib/divialerte/dateUtils.test.ts`

**Interfaces:**
- Produces: `daysUntil(dateStr: string, now?: Date): number`, `deriveExerciceYear(dateDetachement: string | null, now?: Date): number` — consumed by Task 10's cron route and Task 12's `DividendCard`.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/divialerte/dateUtils.test.ts
import { describe, it, expect } from "vitest";
import { daysUntil, deriveExerciceYear } from "./dateUtils";

describe("daysUntil", () => {
  it("returns a positive count for a future date", () => {
    expect(daysUntil("2026-07-20", new Date("2026-07-15T12:00:00Z"))).toBe(5);
  });

  it("returns 0 for today", () => {
    expect(daysUntil("2026-07-15", new Date("2026-07-15T23:00:00Z"))).toBe(0);
  });

  it("returns a negative count for a past date", () => {
    expect(daysUntil("2026-07-10", new Date("2026-07-15T00:00:00Z"))).toBe(-5);
  });
});

describe("deriveExerciceYear", () => {
  it("extracts the year from the ex-dividend date when available", () => {
    expect(deriveExerciceYear("2026-07-20", new Date("2026-01-01T00:00:00Z"))).toBe(2026);
  });

  it("falls back to the current year when the date is unknown", () => {
    expect(deriveExerciceYear(null, new Date("2026-01-01T00:00:00Z"))).toBe(2026);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/divialerte/dateUtils.test.ts
```

Expected: FAIL — `./dateUtils` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/divialerte/dateUtils.ts
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function deriveExerciceYear(dateDetachement: string | null, now: Date = new Date()): number {
  if (dateDetachement) {
    return Number(dateDetachement.slice(0, 4));
  }
  return now.getUTCFullYear();
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/divialerte/dateUtils.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/divialerte/dateUtils.ts web/lib/divialerte/dateUtils.test.ts
git commit -m "feat: add DiviAlerte date utilities"
```

---

### Task 5: Pure logic — alert threshold detection

**Files:**
- Create: `web/lib/divialerte/alertLogic.ts`
- Test: `web/lib/divialerte/alertLogic.test.ts`

**Interfaces:**
- Produces: `AlertType` (`"j3" | "j1"`), `determineAlertsToSend(daysLeft: number | null, alreadySent: Set<AlertType>): AlertType[]` — consumed by Task 10's cron route.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/divialerte/alertLogic.test.ts
import { describe, it, expect } from "vitest";
import { determineAlertsToSend } from "./alertLogic";

describe("determineAlertsToSend", () => {
  it("returns nothing when the date is unknown", () => {
    expect(determineAlertsToSend(null, new Set())).toEqual([]);
  });

  it("returns nothing for a date already past", () => {
    expect(determineAlertsToSend(-1, new Set())).toEqual([]);
  });

  it("returns nothing when more than 3 days remain", () => {
    expect(determineAlertsToSend(5, new Set())).toEqual([]);
  });

  it("triggers j3 at exactly 3 days left", () => {
    expect(determineAlertsToSend(3, new Set())).toEqual(["j3"]);
  });

  it("triggers both j3 and j1 when they haven't been sent and only 1 day remains", () => {
    expect(determineAlertsToSend(1, new Set())).toEqual(["j3", "j1"]);
  });

  it("skips j3 when it was already sent", () => {
    expect(determineAlertsToSend(1, new Set(["j3"]))).toEqual(["j1"]);
  });

  it("returns nothing when both were already sent", () => {
    expect(determineAlertsToSend(0, new Set(["j3", "j1"]))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/divialerte/alertLogic.test.ts
```

Expected: FAIL — `./alertLogic` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/divialerte/alertLogic.ts
export type AlertType = "j3" | "j1";

export function determineAlertsToSend(
  daysLeft: number | null,
  alreadySent: Set<AlertType>
): AlertType[] {
  if (daysLeft === null || daysLeft < 0) return [];

  const toSend: AlertType[] = [];
  if (daysLeft <= 3 && !alreadySent.has("j3")) toSend.push("j3");
  if (daysLeft <= 1 && !alreadySent.has("j1")) toSend.push("j1");
  return toSend;
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/divialerte/alertLogic.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/divialerte/alertLogic.ts web/lib/divialerte/alertLogic.test.ts
git commit -m "feat: add DiviAlerte alert threshold logic"
```

---

### Task 6: Pure logic — markdown table parsers

**Files:**
- Create: `web/lib/divialerte/parseDividendTable.ts`
- Test: `web/lib/divialerte/parseDividendTable.test.ts`

**Interfaces:**
- Consumes: `DividendRow` (Task 2).
- Produces: `parseSikaDividendsMarkdown(markdown: string): DividendRow[]`, `parseRichBourseDividendsMarkdown(markdown: string): DividendRow[]` — consumed by Task 8's Firecrawl wrappers.

**Note:** the regex-based parsing below is built from the live page structure inspected on 2026-07-15 (see spec section 2). If Firecrawl's markdown output for these pages drifts from a plain pipe table, Task 8's manual verification step will surface it — adjust the parser there if so. Sika's ticker links follow the pattern `cotation_<TICKER>.<country>` (e.g. `cotation_BICB.bj`) — the 2-letter suffix is the UEMOA country code, captured here for the IRVM calculation in Task 7. RichBourse's links don't expose a country code, so its rows always get `country: null`.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/divialerte/parseDividendTable.test.ts
import { describe, it, expect } from "vitest";
import { parseSikaDividendsMarkdown, parseRichBourseDividendsMarkdown } from "./parseDividendTable";

const sikaMarkdown = `
| Date détachement | Nom | Montant | Rendement |
| --- | --- | --- | --- |
| 13/07/2026 | [BANQUE INTERNATIONALE POUR LE COMMERCE DU BENIN](https://www.sikafinance.com/marches/cotation_BICB.bj) | 254.60 | 3.95% |
| A préciser | [SITAB](https://www.sikafinance.com/marches/cotation_SITAB.ci) | 1707.20 | 7.12% |
`;

const richbourseMarkdown = `
| Société | Dividende | Rendement | Ex-dividende | Date paiement |
| --- | --- | --- | --- | --- |
| [SERVAIR](https://www.richbourse.com/common/cotation/SERVAIR) | 124 | 3.97% | 29/09/2026 | 30/09/2026 |
| [VIVO ENERGY](https://www.richbourse.com/common/cotation/VIVO) | 85.07 | 3.87% | (inconnue) | (inconnue) |
`;

describe("parseSikaDividendsMarkdown", () => {
  it("parses a full row with a ticker, country, and known date", () => {
    const rows = parseSikaDividendsMarkdown(sikaMarkdown);
    expect(rows[0]).toEqual({
      companyName: "BANQUE INTERNATIONALE POUR LE COMMERCE DU BENIN",
      ticker: "BICB",
      country: "bj",
      montant: 254.6,
      rendement: 3.95,
      dateDetachement: "2026-07-13",
      datePaiement: null,
      sourceName: "Sika Finance",
    });
  });

  it("treats an unpublished date as null and still captures the country", () => {
    const rows = parseSikaDividendsMarkdown(sikaMarkdown);
    expect(rows[1].dateDetachement).toBeNull();
    expect(rows[1].ticker).toBe("SITAB");
    expect(rows[1].country).toBe("ci");
  });
});

describe("parseRichBourseDividendsMarkdown", () => {
  it("parses a full row with both dates and a null country", () => {
    const rows = parseRichBourseDividendsMarkdown(richbourseMarkdown);
    expect(rows[0]).toEqual({
      companyName: "SERVAIR",
      ticker: null,
      country: null,
      montant: 124,
      rendement: 3.97,
      dateDetachement: "2026-09-29",
      datePaiement: "2026-09-30",
      sourceName: "RichBourse",
    });
  });

  it("treats unknown dates as null", () => {
    const rows = parseRichBourseDividendsMarkdown(richbourseMarkdown);
    expect(rows[1].dateDetachement).toBeNull();
    expect(rows[1].datePaiement).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/divialerte/parseDividendTable.test.ts
```

Expected: FAIL — `./parseDividendTable` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/divialerte/parseDividendTable.ts
import type { DividendRow } from "./types";

function parseFrenchDate(raw: string): string | null {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

function tableRows(markdown: string): string[][] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|[\s\-:|]+\|$/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

export function parseSikaDividendsMarkdown(markdown: string): DividendRow[] {
  return tableRows(markdown)
    .slice(1)
    .filter((cells) => cells.length >= 4)
    .map(([dateCell, nameCell, montantCell, rendementCell]) => {
      const tickerMatch = nameCell.match(/cotation_([A-Za-z0-9]+)\.([a-z]{2})/i);
      const nameMatch = nameCell.match(/\[([^\]]+)\]/);
      return {
        companyName: (nameMatch ? nameMatch[1] : nameCell).trim(),
        ticker: tickerMatch ? tickerMatch[1].toUpperCase() : null,
        country: tickerMatch ? tickerMatch[2].toLowerCase() : null,
        montant: parseAmount(montantCell),
        rendement: parseAmount(rendementCell),
        dateDetachement: parseFrenchDate(dateCell),
        datePaiement: null,
        sourceName: "Sika Finance" as const,
      };
    });
}

export function parseRichBourseDividendsMarkdown(markdown: string): DividendRow[] {
  return tableRows(markdown)
    .slice(1)
    .filter((cells) => cells.length >= 5)
    .map(([nameCell, montantCell, rendementCell, exDateCell, payDateCell]) => {
      const nameMatch = nameCell.match(/\[([^\]]+)\]/);
      return {
        companyName: (nameMatch ? nameMatch[1] : nameCell).trim(),
        ticker: null,
        country: null,
        montant: parseAmount(montantCell),
        rendement: parseAmount(rendementCell),
        dateDetachement: parseFrenchDate(exDateCell),
        datePaiement: parseFrenchDate(payDateCell),
        sourceName: "RichBourse" as const,
      };
    });
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/divialerte/parseDividendTable.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/divialerte/parseDividendTable.ts web/lib/divialerte/parseDividendTable.test.ts
git commit -m "feat: add DiviAlerte dividend table markdown parsers"
```

---

### Task 7: Pure logic — IRVM net dividend calculation

**Files:**
- Create: `web/lib/divialerte/irvm.ts`
- Test: `web/lib/divialerte/irvm.test.ts`

**Interfaces:**
- Produces: `IRVM_RATES_BY_COUNTRY: Record<string, number>`, `calculateNetDividend(montant: number | null, countryCode: string | null): number | null` — consumed by Task 10's cron route and Task 12's `DividendCard`.

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/divialerte/irvm.test.ts
import { describe, it, expect } from "vitest";
import { calculateNetDividend } from "./irvm";

describe("calculateNetDividend", () => {
  it("applies the 10% Côte d'Ivoire rate", () => {
    expect(calculateNetDividend(1000, "ci")).toBe(900);
  });

  it("applies the 5% Bénin rate", () => {
    expect(calculateNetDividend(1000, "bj")).toBe(950);
  });

  it("applies the 12.5% Burkina Faso rate", () => {
    expect(calculateNetDividend(1000, "bf")).toBe(875);
  });

  it("is case-insensitive on the country code", () => {
    expect(calculateNetDividend(1000, "CI")).toBe(900);
  });

  it("returns null for an unsupported country", () => {
    expect(calculateNetDividend(1000, "ne")).toBeNull();
  });

  it("returns null when the country is unknown", () => {
    expect(calculateNetDividend(1000, null)).toBeNull();
  });

  it("returns null when the montant is unknown", () => {
    expect(calculateNetDividend(null, "ci")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run lib/divialerte/irvm.test.ts
```

Expected: FAIL — `./irvm` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/lib/divialerte/irvm.ts

// Taux IRVM (Impôt sur le Revenu des Valeurs Mobilières) sur dividendes,
// vérifiés le 2026-07-15 (voir spec section 3bis). Niger et Guinée-Bissau
// sont volontairement absents : leur taux n'a pas pu être vérifié, mieux
// vaut ne rien afficher que d'inventer un chiffre.
export const IRVM_RATES_BY_COUNTRY: Record<string, number> = {
  ci: 0.1,
  sn: 0.1,
  bf: 0.125,
  ml: 0.07,
  bj: 0.05,
  tg: 0.03,
};

export function calculateNetDividend(montant: number | null, countryCode: string | null): number | null {
  if (montant === null || countryCode === null) return null;
  const rate = IRVM_RATES_BY_COUNTRY[countryCode.toLowerCase()];
  if (rate === undefined) return null;
  return Math.round(montant * (1 - rate) * 100) / 100;
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run lib/divialerte/irvm.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/divialerte/irvm.ts web/lib/divialerte/irvm.test.ts
git commit -m "feat: add DiviAlerte IRVM net dividend calculation"
```

---

### Task 8: Firecrawl scraping wrappers

**Files:**
- Modify: `web/lib/firecrawl.ts`

**Interfaces:**
- Consumes: `parseSikaDividendsMarkdown`, `parseRichBourseDividendsMarkdown` (Task 6).
- Produces: `scrapeSikaDividends(): Promise<DividendRow[]>`, `scrapeRichBourseDividends(): Promise<DividendRow[]>` — consumed by Task 10's cron route.

No dedicated test file for this task — `lib/firecrawl.ts` is a thin I/O wrapper with no existing tests (its logic is exercised indirectly through the cron routes' mocked tests), consistent with `scrapeListingLinks`/`scrapeArticleContent` above it.

- [ ] **Step 1: Add the two functions**

Add this at the end of `web/lib/firecrawl.ts` (keep the existing content above it untouched):

```ts
import { parseSikaDividendsMarkdown, parseRichBourseDividendsMarkdown } from "@/lib/divialerte/parseDividendTable";
import type { DividendRow } from "@/lib/divialerte/types";

export async function scrapeSikaDividends(): Promise<DividendRow[]> {
  const result = await firecrawl.scrapeUrl("https://www.sikafinance.com/marches/dividendes", {
    formats: ["markdown"],
    onlyMainContent: true,
  });
  if (!result.success) {
    throw new Error(`Firecrawl failed to scrape Sika dividends: ${result.error}`);
  }
  const markdown = (result as unknown as FirecrawlMarkdownResult).markdown ?? "";
  return parseSikaDividendsMarkdown(markdown);
}

export async function scrapeRichBourseDividends(): Promise<DividendRow[]> {
  const rows: DividendRow[] = [];
  let page = 1;

  // Safety cap: stop after 10 pages even if the "empty page" end-of-pagination
  // signal is ever missed, so a site change can never turn this into an
  // infinite loop.
  while (page <= 10) {
    const result = await firecrawl.scrapeUrl(
      `https://www.richbourse.com/common/dividende/index?page=${page}`,
      { formats: ["markdown"], onlyMainContent: true }
    );
    if (!result.success) {
      throw new Error(`Firecrawl failed to scrape RichBourse dividends (page ${page}): ${result.error}`);
    }
    const markdown = (result as unknown as FirecrawlMarkdownResult).markdown ?? "";
    const pageRows = parseRichBourseDividendsMarkdown(markdown);
    if (pageRows.length === 0) break;
    rows.push(...pageRows);
    page += 1;
  }

  return rows;
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
git commit -m "feat: add Sika/RichBourse dividend scraping wrappers"
```

---

### Task 9: Email template + mailer function

**Files:**
- Create: `web/emails/DivialerteAlert.tsx`
- Modify: `web/lib/mailer.ts`

**Interfaces:**
- Produces: `DivialerteAlertEmail` (React Email component), `sendDivialerteAlert(input: { email: string; companyName: string; montant: number | null; montantNet: number | null; rendement: number | null; dateDetachement: string; datePaiement: string | null; daysLeft: number }): Promise<void>` — consumed by Task 10's cron route.

- [ ] **Step 1: Create the email template**

```tsx
// web/emails/DivialerteAlert.tsx
import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

interface DivialerteAlertEmailProps {
  companyName: string;
  montant: number | null;
  montantNet: number | null;
  rendement: number | null;
  dateDetachement: string;
  datePaiement: string | null;
  daysLeft: number;
  appUrl: string;
}

export function DivialerteAlertEmail({
  companyName,
  montant,
  montantNet,
  rendement,
  dateDetachement,
  datePaiement,
  daysLeft,
  appUrl,
}: DivialerteAlertEmailProps) {
  const formattedDetachement = new Date(dateDetachement).toLocaleDateString("fr-FR");
  const formattedPaiement = datePaiement ? new Date(datePaiement).toLocaleDateString("fr-FR") : "à préciser";

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "sans-serif", color: "#111110" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h2">
            Dividende {companyName} {daysLeft <= 1 ? "demain" : `dans ${daysLeft} jours`}
          </Heading>
          <Text>Montant brut : {montant !== null ? `${montant} FCFA` : "à préciser"}</Text>
          {montantNet !== null && <Text>Montant net (après IRVM) : {montantNet} FCFA</Text>}
          <Text>Rendement : {rendement !== null ? `${rendement}%` : "à préciser"}</Text>
          <Text>Date de détachement : {formattedDetachement}</Text>
          <Text>Date de paiement : {formattedPaiement}</Text>
          <Button
            href={`${appUrl}/divialerte`}
            style={{ backgroundColor: "#111110", color: "#ffffff", padding: "12px 20px", borderRadius: "8px" }}
          >
            Voir sur l'app
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Extract a shared transporter helper and add `sendDivialerteAlert`**

Replace the full contents of `web/lib/mailer.ts` with:

```ts
// web/lib/mailer.ts
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { VeilleNotificationEmail } from "@/emails/VeilleNotification";
import { DivialerteAlertEmail } from "@/emails/DivialerteAlert";
import { createUnsubscribeToken } from "@/lib/unsubscribeToken";

interface NotificationInput {
  type: "article" | "video";
  title: string;
  excerpt: string;
  url: string;
}

interface DivialerteAlertInput {
  email: string;
  companyName: string;
  montant: number | null;
  montantNet: number | null;
  rendement: number | null;
  dateDetachement: string;
  datePaiement: string | null;
  daysLeft: number;
}

function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT!),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });
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

  const transporter = createSmtpTransporter();
  const label = input.type === "article" ? "Nouvel article" : "Nouvelle vidéo";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Each recipient gets their own unsubscribe token and its own send, so one
  // failure never affects another subscriber and no email exposes the
  // others' addresses in "to".
  await Promise.all(
    subscribers.map(async (subscriber: { email: string }) => {
      const token = createUnsubscribeToken(subscriber.email);
      const html = await render(
        VeilleNotificationEmail({
          title: input.title,
          excerpt: input.excerpt,
          url: input.url,
          unsubscribeUrl: `${appUrl}/veille/unsubscribe?token=${token}`,
        })
      );
      return transporter.sendMail({
        from: process.env.SMTP_FROM!,
        to: subscriber.email,
        subject: `${label} Veille.BRVM : ${input.title}`,
        html,
      });
    })
  );
}

export async function sendDivialerteAlert(input: DivialerteAlertInput): Promise<void> {
  const transporter = createSmtpTransporter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject =
    input.daysLeft <= 1
      ? `Dividende ${input.companyName} demain`
      : `Dividende ${input.companyName} dans ${input.daysLeft} jours`;

  const html = await render(
    DivialerteAlertEmail({
      companyName: input.companyName,
      montant: input.montant,
      montantNet: input.montantNet,
      rendement: input.rendement,
      dateDetachement: input.dateDetachement,
      datePaiement: input.datePaiement,
      daysLeft: input.daysLeft,
      appUrl,
    })
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: input.email,
    subject,
    html,
  });
}
```

- [ ] **Step 3: Run the existing mailer test to confirm the refactor didn't break it**

```bash
cd web
npx vitest run lib/mailer.test.ts
```

Expected: PASS (same count as before this change).

- [ ] **Step 4: Typecheck**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/emails/DivialerteAlert.tsx web/lib/mailer.ts
git commit -m "feat: add DiviAlerte email template and mailer function"
```

---

### Task 10: Cron route `/api/cron/divialerte`

**Files:**
- Create: `web/app/api/cron/divialerte/route.ts`
- Test: `web/app/api/cron/divialerte/route.test.ts`

**Interfaces:**
- Consumes: `scrapeSikaDividends`, `scrapeRichBourseDividends` (Task 8); `matchCompany` (Task 2); `resolveDividendFields` (Task 3); `daysUntil`, `deriveExerciceYear` (Task 4); `determineAlertsToSend`, `AlertType` (Task 5); `calculateNetDividend` (Task 7); `sendDivialerteAlert` (Task 9).
- Produces: the `/api/cron/divialerte` route, to be wired into a Vercel Cron job (deployment config, not part of this plan's automated steps).

- [ ] **Step 1: Write the failing tests**

```ts
// web/app/api/cron/divialerte/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

function chainable(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.maybeSingle = () => Promise.resolve(result);
  builder.insert = () => builder;
  builder.upsert = () => Promise.resolve(result);
  builder.then = (resolve: (value: unknown) => void) => resolve(result);
  return builder;
}

const mockFrom = vi.fn((_table: string) => chainable({ data: [] }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/firecrawl", () => ({
  scrapeSikaDividends: vi.fn(),
  scrapeRichBourseDividends: vi.fn(),
}));
vi.mock("@/lib/mailer", () => ({
  sendDivialerteAlert: vi.fn().mockResolvedValue(undefined),
}));

import { scrapeSikaDividends, scrapeRichBourseDividends } from "@/lib/firecrawl";
import { GET } from "./route";

function makeRequest(secret: string) {
  return new NextRequest("http://localhost:3000/api/cron/divialerte", {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/divialerte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((_table: string) => chainable({ data: [] }));
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without the correct secret", async () => {
    const response = await GET(makeRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("completes successfully when both sources scrape cleanly with no watchlist entries", async () => {
    vi.mocked(scrapeSikaDividends).mockResolvedValue([]);
    vi.mocked(scrapeRichBourseDividends).mockResolvedValue([]);

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
  });

  it("still returns 200 when one source throws", async () => {
    vi.mocked(scrapeSikaDividends).mockRejectedValue(new Error("Sika down"));
    vi.mocked(scrapeRichBourseDividends).mockResolvedValue([]);

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run app/api/cron/divialerte/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/app/api/cron/divialerte/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeSikaDividends, scrapeRichBourseDividends } from "@/lib/firecrawl";
import { matchCompany } from "@/lib/divialerte/companyMatching";
import { resolveDividendFields } from "@/lib/divialerte/mergeDividends";
import { daysUntil, deriveExerciceYear } from "@/lib/divialerte/dateUtils";
import { determineAlertsToSend, type AlertType } from "@/lib/divialerte/alertLogic";
import { calculateNetDividend } from "@/lib/divialerte/irvm";
import { sendDivialerteAlert } from "@/lib/mailer";
import type { CompanyRecord, DividendRow } from "@/lib/divialerte/types";

function serviceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceRoleClient();

  const scraped: DividendRow[] = [];
  try {
    scraped.push(...(await scrapeSikaDividends()));
  } catch (err) {
    console.error("[divialerte] Sika Finance scrape failed", err);
  }
  try {
    scraped.push(...(await scrapeRichBourseDividends()));
  } catch (err) {
    console.error("[divialerte] RichBourse scrape failed", err);
  }

  const { data: existingCompanies } = await supabase
    .from("divialerte_companies")
    .select("id, name, ticker, country");
  const companies: CompanyRecord[] = existingCompanies ?? [];

  for (const row of scraped) {
    let company = matchCompany({ ticker: row.ticker, companyName: row.companyName }, companies);

    if (!company) {
      const { data: created } = await supabase
        .from("divialerte_companies")
        .insert({ name: row.companyName, ticker: row.ticker, country: row.country })
        .select();
      if (!created?.[0]) continue;
      company = created[0];
      companies.push(company);
    } else if (!company.country && row.country) {
      await supabase.from("divialerte_companies").update({ country: row.country }).eq("id", company.id);
      company.country = row.country;
    }

    const exerciceYear = deriveExerciceYear(row.dateDetachement);

    const { data: existingDividend } = await supabase
      .from("divialerte_dividends")
      .select("id, montant, rendement, date_detachement, date_paiement")
      .eq("company_id", company.id)
      .eq("exercice_year", exerciceYear)
      .maybeSingle();

    const currentFields = existingDividend
      ? {
          montant: existingDividend.montant,
          rendement: existingDividend.rendement,
          dateDetachement: existingDividend.date_detachement,
          datePaiement: existingDividend.date_paiement,
        }
      : null;
    const sikaFields = row.sourceName === "Sika Finance" ? row : null;
    const richbourseFields = row.sourceName === "RichBourse" ? row : null;
    const resolved = resolveDividendFields(currentFields, sikaFields, richbourseFields);

    await supabase.from("divialerte_dividends").upsert(
      {
        id: existingDividend?.id,
        company_id: company.id,
        exercice_year: exerciceYear,
        montant: resolved.montant,
        rendement: resolved.rendement,
        date_detachement: resolved.dateDetachement,
        date_paiement: resolved.datePaiement,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,exercice_year" }
    );
  }

  const { data: watchlist } = await supabase
    .from("divialerte_watchlist")
    .select("profile_id, company_id, profiles(email), divialerte_companies(name, country)");

  const { data: sentAlerts } = await supabase
    .from("divialerte_alerts_sent")
    .select("profile_id, dividend_id, alert_type");
  const sentByKey = new Map<string, Set<AlertType>>();
  for (const sent of (sentAlerts ?? []) as { profile_id: string; dividend_id: string; alert_type: AlertType }[]) {
    const key = `${sent.profile_id}:${sent.dividend_id}`;
    if (!sentByKey.has(key)) sentByKey.set(key, new Set());
    sentByKey.get(key)!.add(sent.alert_type);
  }

  const currentYear = new Date().getUTCFullYear();
  const { data: currentDividends } = await supabase
    .from("divialerte_dividends")
    .select("id, company_id, date_detachement, date_paiement, montant, rendement")
    .eq("exercice_year", currentYear);
  const dividendByCompany = new Map(
    ((currentDividends ?? []) as {
      id: string;
      company_id: string;
      date_detachement: string | null;
      date_paiement: string | null;
      montant: number | null;
      rendement: number | null;
    }[]).map((d) => [d.company_id, d])
  );

  for (const entry of (watchlist ?? []) as {
    profile_id: string;
    company_id: string;
    profiles: { email: string } | null;
    divialerte_companies: { name: string; country: string | null } | null;
  }[]) {
    const dividend = dividendByCompany.get(entry.company_id);
    if (!dividend || !dividend.date_detachement || !entry.profiles) continue;

    const daysLeft = daysUntil(dividend.date_detachement);
    const alreadySent = sentByKey.get(`${entry.profile_id}:${dividend.id}`) ?? new Set<AlertType>();
    const toSend = determineAlertsToSend(daysLeft, alreadySent);

    for (const alertType of toSend) {
      try {
        await sendDivialerteAlert({
          email: entry.profiles.email,
          companyName: entry.divialerte_companies?.name ?? "Société",
          montant: dividend.montant,
          montantNet: calculateNetDividend(dividend.montant, entry.divialerte_companies?.country ?? null),
          rendement: dividend.rendement,
          dateDetachement: dividend.date_detachement,
          datePaiement: dividend.date_paiement,
          daysLeft,
        });
        await supabase.from("divialerte_alerts_sent").insert({
          profile_id: entry.profile_id,
          dividend_id: dividend.id,
          alert_type: alertType,
        });
      } catch (err) {
        console.error(`[divialerte] alert email failed for ${entry.profile_id}`, err);
      }
    }
  }

  return NextResponse.json({ companiesSeen: scraped.length }, { status: 200 });
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run app/api/cron/divialerte/route.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Manual verification against the live sources**

```bash
cd web
npm run dev
```

In another terminal (replace `<CRON_SECRET>` with the value from `.env.local`):

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/divialerte
```

Expected: JSON response `{"companiesSeen": <number > 0>}`. Check the terminal running `npm run dev` for any `[divialerte] ... scrape failed` logs — if either source logs a failure, open `web/lib/divialerte/parseDividendTable.ts` and adjust the parser to match what Firecrawl actually returned (print the raw markdown temporarily via `console.log` in `scrapeSikaDividends`/`scrapeRichBourseDividends` if needed). Then re-run this step until both sources succeed. Once confirmed, check the Supabase Dashboard Table Editor: `divialerte_companies` (some rows should have a non-null `country`, from Sika) and `divialerte_dividends` should now have rows.

- [ ] **Step 6: Commit**

```bash
git add web/app/api/cron/divialerte
git commit -m "feat: add DiviAlerte cron route"
```

---

### Task 11: Watchlist toggle API route

**Files:**
- Create: `web/app/api/divialerte/watchlist/route.ts`
- Test: `web/app/api/divialerte/watchlist/route.test.ts`

**Interfaces:**
- Produces: `POST /api/divialerte/watchlist` accepting `{ companyId: string }`, returning `{ watching: boolean }` — consumed by Task 12's `WatchBell`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/app/api/divialerte/watchlist/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/divialerte/watchlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/divialerte/watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(makeRequest({ companyId: "c1" }));
    expect(response.status).toBe(401);
  });

  it("adds to the watchlist when not already watching", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.watching).toBe(true);
  });

  it("removes from the watchlist when already watching (toggle)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: "watch-1" }], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.watching).toBe(false);
  });

  it("returns 500 when insert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
      insert: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
    });

    const response = await POST(makeRequest({ companyId: "c1" }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web
npx vitest run app/api/divialerte/watchlist/route.test.ts
```

Expected: FAIL — `./route` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// web/app/api/divialerte/watchlist/route.ts
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

  const { companyId } = (await request.json()) as { companyId: string };

  const { data: existing, error: selectError } = await supabase
    .from("divialerte_watchlist")
    .select("id")
    .eq("profile_id", user.id)
    .eq("company_id", companyId);

  if (selectError) {
    return NextResponse.json({ error: "Erreur lors de la vérification." }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("divialerte_watchlist")
      .delete()
      .eq("id", existing[0].id);

    if (deleteError) {
      return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
    }

    return NextResponse.json({ watching: false }, { status: 200 });
  }

  const { error: insertError } = await supabase.from("divialerte_watchlist").insert({
    profile_id: user.id,
    company_id: companyId,
  });

  if (insertError) {
    return NextResponse.json({ error: "Ajout impossible." }, { status: 500 });
  }

  return NextResponse.json({ watching: true }, { status: 200 });
}
```

- [ ] **Step 4: Run tests again to verify they pass**

```bash
cd web
npx vitest run app/api/divialerte/watchlist/route.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/app/api/divialerte/watchlist
git commit -m "feat: add DiviAlerte watchlist toggle route"
```

---

### Task 12: DiviAlerte UI

**Files:**
- Create: `web/components/divialerte/WatchBell.tsx`
- Create: `web/components/divialerte/DividendCard.tsx`
- Create: `web/app/divialerte/DiviAlerteClient.tsx`
- Modify: `web/app/divialerte/page.tsx` (replace the placeholder)

**Interfaces:**
- Consumes: `daysUntil` (Task 4), `calculateNetDividend` (Task 7), `POST /api/divialerte/watchlist` (Task 11), `Card`/`Badge`/`Icon` (existing).
- Produces: the `/divialerte` route rendering the full calendar + watchlist UI, with net-of-IRVM amounts.

- [ ] **Step 1: `WatchBell` — mirrors `FavoriteButton`**

```tsx
// web/components/divialerte/WatchBell.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface WatchBellProps {
  companyId: string;
  initiallyWatching: boolean;
  loggedIn: boolean;
}

export function WatchBell({ companyId, initiallyWatching, loggedIn }: WatchBellProps) {
  const router = useRouter();
  const [watching, setWatching] = useState(initiallyWatching);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!loggedIn) {
      router.push("/login?redirectTo=/divialerte");
      return;
    }

    const previous = watching;
    setWatching(!previous);
    setPending(true);

    try {
      const response = await fetch("/api/divialerte/watchlist", {
        method: "POST",
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        setWatching(previous);
      }
    } catch {
      setWatching(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} aria-label="Suivre">
      <Icon name="bell" size={18} color={watching ? "var(--action-primary)" : "var(--text-tertiary)"} />
    </button>
  );
}
```

- [ ] **Step 2: `DividendCard` — mirrors `ArticleCard`, shows the net-of-IRVM amount**

```tsx
// web/components/divialerte/DividendCard.tsx
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WatchBell } from "@/components/divialerte/WatchBell";
import { daysUntil } from "@/lib/divialerte/dateUtils";
import { calculateNetDividend } from "@/lib/divialerte/irvm";

export interface DividendCardData {
  companyId: string;
  companyName: string;
  country: string | null;
  montant: number | null;
  rendement: number | null;
  dateDetachement: string | null;
  datePaiement: string | null;
}

export function DividendCard({
  dividend,
  loggedIn,
  isWatching,
}: {
  dividend: DividendCardData;
  loggedIn: boolean;
  isWatching: boolean;
}) {
  const daysLeft = dividend.dateDetachement ? daysUntil(dividend.dateDetachement) : null;
  const montantNet = calculateNetDividend(dividend.montant, dividend.country);

  return (
    <Card padding={16}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text-primary">{dividend.companyName}</p>
          <p className="mt-1 text-sm text-text-tertiary">
            {dividend.montant !== null ? `${dividend.montant} FCFA brut` : "Montant à préciser"}
            {montantNet !== null && ` · ${montantNet} FCFA net (IRVM)`}
            {dividend.rendement !== null ? ` · ${dividend.rendement}%` : ""}
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            {dividend.dateDetachement
              ? `Détachement : ${new Date(dividend.dateDetachement).toLocaleDateString("fr-FR")}`
              : "Date à préciser"}
            {dividend.datePaiement &&
              ` · Paiement : ${new Date(dividend.datePaiement).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {daysLeft !== null && daysLeft >= 0 && <Badge tone="neutral">{`J-${daysLeft}`}</Badge>}
          <WatchBell companyId={dividend.companyId} initiallyWatching={isWatching} loggedIn={loggedIn} />
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: `DiviAlerteClient` — tabs + list**

```tsx
// web/app/divialerte/DiviAlerteClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { DividendCard, type DividendCardData } from "@/components/divialerte/DividendCard";

type DiviAlerteTab = "toutes" | "suivies";

export function DiviAlerteClient({
  loggedIn,
  watchedCompanyIds,
  dividends,
}: {
  loggedIn: boolean;
  watchedCompanyIds: string[];
  dividends: DividendCardData[];
}) {
  const [tab, setTab] = useState<DiviAlerteTab>("toutes");
  const watchedSet = new Set(watchedCompanyIds);

  const visibleDividends =
    tab === "toutes" ? dividends : dividends.filter((d) => watchedSet.has(d.companyId));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">DiviAlerte</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("toutes")}
          className={[
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            tab === "toutes" ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
          ].join(" ")}
        >
          Toutes
        </button>
        <button
          type="button"
          onClick={() => setTab("suivies")}
          className={[
            "rounded-full px-3.5 py-1.5 text-sm font-semibold",
            tab === "suivies" ? "bg-action-primary text-white" : "bg-black/5 text-text-secondary",
          ].join(" ")}
        >
          Suivies
        </button>
      </div>

      {tab === "suivies" && !loggedIn ? (
        <div className="flex flex-col items-center gap-3 rounded-m border border-border-subtle p-8 text-center">
          <p className="text-text-secondary">Connectez-vous pour suivre des dividendes.</p>
          <Link href="/login?redirectTo=/divialerte" className="font-semibold text-text-primary underline">
            Se connecter
          </Link>
        </div>
      ) : visibleDividends.length === 0 ? (
        <p className="text-center text-text-tertiary">Aucun dividende à venir actuellement.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleDividends.map((dividend) => (
            <DividendCard
              key={dividend.companyId}
              dividend={dividend}
              loggedIn={loggedIn}
              isWatching={watchedSet.has(dividend.companyId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Replace the placeholder page**

```tsx
// web/app/divialerte/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DiviAlerteClient } from "./DiviAlerteClient";

export default async function DiviAlertePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentYear = new Date().getUTCFullYear();

  const { data: dividends } = await supabase
    .from("divialerte_dividends")
    .select(
      "id, company_id, montant, rendement, date_detachement, date_paiement, divialerte_companies(name, country)"
    )
    .eq("exercice_year", currentYear)
    .order("date_detachement", { ascending: true, nullsFirst: false });

  let watchedCompanyIds = new Set<string>();
  if (user) {
    const { data: watchlist } = await supabase
      .from("divialerte_watchlist")
      .select("company_id")
      .eq("profile_id", user.id);
    watchedCompanyIds = new Set((watchlist ?? []).map((w: { company_id: string }) => w.company_id));
  }

  return (
    <DiviAlerteClient
      loggedIn={!!user}
      watchedCompanyIds={Array.from(watchedCompanyIds)}
      dividends={(dividends ?? []).map(
        (d: {
          id: string;
          company_id: string;
          montant: number | null;
          rendement: number | null;
          date_detachement: string | null;
          date_paiement: string | null;
          divialerte_companies: { name: string; country: string | null } | null;
        }) => ({
          companyId: d.company_id,
          companyName: d.divialerte_companies?.name ?? "Société inconnue",
          country: d.divialerte_companies?.country ?? null,
          montant: d.montant,
          rendement: d.rendement,
          dateDetachement: d.date_detachement,
          datePaiement: d.date_paiement,
        })
      )}
    />
  );
}
```

- [ ] **Step 5: Manual check**

```bash
cd web
npm run dev
```

Visit `http://localhost:3000/divialerte` — confirm the "Toutes" tab lists any dividends inserted by Task 10's manual verification, each with a countdown badge, and a "net (IRVM)" amount next to the gross montant for companies whose country was captured (Sika-sourced ones). Click the bell while logged out — confirm it redirects to `/login?redirectTo=/divialerte` showing "Connecte-toi pour accéder à DiviAlerte." Log in, click a bell — confirm it toggles instantly, and that the "Suivies" tab now shows only that company. Refresh the page — confirm the watched state persists.

- [ ] **Step 6: Commit**

```bash
git add web/components/divialerte web/app/divialerte
git commit -m "feat: add DiviAlerte calendar and watchlist UI with IRVM net amounts"
```

---

## Final Verification

- [ ] **Run the full test suite**

```bash
cd web
npm test
```

Expected: all test files pass (existing 44 + 5 companyMatching + 6 mergeDividends + 5 dateUtils + 7 alertLogic + 4 parseDividendTable + 7 irvm + 3 cron route + 4 watchlist route = 85 tests).

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

Expected: build succeeds, no ESLint errors. (If it fails with a "No API key provided" error for an unrelated cron route, check `web/.env.local` has all keys from the main repo copy — this is an environment issue, not a code issue; see the note in Global Constraints if working in a worktree.)
