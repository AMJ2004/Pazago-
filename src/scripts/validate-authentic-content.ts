import { VectorStore } from '../services/vector-store';

async function validateAuthenticContent() {
  console.log('🔍 Validating Authentic Content...\n');
  
  const vectorStore = new VectorStore();
  
  try {
    // Check if we're in production mode
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    
    // Get document count
    const count = await vectorStore.getDocumentCount();
    console.log(`📊 Documents in database: ${count}`);
    
    if (count === 0) {
      const msg = '❌ No documents found in database';
      console.log(msg);
      if (isProduction) {
        throw new Error(`PRODUCTION ERROR: ${msg}. Database must contain authentic content.`);
      }
      return;
    }
    
    // Test searches for authentic content indicators
    const testQueries = [
      { query: "cryptocurrency", expectedInAuthentic: true },
      { query: "investment philosophy", expectedInAuthentic: true },
      { query: "management quality", expectedInAuthentic: true },
    ];
    
    let sampleContentDetected = false;
    
    for (const test of testQueries) {
      console.log(`\n🔍 Testing query: "${test.query}"`);
      const results = await vectorStore.searchSimilar(test.query, 3);
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results`);
        
        // Check for sample content indicators
        results.forEach((result, index) => {
          const content = result.content.toLowerCase();
          
          // Sample content tends to be more generic and structured
          const sampleIndicators = [
            'this approach has served us well',
            'we continue to focus on',
            'the key to successful investing',
            'management quality is perhaps the most important'
          ];
          
          const hasSampleIndicators = sampleIndicators.some(indicator => 
            content.includes(indicator.toLowerCase())
          );
          
          if (hasSampleIndicators) {
            sampleContentDetected = true;
            console.warn(`⚠️  Result ${index + 1}: Appears to be sample content`);
          } else {
            console.log(`✅ Result ${index + 1}: Appears to be authentic content`);
          }
        });
      } else {
        console.log(`❌ No results found for "${test.query}"`);
      }
    }
    
    // Final validation
    console.log('\n📋 Content Validation Summary:');
    
    if (sampleContentDetected) {
      const msg = '⚠️  SAMPLE CONTENT DETECTED - Not suitable for production use';
      console.warn(msg);
      
      if (isProduction) {
        throw new Error(`PRODUCTION ERROR: ${msg}. Only authentic Berkshire Hathaway content allowed.`);
      } else {
        console.log('📝 This is acceptable for development/demo purposes');
        console.log('🏭 For production: Load authentic Berkshire Hathaway PDFs');
      }
    } else {
      console.log('✅ Content appears to be authentic');
      console.log('🎯 System ready for production use');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateAuthenticContent().catch(console.error);