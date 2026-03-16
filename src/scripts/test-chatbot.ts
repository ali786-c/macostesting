/**
 * Basic tests for the chatbot RAG system
 */

import { getVectorStore } from '../lib/chatbot/vectorStore';
import { generateEmbedding } from '../lib/chatbot/embeddings';
import { generateResponse } from '../lib/chatbot/llm';

async function testRetrieval() {
  console.log('🧪 [TEST] Testing retrieval...');
  
  const vectorStore = getVectorStore();
  
  if (vectorStore.getSize() === 0) {
    console.error('❌ [TEST] Vector store is empty. Please run indexing first.');
    return false;
  }

  const testQuery = 'comment réserver';
  console.log(`[TEST] Query: "${testQuery}"`);
  
  try {
    const queryEmbedding = await generateEmbedding(testQuery);
    const results = vectorStore.searchSimilar(queryEmbedding, 3, 0.5);
    
    console.log(`[TEST] Found ${results.length} results`);
    results.forEach((result, idx) => {
      console.log(`[TEST] Result ${idx + 1}:`);
      console.log(`  URL: ${result.chunk.url}`);
      console.log(`  Score: ${result.score.toFixed(3)}`);
      console.log(`  Content preview: ${result.chunk.content.substring(0, 100)}...`);
    });
    
    return results.length > 0;
  } catch (error) {
    console.error('[TEST] Error:', error);
    return false;
  }
}

async function testFallback() {
  console.log('\n🧪 [TEST] Testing fallback (no relevant results)...');
  
  const vectorStore = getVectorStore();
  
  if (vectorStore.getSize() === 0) {
    console.error('❌ [TEST] Vector store is empty. Please run indexing first.');
    return false;
  }

  const testQuery = 'xyzabc123nonexistentquery';
  console.log(`[TEST] Query: "${testQuery}"`);
  
  try {
    const queryEmbedding = await generateEmbedding(testQuery);
    const results = vectorStore.searchSimilar(queryEmbedding, 3, 0.8); // High threshold
    
    console.log(`[TEST] Found ${results.length} results (should be 0 or low score)`);
    
    if (results.length === 0) {
      console.log('✅ [TEST] Fallback works correctly - no results found');
      return true;
    }
    
    const maxScore = Math.max(...results.map(r => r.score));
    if (maxScore < 0.7) {
      console.log(`✅ [TEST] Fallback works correctly - max score ${maxScore.toFixed(3)} is below threshold`);
      return true;
    }
    
    console.log(`⚠️  [TEST] Fallback may not work - found results with score ${maxScore.toFixed(3)}`);
    return false;
  } catch (error) {
    console.error('[TEST] Error:', error);
    return false;
  }
}

async function testSourceCitation() {
  console.log('\n🧪 [TEST] Testing source citation...');
  
  const vectorStore = getVectorStore();
  
  if (vectorStore.getSize() === 0) {
    console.error('❌ [TEST] Vector store is empty. Please run indexing first.');
    return false;
  }

  const testQuery = 'comment réserver un espace';
  console.log(`[TEST] Query: "${testQuery}"`);
  
  try {
    const queryEmbedding = await generateEmbedding(testQuery);
    const results = vectorStore.searchSimilar(queryEmbedding, 3, 0.6);
    
    if (results.length === 0) {
      console.log('⚠️  [TEST] No results found - cannot test citation');
      return false;
    }
    
    const sources = Array.from(new Set(results.map(r => r.chunk.url)));
    console.log(`[TEST] Found ${sources.length} unique sources:`);
    sources.forEach((source, idx) => {
      console.log(`  ${idx + 1}. ${source}`);
    });
    
    return sources.length > 0;
  } catch (error) {
    console.error('[TEST] Error:', error);
    return false;
  }
}

async function testFullPipeline() {
  console.log('\n🧪 [TEST] Testing full pipeline (retrieval + LLM)...');
  
  const vectorStore = getVectorStore();
  
  if (vectorStore.getSize() === 0) {
    console.error('❌ [TEST] Vector store is empty. Please run indexing first.');
    return false;
  }

  const testQuery = 'comment réserver';
  console.log(`[TEST] Query: "${testQuery}"`);
  
  try {
    const queryEmbedding = await generateEmbedding(testQuery);
    const results = vectorStore.searchSimilar(queryEmbedding, 3, 0.6);
    
    if (results.length === 0) {
      console.log('⚠️  [TEST] No results found - cannot test full pipeline');
      return false;
    }
    
    const contextChunks = results.map(({ chunk }) => ({
      content: chunk.content,
      url: chunk.url,
    }));
    
    const response = await generateResponse(testQuery, contextChunks);
    
    console.log(`[TEST] Generated response:`);
    console.log(`  ${response.answer.substring(0, 200)}...`);
    console.log(`  Model: ${response.model}`);
    
    return response.answer.length > 0;
  } catch (error) {
    console.error('[TEST] Error:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 [TEST] Starting chatbot tests...\n');
  
  const results = {
    retrieval: await testRetrieval(),
    fallback: await testFallback(),
    citation: await testSourceCitation(),
    pipeline: await testFullPipeline(),
  };
  
  console.log('\n📊 [TEST] Test Results:');
  console.log(`  Retrieval: ${results.retrieval ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Fallback: ${results.fallback ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Citation: ${results.citation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Pipeline: ${results.pipeline ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅' : '❌'} Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('💥 [TEST] Fatal error:', error);
    process.exit(1);
  });
}

export { testRetrieval, testFallback, testSourceCitation, testFullPipeline };
