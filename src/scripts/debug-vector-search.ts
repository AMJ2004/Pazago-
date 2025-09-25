import { pool } from '../lib/database';
import { DocumentProcessor } from '../services/document-processor';

async function debugVectorSearch() {
  console.log('🔍 Debugging vector search functionality...\n');
  
  const processor = new DocumentProcessor();
  
  try {
    // Test 1: Check if we can connect to database
    console.log('Test 1: Database connection');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test 2: Check document count
    const countResult = await client.query('SELECT COUNT(*) as count FROM documents');
    console.log(`✅ Found ${countResult.rows[0].count} documents in database`);
    
    // Test 3: Check if we can fetch a sample document
    const sampleResult = await client.query('SELECT content, metadata FROM documents LIMIT 1');
    if (sampleResult.rows.length > 0) {
      console.log('✅ Sample document:', sampleResult.rows[0].content.substring(0, 100) + '...');
    }
    
    // Test 4: Generate a test embedding
    console.log('\nTest 4: Generate test embedding');
    const testQuery = "cryptocurrency";
    const embedding = await processor.generateEmbedding(testQuery);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    
    // Test 5: Try vector search query
    console.log('\nTest 5: Vector similarity search');
    const embeddingVector = `[${embedding.join(',')}]`;
    
    const searchQuery = `
      SELECT 
        content, 
        metadata,
        1 - (embedding <=> $1::vector) as similarity_score
      FROM documents
      ORDER BY embedding <=> $1::vector
      LIMIT 3
    `;
    
    console.log('Executing vector search query...');
    const searchResult = await client.query(searchQuery, [embeddingVector]);
    
    console.log(`✅ Search returned ${searchResult.rows.length} results:`);
    searchResult.rows.forEach((row, index) => {
      console.log(`\n📄 Result ${index + 1}:`);
      console.log(`Score: ${row.similarity_score}`);
      console.log(`Content: ${row.content.substring(0, 100)}...`);
      console.log(`Year: ${row.metadata.year}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugVectorSearch().catch(console.error);