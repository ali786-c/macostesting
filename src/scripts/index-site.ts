/**
 * Site indexing script
 * Crawls the site, extracts content, generates embeddings, and stores in vector store
 */

import { parseSitemap, crawlPages, chunkContent } from '../lib/chatbot/crawler';
import { generateEmbeddingsBatch } from '../lib/chatbot/embeddings';
import { getVectorStore, VectorStore, DocumentChunk } from '../lib/chatbot/vectorStore';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITEMAP_URL = process.env.SITEMAP_URL || `${SITE_URL}/sitemap.xml`;
const MAX_PAGES = parseInt(process.env.MAX_INDEX_PAGES || '50', 10);
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '500', 10);
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '50', 10);

async function indexSite() {
  console.log('🚀 [INDEX] Starting site indexing...');
  console.log(`[INDEX] Site URL: ${SITE_URL}`);
  console.log(`[INDEX] Sitemap URL: ${SITEMAP_URL}`);
  console.log(`[INDEX] Max pages: ${MAX_PAGES}`);

  try {
    // Step 1: Parse sitemap
    console.log('\n📋 [INDEX] Step 1: Parsing sitemap...');
    const urls = await parseSitemap(SITEMAP_URL);
    
    if (urls.length === 0) {
      console.warn('[INDEX] No URLs found in sitemap. Trying to crawl homepage...');
      urls.push(SITE_URL);
    }

    console.log(`[INDEX] Found ${urls.length} URLs`);

    // Step 2: Crawl pages
    console.log('\n🕷️  [INDEX] Step 2: Crawling pages...');
    const pages = await crawlPages(urls, MAX_PAGES);
    console.log(`[INDEX] Successfully crawled ${pages.length} pages`);

    if (pages.length === 0) {
      throw new Error('No pages were successfully crawled');
    }

    // Step 3: Chunk content
    console.log('\n✂️  [INDEX] Step 3: Chunking content...');
    const allChunks: DocumentChunk[] = [];
    
    for (const page of pages) {
      const chunks = chunkContent(page.content, CHUNK_SIZE, CHUNK_OVERLAP);
      
      chunks.forEach((chunkText, index) => {
        const chunk: DocumentChunk = {
          id: VectorStore.generateChunkId(chunkText, page.url, index),
          content: chunkText,
          url: page.url,
          metadata: {
            title: page.title,
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        };
        allChunks.push(chunk);
      });
    }

    console.log(`[INDEX] Created ${allChunks.length} chunks from ${pages.length} pages`);

    // Step 4: Generate embeddings (in batches to avoid rate limits)
    console.log('\n🧮 [INDEX] Step 4: Generating embeddings...');
    const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per batch
    const embeddingsMap = new Map<string, number[]>();

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const batchTexts = batch.map(chunk => chunk.content);
      
      console.log(`[INDEX] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}...`);
      
      try {
        const batchEmbeddings = await generateEmbeddingsBatch(batchTexts);
        
        batch.forEach((chunk, idx) => {
          embeddingsMap.set(chunk.id, batchEmbeddings[idx]);
        });

        // Rate limiting: wait 1 second between batches
        if (i + BATCH_SIZE < allChunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[INDEX] Error processing batch starting at index ${i}:`, error);
        // Continue with next batch
      }
    }

    console.log(`[INDEX] Generated ${embeddingsMap.size} embeddings`);

    // Step 5: Store in vector store
    console.log('\n💾 [INDEX] Step 5: Storing in vector store...');
    const vectorStore = getVectorStore();
    vectorStore.clear(); // Clear existing data
    
    vectorStore.addChunks(allChunks, embeddingsMap);
    
    console.log(`[INDEX] Stored ${vectorStore.getSize()} chunks in vector store`);

    // Step 6: Summary
    console.log('\n✅ [INDEX] Indexing completed successfully!');
    console.log(`[INDEX] Summary:`);
    console.log(`  - Pages crawled: ${pages.length}`);
    console.log(`  - Chunks created: ${allChunks.length}`);
    console.log(`  - Embeddings generated: ${embeddingsMap.size}`);
    console.log(`  - Chunks stored: ${vectorStore.getSize()}`);

  } catch (error) {
    console.error('\n❌ [INDEX] Error during indexing:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  indexSite()
    .then(() => {
      console.log('\n🎉 [INDEX] Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 [INDEX] Fatal error:', error);
      process.exit(1);
    });
}

export { indexSite };
