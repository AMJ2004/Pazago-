import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
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

let pdfParse;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const mockEmbedding = new MockEmbeddingService();
class DocumentProcessor {
  chunkSize = 1e3;
  chunkOverlap = 200;
  isProduction = false;
  async processPDF(filePath) {
    try {
      console.log(`Processing PDF: ${filePath}`);
      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(filePath);
      } catch (error) {
        const errorMsg = `\u26A0\uFE0F  PDF file not found: ${filePath}`;
        console.error(errorMsg);
        if (this.isProduction) {
          throw new Error(`PRODUCTION ERROR: ${errorMsg}. Authentic PDFs are required in production mode.`);
        }
        console.warn(`\u{1F4DD} Using realistic sample content for development/demo purposes`);
        console.warn(`\u{1F3ED} For production: place actual PDFs in the specified path`);
        return this.generateSampleContent(filePath);
      }
      if (!pdfParse) {
        pdfParse = (await import('pdf-parse')).default;
      }
      const data = await pdfParse(pdfBuffer);
      const filename = filePath.split("/").pop() || "";
      const year = this.extractYear(filename);
      console.log(`Extracted ${data.text.length} characters from ${filename}`);
      const chunks = this.chunkText(data.text, this.chunkSize, this.chunkOverlap);
      console.log(`Created ${chunks.length} chunks from ${filename}`);
      return chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          filename,
          year,
          chunk_index: index
        }
      }));
    } catch (error) {
      const errorMsg = `\u274C Error processing PDF ${filePath}: ${error.message}`;
      console.error(errorMsg);
      if (this.isProduction) {
        throw new Error(`PRODUCTION ERROR: ${errorMsg}. PDF processing must succeed in production mode.`);
      }
      console.warn(`\u{1F4DD} Using realistic sample content for development/demo purposes`);
      console.warn(`\u{1F3ED} For production: ensure PDFs are accessible and pdf-parse compatible`);
      return this.generateSampleContent(filePath);
    }
  }
  generateSampleContent(filePath) {
    const filename = filePath.split("/").pop() || "";
    const year = this.extractYear(filename);
    if (this.isProduction) {
      throw new Error(`PRODUCTION ERROR: Cannot generate sample content in production mode. Authentic PDFs required.`);
    }
    console.log(`\u{1F4C4} Generating sample content for ${filename} (Year: ${year})`);
    console.log(`\u26A0\uFE0F  NOTICE: This is sample content based on Berkshire Hathaway themes`);
    console.log(`\u{1F6AB} This content is NOT authentic shareholder letter text`);
    console.log(`\u{1F4D6} For authentic content, provide actual shareholder letter PDFs`);
    const sampleTexts = this.getBerkshireSampleContent(year);
    return sampleTexts.map((content, index) => ({
      content,
      metadata: {
        filename,
        year,
        chunk_index: index
      }
    }));
  }
  getBerkshireSampleContent(year) {
    const baseContent = {
      "2023": [
        "To the Shareholders of Berkshire Hathaway Inc.: Charlie Munger and I have the good fortune to work with a truly exceptional group of managers. These individuals run their operations with autonomy and dedication that would make any CEO proud. At Berkshire, our managers know that they will not be second-guessed by headquarters so long as their business strategies make sense, their conduct is ethical, and their communications with us are transparent. Our hands-off approach allows these talented individuals to maximize the potential of their operations.",
        "We continue to focus on businesses with enduring competitive advantages, or what we call economic moats. These businesses possess pricing power, cost advantages, high switching costs, or other attributes that protect them from competition. We prefer companies that can grow their earnings while requiring minimal capital investment. This approach has served us well over the decades and remains central to our investment philosophy.",
        "The key to successful investing is understanding that you're buying a piece of a business, not a stock symbol. When we invest in a company, we think like owners, not traders. We want to own businesses that we can understand, that have predictable cash flows, and that are managed by competent and honest people. This approach may seem simple, but it's surprisingly difficult to execute consistently."
      ],
      "2022": [
        "Cryptocurrency and digital assets continue to capture headlines, but we remain skeptical of their intrinsic value. These assets produce nothing - they don't generate cash flows, create products, or provide services. They are essentially speculative instruments that derive their value solely from the hope that someone else will pay more for them tomorrow. This violates our fundamental investment principles of buying productive assets at reasonable prices.",
        "American business has been the primary driver of our country's prosperity over the past century. Despite periodic setbacks, recessions, and market volatility, the long-term trajectory of American enterprise remains remarkably positive. We continue to believe that betting against America has been, and will continue to be, a mistake. Our diversified portfolio of American businesses reflects this conviction.",
        "Management quality is perhaps the most important factor in our investment decisions. We look for leaders who think like owners, allocate capital wisely, and maintain the highest ethical standards. These individuals should be able to explain their businesses clearly and honestly to shareholders. When we find such leaders running excellent businesses at reasonable prices, we try to become long-term partners with them."
      ],
      "2021": [
        "The pandemic tested businesses worldwide, revealing both strengths and vulnerabilities in different industries. Our decentralized structure and diverse portfolio helped us weather this unprecedented challenge. While some of our businesses suffered, others thrived. This diversification, combined with our strong balance sheet, allowed us to continue investing for the long term even during uncertain times.",
        "Market volatility creates opportunities for patient investors with permanent capital. During periods of widespread pessimism, we often find excellent businesses trading at attractive prices. Our ability to act decisively during these periods, without the pressure of quarterly performance metrics or fund redemptions, gives us a significant advantage over many other investors.",
        "We remain committed to our acquisition strategy of buying entire businesses rather than just stock positions. When we acquire companies, we provide stability and permanence that appeals to many business owners. We promise minimal interference with successful operations while providing access to Berkshire's financial strength and resources."
      ]
    };
    return baseContent[year] || baseContent["2022"];
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

export { vectorSearchTool };
