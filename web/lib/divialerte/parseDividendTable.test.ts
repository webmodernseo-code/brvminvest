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
