import { DocumentProcessor } from '../services/document-processor';
import { VectorStore } from '../services/vector-store';
import { pool } from '../lib/database';

async function debugEmbeddingConsistency() {
  console.log('🔍 Testing embedding consistency and search functionality...\n');
  
  const processor = new DocumentProcessor();
  const vectorStore = new VectorStore();
  
  try {
    // Test 1: Generate embedding twice for same text
    console.log('Test 1: Embedding consistency');
    const testText = "Warren Buffett discusses investment principles";
    
    const embedding1 = await processor.generateEmbedding(testText);
    const embedding2 = await processor.generateEmbedding(testText);
    
    const areIdentical = embedding1.every((val, idx) => val === embedding2[idx]);
    console.log(`✅ Embeddings identical: ${areIdentical}`);
    console.log(`✅ Embedding dimensions: ${embedding1.length}`);
    console.log(`✅ Sample values: [${embedding1.slice(0, 3).map(v => v.toFixed(6)).join(', ')}...]`);
    
    if (!areIdentical) {
      console.log('❌ PROBLEM: Embeddings are not consistent!');
      return;
    }
    
    // Test 2: Insert a test document and immediately search for it
    console.log('\nTest 2: Insert and immediate search');
    
    const testDoc = {
      content: testText,
      metadata: {
        filename: "test-2024.pdf",
        year: "2024",
        chunk_index: 0
      }
    };
    
    console.log('Inserting test document...');
    await vectorStore.insertDocument(testDoc);
    
    console.log('Searching for exact same text...');
    const searchResults = await vectorStore.searchSimilar(testText, 3);
    
    console.log(`✅ Search returned ${searchResults.length} results:`);
    
    if (searchResults.length > 0) {
      searchResults.forEach((result, index) => {
        console.log(`\n📄 Result ${index + 1}:`);
        console.log(`📊 Similarity Score: ${result.similarity_score.toFixed(6)}`);
        console.log(`📅 Year: ${result.metadata.year}`);
        console.log(`📋 Content: ${result.content.substring(0, 100)}...`);
      });
    } else {
      console.log('❌ PROBLEM: No search results found!');
      
      // Debug the search query directly
      console.log('\n🔍 Testing direct database query...');
      const client = await pool.connect();
      
      const embedding = await processor.generateEmbedding(testText);
      const embeddingVector = `[${embedding.join(',')}]`;
      
      const dbResult = await client.query(`
        SELECT 
          content,
          metadata,
          1 - (embedding <=> $1::vector) as similarity_score,
          embedding <=> $1::vector as distance
        FROM documents 
        WHERE content = $2
        ORDER BY embedding <=> $1::vector 
        LIMIT 3
      `, [embeddingVector, testText]);
      
      console.log(`Database query returned ${dbResult.rows.length} rows`);
      if (dbResult.rows.length > 0) {
        dbResult.rows.forEach(row => {
          console.log(`Direct query result: similarity=${row.similarity_score}, distance=${row.distance}`);
        });
      }
      
      client.release();
    }
    
    // Test 3: Check existing documents
    console.log('\nTest 3: Search in existing documents');
    
    const cryptoQuery = "cryptocurrency";
    console.log(`Searching for: "${cryptoQuery}"`);
    
    const cryptoResults = await vectorStore.searchSimilar(cryptoQuery, 2);
    console.log(`Crypto search returned ${cryptoResults.length} results:`);
    
    cryptoResults.forEach((result, index) => {
      console.log(`\n📄 Result ${index + 1}:`);
      console.log(`📊 Similarity Score: ${result.similarity_score.toFixed(6)}`);
      console.log(`📅 Year: ${result.metadata.year}`);  
      console.log(`📋 Content: ${result.content.substring(0, 150)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugEmbeddingConsistency().catch(console.error);