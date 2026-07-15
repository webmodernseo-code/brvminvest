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
