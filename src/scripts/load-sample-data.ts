import { VectorStore } from '../services/vector-store';
import { Document } from '../services/document-processor';

const sampleDocuments: Document[] = [
  {
    content: "Our economic principles at Berkshire are simple: we buy businesses we can understand that are trading at reasonable prices relative to their earnings power. We focus on companies with strong competitive positions and predictable cash flows. We prefer businesses that don't require significant capital expenditures to maintain their competitive position.",
    metadata: {
      filename: "berkshire-hathaway-2023.pdf",
      year: "2023",
      chunk_index: 0
    }
  },
  {
    content: "Cryptocurrency has no productive output. It produces nothing, creates nothing, and adds no value to society. It is essentially a gambling token, and we will never invest in it. Our focus remains on productive assets that generate real value for shareholders and society.",
    metadata: {
      filename: "berkshire-hathaway-2022.pdf", 
      year: "2022",
      chunk_index: 1
    }
  },
  {
    content: "The key to successful investing is buying wonderful companies at fair prices, not fair companies at wonderful prices. We look for businesses with wide economic moats - sustainable competitive advantages that protect their profits from competitors. These might include brand recognition, economies of scale, or regulatory advantages.",
    metadata: {
      filename: "berkshire-hathaway-2023.pdf",
      year: "2023", 
      chunk_index: 2
    }
  },
  {
    content: "Market volatility is not risk - it's opportunity. When others are fearful, we see chances to buy great businesses at discounted prices. Our cash position allows us to take advantage of market downturns when quality companies trade below their intrinsic value.",
    metadata: {
      filename: "berkshire-hathaway-2021.pdf",
      year: "2021",
      chunk_index: 3
    }
  },
  {
    content: "Management quality is perhaps the most important factor in our investment decisions. We look for leaders who are honest, competent, and aligned with shareholder interests. They should have a track record of capital allocation excellence and treating shareholders fairly.",
    metadata: {
      filename: "berkshire-hathaway-2023.pdf", 
      year: "2023",
      chunk_index: 4
    }
  }
];

export async function loadSampleData() {
  const vectorStore = new VectorStore();
  
  console.log('Loading sample Berkshire Hathaway data...');
  
  try {
    for (let i = 0; i < sampleDocuments.length; i++) {
      const doc = sampleDocuments[i];
      console.log(`Inserting document ${i + 1}/${sampleDocuments.length}: ${doc.metadata.filename}`);
      await vectorStore.insertDocument(doc);
    }
    
    const count = await vectorStore.getDocumentCount();
    console.log(`Successfully loaded ${sampleDocuments.length} documents. Total documents in database: ${count}`);
  } catch (error) {
    console.error('Error loading sample data:', error);
    throw error;
  }
}

// Run if this file is executed directly
loadSampleData().catch(console.error);