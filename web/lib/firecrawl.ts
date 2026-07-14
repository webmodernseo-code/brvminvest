import { FirecrawlAppV1 } from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlAppV1({ apiKey: process.env.FIRECRAWL_API_KEY! });

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
