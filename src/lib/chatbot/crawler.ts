/**
 * Web crawler for indexing site content
 */

import { load } from 'cheerio';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  html: string;
}

const MAX_PAGES = 100; // Limit to prevent excessive crawling
const TIMEOUT_MS = 10000; // 10 seconds timeout per page

/**
 * Fetch and parse a single page
 */
export async function crawlPage(url: string): Promise<CrawledPage> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Rentoall-Bot/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Remove script and style elements
    $('script, style, nav, footer, header, .header, .footer, .nav').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || url;

    // Extract main content
    const mainContent = $('main, article, .content, .main-content, #content').first();
    const content = mainContent.length > 0
      ? mainContent.text().trim()
      : $('body').text().trim();

    // Clean up content (remove extra whitespace)
    const cleanedContent = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return {
      url,
      title,
      content: cleanedContent,
      html,
    };
  } catch (error) {
    console.error(`[CRAWLER] Error crawling ${url}:`, error);
    throw error;
  }
}

/**
 * Parse sitemap.xml to get list of URLs
 */
export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Rentoall-Bot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const xml = await response.text();
    const $ = load(xml, { xmlMode: true });

    const urls: string[] = [];
    $('urlset url loc').each((_, elem) => {
      const url = $(elem).text().trim();
      if (url) {
        urls.push(url);
      }
    });

    // Also check for sitemapindex
    $('sitemapindex sitemap loc').each((_, elem) => {
      const sitemapUrl = $(elem).text().trim();
      if (sitemapUrl) {
        // Recursively parse nested sitemaps (simplified)
      }
    });

    return urls;
  } catch (error) {
    console.error('[CRAWLER] Error parsing sitemap:', error);
    throw error;
  }
}

/**
 * Crawl multiple pages with rate limiting
 */
export async function crawlPages(urls: string[], maxPages: number = MAX_PAGES): Promise<CrawledPage[]> {
  const pagesToCrawl = urls.slice(0, maxPages);
  const results: CrawledPage[] = [];

  // Crawl pages with delay to avoid overwhelming the server
  for (let i = 0; i < pagesToCrawl.length; i++) {
    const url = pagesToCrawl[i];
    try {
      const page = await crawlPage(url);
      results.push(page);
      
      // Rate limiting: wait 500ms between requests
      if (i < pagesToCrawl.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[CRAWLER] Skipping ${url} due to error`);
      // Continue with next page
    }
  }

  return results;
}

/**
 * Split content into chunks for embedding
 */
export function chunkContent(content: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const words = content.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}
