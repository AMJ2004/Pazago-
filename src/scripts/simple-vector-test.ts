import { pool } from '../lib/database';

async function testVectorOperations() {
  console.log('Testing basic vector operations...\n');
  
  try {
    const client = await pool.connect();
    
    // Test 1: Basic vector distance operation with same vector
    console.log('Test 1: Self-similarity (should be 0)');
    const result1 = await client.query(`
      SELECT embedding <=> embedding as self_distance 
      FROM documents 
      LIMIT 1
    `);
    console.log('Self distance:', result1.rows[0]?.self_distance);
    
    // Test 2: Try comparing two different vectors
    console.log('\nTest 2: Cross-comparison');
    const result2 = await client.query(`
      SELECT 
        a.id as id_a, 
        b.id as id_b,
        a.embedding <=> b.embedding as distance
      FROM documents a 
      CROSS JOIN documents b 
      WHERE a.id != b.id 
      LIMIT 3
    `);
    
    console.log('Cross comparison results:');
    result2.rows.forEach(row => {
      console.log(`ID ${row.id_a} vs ID ${row.id_b}: distance = ${row.distance}`);
    });
    
    // Test 3: Try using an actual stored embedding for comparison
    console.log('\nTest 3: Using real embedding for search');
    
    // Get the first embedding
    const firstEmbedding = await client.query('SELECT embedding FROM documents LIMIT 1');
    
    if (firstEmbedding.rows.length > 0) {
      const embeddingText = firstEmbedding.rows[0].embedding;
      
      const result3 = await client.query(`
        SELECT 
          id,
          substring(content, 1, 50) as content_sample,
          1 - (embedding <=> $1::vector) as similarity_score
        FROM documents 
        ORDER BY embedding <=> $1::vector 
        LIMIT 3
      `, [embeddingText]);
      
      console.log('Real embedding search results:');
      result3.rows.forEach(row => {
        console.log(`ID ${row.id}: ${row.content_sample}... (similarity: ${row.similarity_score})`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error in vector operations:', error);
  }
}

testVectorOperations().catch(console.error);