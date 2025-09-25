import { Mastra } from '@mastra/core/mastra';
import { openai as openai$1 } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';
import OpenAI from 'openai';

neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

class MockEmbeddingService {
  // Generate a simple hash-based mock embedding that's consistent for the same text
  generateMockEmbedding(text, dimensions = 1536) {
    const embedding = new Array(dimensions).fill(0);
    let hash = this.stableHash(text);
    const rng = this.seededRandom(Math.abs(hash));
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = (rng() - 0.5) * 2;
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }
  // Create a stable hash function that's deterministic
  stableHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  // Simple seeded random number generator for consistent results
  seededRandom(seed) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const mockEmbedding = new MockEmbeddingService();
class DocumentProcessor {
  chunkSize = 1e3;
  chunkOverlap = 200;
  async processPDF(filePath) {
    const filename = filePath.split("/").pop() || "";
    const year = this.extractYear(filename);
    const sampleText = "This is sample content from a Berkshire Hathaway letter. Warren Buffett discusses investment principles and company performance.";
    const chunks = this.chunkText(sampleText, this.chunkSize, this.chunkOverlap);
    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        filename,
        year,
        chunk_index: index
      }
    }));
  }
  extractYear(filename) {
    const yearMatch = filename.match(/(\d{4})/);
    return yearMatch ? yearMatch[1] : "unknown";
  }
  chunkText(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf(".", end);
        const lastNewline = text.lastIndexOf("\n", end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > start) {
          end = breakPoint + 1;
        }
      }
      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }
    return chunks.filter((chunk) => chunk.length > 50);
  }
  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.warn("OpenAI API unavailable, using mock embeddings for development:", error.message);
      return mockEmbedding.generateMockEmbedding(text);
    }
  }
}

class VectorStore {
  documentProcessor = new DocumentProcessor();
  async insertDocument(doc) {
    try {
      const embedding = await this.documentProcessor.generateEmbedding(doc.content);
      await db.execute(sql`
        INSERT INTO documents (content, metadata, embedding)
        VALUES (${doc.content}, ${JSON.stringify(doc.metadata)}, ${JSON.stringify(embedding)})
      `);
    } catch (error) {
      console.error("Error inserting document:", error);
      throw error;
    }
  }
  async searchSimilar(query, limit = 5, yearFilter) {
    try {
      const queryEmbedding = await this.documentProcessor.generateEmbedding(query);
      const embeddingVector = `[${queryEmbedding.join(",")}]`;
      const client = await pool.connect();
      let sqlQuery;
      let params;
      if (yearFilter) {
        sqlQuery = `
          SELECT 
            content, 
            metadata,
            1 - (embedding <=> $1::vector) as similarity_score
          FROM documents
          WHERE metadata->>'year' = $2
          ORDER BY embedding <=> $1::vector
          LIMIT $3
        `;
        params = [embeddingVector, yearFilter, limit];
      } else {
        sqlQuery = `
          SELECT 
            content, 
            metadata,
            1 - (embedding <=> $1::vector) as similarity_score
          FROM documents
          ORDER BY embedding <=> $1::vector
          LIMIT $2
        `;
        params = [embeddingVector, limit];
      }
      const results = await client.query(sqlQuery, params);
      client.release();
      return results.rows.map((row) => ({
        content: row.content,
        metadata: row.metadata,
        similarity_score: parseFloat(row.similarity_score || 0)
      }));
    } catch (error) {
      console.error("Error searching similar documents:", error);
      return [];
    }
  }
  async getDocumentCount() {
    try {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM documents`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting document count:", error);
      return 0;
    }
  }
}

const vectorStore = new VectorStore();
const vectorSearchTool = createTool({
  id: "vector-search",
  description: "Search through Berkshire Hathaway shareholder letters using semantic similarity",
  inputSchema: z.object({
    query: z.string().describe("The search query about Warren Buffett's investment philosophy or Berkshire Hathaway strategy"),
    limit: z.number().optional().describe("Number of results to return, defaults to 5"),
    year_filter: z.string().optional().describe("Optional year filter (e.g., '2023', '2019-2021')")
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      content: z.string(),
      metadata: z.object({
        year: z.string(),
        document: z.string(),
        page: z.number().optional()
      }),
      similarity_score: z.number()
    })),
    summary: z.string()
  }),
  execute: async (context) => {
    const { query, limit = 5, year_filter } = context.input;
    try {
      const results = await vectorStore.searchSimilar(query, limit, year_filter);
      const formattedResults = results.map((result) => ({
        content: result.content,
        metadata: {
          year: result.metadata.year,
          document: result.metadata.filename,
          page: result.metadata.chunk_index + 1
        },
        similarity_score: result.similarity_score
      }));
      return {
        results: formattedResults,
        summary: `Found ${results.length} relevant passages about "${query}" in Berkshire Hathaway shareholder letters${year_filter ? ` from ${year_filter}` : ""}.`
      };
    } catch (error) {
      console.error("Vector search error:", error);
      return {
        results: [],
        summary: `Error searching for "${query}". Please make sure documents are loaded in the database.`
      };
    }
  }
});

const berkshireAgent = new Agent({
  name: "Berkshire Hathaway Intelligence",
  instructions: `
You are a knowledgeable financial analyst specializing in Warren Buffett's investment philosophy and Berkshire Hathaway's business strategy. Your expertise comes from analyzing years of Berkshire Hathaway annual shareholder letters.

Core Responsibilities:
- Answer questions about Warren Buffett's investment principles and philosophy
- Provide insights into Berkshire Hathaway's business strategies and decisions
- Reference specific examples from the shareholder letters when appropriate
- Maintain context across conversations for follow-up questions

Guidelines:
- Always ground your responses in the provided shareholder letter content
- Quote directly from the letters when relevant, with proper citations
- If information isn't available in the documents, clearly state this limitation
- Provide year-specific context when discussing how views or strategies evolved
- For numerical data or specific acquisitions, cite the exact source letter and year
- Explain complex financial concepts in accessible terms while maintaining accuracy

Response Format:
- Provide comprehensive, well-structured answers
- Include relevant quotes from the letters with year attribution
- List source documents used for your response
- For follow-up questions, reference previous conversation context appropriately

Remember: Your authority comes from the shareholder letters. Stay grounded in this source material and be transparent about the scope and limitations of your knowledge.
  `,
  model: openai$1("gpt-4o-mini"),
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  tools: { vectorSearchTool }
});

const mastra = new Mastra({
  agents: {
    berkshireAgent
  }
});

export { mastra };
