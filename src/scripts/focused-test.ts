import { VectorStore } from '../services/vector-store';

async function focusedTest() {
  console.log('🎯 Focused RAG Test\n');
  
  const vectorStore = new VectorStore();
  
  try {
    // Check document count
    const count = await vectorStore.getDocumentCount();
    console.log(`📊 Documents in database: ${count}\n`);
    
    if (count === 0) {
      console.log('❌ No documents found! Loading sample data...');
      
      // Load a single test document
      const testDoc = {
        content: "Cryptocurrency has no productive output. It produces nothing, creates nothing, and adds no value to society. It is essentially a gambling token, and we will never invest in it.",
        metadata: {
          filename: "berkshire-hathaway-2022.pdf",
          year: "2022",
          chunk_index: 1
        }
      };
      
      await vectorStore.insertDocument(testDoc);
      console.log('✅ Inserted test document');
    }
    
    // Test specific query
    console.log('🔍 Testing cryptocurrency query...');
    const results = await vectorStore.searchSimilar("cryptocurrency", 3);
    
    console.log(`📋 Results: ${results.length}`);
    results.forEach((result, index) => {
      console.log(`\n📄 Result ${index + 1}:`);
      console.log(`📊 Score: ${result.similarity_score.toFixed(4)}`);
      console.log(`📅 Year: ${result.metadata.year}`);
      console.log(`📝 Content: ${result.content.substring(0, 100)}...`);
    });
    
    if (results.length === 0) {
      console.log('\n❌ Still no results. Testing simpler query...');
      
      // Try searching for exact words from the document
      const simpleResults = await vectorStore.searchSimilar("gambling token", 3);
      console.log(`Simple query results: ${simpleResults.length}`);
      
      // Try searching for very common words
      const basicResults = await vectorStore.searchSimilar("investment", 3);
      console.log(`Basic query results: ${basicResults.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

focusedTest().catch(console.error);