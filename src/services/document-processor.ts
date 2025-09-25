// Temporarily disable PDF processing to fix startup issues
// import * as pdf from 'pdf-parse';
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

  async processPDF(filePath: string): Promise<Document[]> {
    // Temporarily return sample data until PDF processing is fixed
    const filename = filePath.split('/').pop() || '';
    const year = this.extractYear(filename);
    
    const sampleText = "This is sample content from a Berkshire Hathaway letter. Warren Buffett discusses investment principles and company performance.";
    const chunks = this.chunkText(sampleText, this.chunkSize, this.chunkOverlap);
    
    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        filename,
        year,
        chunk_index: index,
      },
    }));
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