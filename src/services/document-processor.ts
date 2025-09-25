// Dynamically import PDF parser to avoid startup issues
let pdfParse: any;
import fs from 'fs/promises';
import OpenAI from 'openai';
import { MockEmbeddingService } from './mock-embeddings';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mockEmbedding = new MockEmbeddingService();

export interface Document {
  content: string;
  metadata: {
    filename: string;
    year: string;
    page?: number;
    chunk_index: number;
  };
}

export class DocumentProcessor {
  private chunkSize = 1000;
  private chunkOverlap = 200;
  private isProduction = process.env.NODE_ENV === 'production';

  async processPDF(filePath: string): Promise<Document[]> {
    try {
      console.log(`Processing PDF: ${filePath}`);
      
      // Check if file exists
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await fs.readFile(filePath);
      } catch (error) {
        const errorMsg = `⚠️  PDF file not found: ${filePath}`;
        console.error(errorMsg);
        
        if (this.isProduction) {
          throw new Error(`PRODUCTION ERROR: ${errorMsg}. Authentic PDFs are required in production mode.`);
        }
        
        console.warn(`📝 Using realistic sample content for development/demo purposes`);
        console.warn(`🏭 For production: place actual PDFs in the specified path`);
        return this.generateSampleContent(filePath);
      }

      // Parse PDF content with dynamic import
      if (!pdfParse) {
        pdfParse = (await import('pdf-parse')).default;
      }
      const data = await pdfParse(pdfBuffer);
      const filename = filePath.split('/').pop() || '';
      const year = this.extractYear(filename);
      
      console.log(`Extracted ${data.text.length} characters from ${filename}`);
      
      // Chunk the extracted text
      const chunks = this.chunkText(data.text, this.chunkSize, this.chunkOverlap);
      console.log(`Created ${chunks.length} chunks from ${filename}`);
      
      return chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          filename,
          year,
          chunk_index: index,
        },
      }));
    } catch (error) {
      const errorMsg = `❌ Error processing PDF ${filePath}: ${error.message}`;
      console.error(errorMsg);
      
      if (this.isProduction) {
        throw new Error(`PRODUCTION ERROR: ${errorMsg}. PDF processing must succeed in production mode.`);
      }
      
      console.warn(`📝 Using realistic sample content for development/demo purposes`);
      console.warn(`🏭 For production: ensure PDFs are accessible and pdf-parse compatible`);
      return this.generateSampleContent(filePath);
    }
  }

  private generateSampleContent(filePath: string): Document[] {
    const filename = filePath.split('/').pop() || '';
    const year = this.extractYear(filename);
    
    if (this.isProduction) {
      throw new Error(`PRODUCTION ERROR: Cannot generate sample content in production mode. Authentic PDFs required.`);
    }
    
    console.log(`📄 Generating sample content for ${filename} (Year: ${year})`);
    console.log(`⚠️  NOTICE: This is sample content based on Berkshire Hathaway themes`);
    console.log(`🚫 This content is NOT authentic shareholder letter text`);
    console.log(`📖 For authentic content, provide actual shareholder letter PDFs`);
    
    // Generate realistic Berkshire Hathaway sample content based on year
    const sampleTexts = this.getBerkshireSampleContent(year);
    
    return sampleTexts.map((content, index) => ({
      content,
      metadata: {
        filename,
        year,
        chunk_index: index,
      },
    }));
  }

  private getBerkshireSampleContent(year: string): string[] {
    const baseContent = {
      '2023': [
        "To the Shareholders of Berkshire Hathaway Inc.: Charlie Munger and I have the good fortune to work with a truly exceptional group of managers. These individuals run their operations with autonomy and dedication that would make any CEO proud. At Berkshire, our managers know that they will not be second-guessed by headquarters so long as their business strategies make sense, their conduct is ethical, and their communications with us are transparent. Our hands-off approach allows these talented individuals to maximize the potential of their operations.",
        "We continue to focus on businesses with enduring competitive advantages, or what we call economic moats. These businesses possess pricing power, cost advantages, high switching costs, or other attributes that protect them from competition. We prefer companies that can grow their earnings while requiring minimal capital investment. This approach has served us well over the decades and remains central to our investment philosophy.",
        "The key to successful investing is understanding that you're buying a piece of a business, not a stock symbol. When we invest in a company, we think like owners, not traders. We want to own businesses that we can understand, that have predictable cash flows, and that are managed by competent and honest people. This approach may seem simple, but it's surprisingly difficult to execute consistently.",
      ],
      '2022': [
        "Cryptocurrency and digital assets continue to capture headlines, but we remain skeptical of their intrinsic value. These assets produce nothing - they don't generate cash flows, create products, or provide services. They are essentially speculative instruments that derive their value solely from the hope that someone else will pay more for them tomorrow. This violates our fundamental investment principles of buying productive assets at reasonable prices.",
        "American business has been the primary driver of our country's prosperity over the past century. Despite periodic setbacks, recessions, and market volatility, the long-term trajectory of American enterprise remains remarkably positive. We continue to believe that betting against America has been, and will continue to be, a mistake. Our diversified portfolio of American businesses reflects this conviction.",
        "Management quality is perhaps the most important factor in our investment decisions. We look for leaders who think like owners, allocate capital wisely, and maintain the highest ethical standards. These individuals should be able to explain their businesses clearly and honestly to shareholders. When we find such leaders running excellent businesses at reasonable prices, we try to become long-term partners with them.",
      ],
      '2021': [
        "The pandemic tested businesses worldwide, revealing both strengths and vulnerabilities in different industries. Our decentralized structure and diverse portfolio helped us weather this unprecedented challenge. While some of our businesses suffered, others thrived. This diversification, combined with our strong balance sheet, allowed us to continue investing for the long term even during uncertain times.",
        "Market volatility creates opportunities for patient investors with permanent capital. During periods of widespread pessimism, we often find excellent businesses trading at attractive prices. Our ability to act decisively during these periods, without the pressure of quarterly performance metrics or fund redemptions, gives us a significant advantage over many other investors.",
        "We remain committed to our acquisition strategy of buying entire businesses rather than just stock positions. When we acquire companies, we provide stability and permanence that appeals to many business owners. We promise minimal interference with successful operations while providing access to Berkshire's financial strength and resources.",
      ],
    };

    return baseContent[year] || baseContent['2022']; // Default to 2022 content if year not found
  }

  private extractYear(filename: string): string {
    // Extract year from filename like "berkshire-hathaway-2023.pdf"
    const yearMatch = filename.match(/(\d{4})/);
    return yearMatch ? yearMatch[1] : 'unknown';
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to break at sentence or paragraph boundaries
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start) {
          end = breakPoint + 1;
        }
      }
      
      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.warn('OpenAI API unavailable, using mock embeddings for development:', error.message);
      // Fallback to mock embeddings for development
      return mockEmbedding.generateMockEmbedding(text);
    }
  }
}