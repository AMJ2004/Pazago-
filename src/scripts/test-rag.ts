import { VectorStore } from '../services/vector-store';
import { loadSampleData } from './load-sample-data';

async function testRAGSystem() {
  console.log('Testing Berkshire Hathaway Intelligence RAG System...\n');
  
  const vectorStore = new VectorStore();
  
  // Load sample data
  await loadSampleData();
  
  // Test queries
  const testQueries = [
    "What does Warren Buffett think about cryptocurrency?",
    "How does Berkshire evaluate management quality?",
    "What is Buffett's investment philosophy?",
    "How does market volatility affect Berkshire's strategy?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    console.log('─'.repeat(50));
    
    try {
      const results = await vectorStore.searchSimilar(query, 2);
      
      if (results.length > 0) {
        results.forEach((result, index) => {
          console.log(`\n📄 Result ${index + 1} (Score: ${result.similarity_score.toFixed(3)})`);
          console.log(`📅 Year: ${result.metadata.year}`);
          console.log(`📋 Content: ${result.content.substring(0, 200)}...`);
        });
      } else {
        console.log('❌ No results found');
      }
    } catch (error) {
      console.error('❌ Error searching:', error);
    }
  }
}

// Run if this file is executed directly
testRAGSystem().catch(console.error);