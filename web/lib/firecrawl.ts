import { FirecrawlAppV1 } from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlAppV1({ apiKey: process.env.FIRECRAWL_API_KEY! });

// The installed @mendable/firecrawl-js types don't model the "links"/"markdown"
// response shapes returned for these formats, so we describe the fields we
// actually read here rather than casting through `any`.
interface FirecrawlLinksResult {
  links?: string[];
}

interface FirecrawlMetadata {
  title?: string;
  description?: string;
  publishedTime?: string;
}

interface FirecrawlMarkdownResult {
  metadata?: FirecrawlMetadata;
  markdown?: string;
}

export async function scrapeListingLinks(listingUrl: string): Promise<{ url: string }[]> {
  const result = await firecrawl.scrapeUrl(listingUrl, { formats: ["links"] });
  if (!result.success) {
    throw new Error(`Firecrawl failed to scrape listing ${listingUrl}: ${result.error}`);
  }
  const links = (result as unknown as FirecrawlLinksResult).links;
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
  const markdownResult = result as unknown as FirecrawlMarkdownResult;
  const metadata = markdownResult.metadata ?? {};
  return {
    title: metadata.title ?? "Sans titre",
    excerpt: metadata.description ?? markdownResult.markdown?.slice(0, 280) ?? "",
    publishedAt: metadata.publishedTime ?? null,
  };
}
