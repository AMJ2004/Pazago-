import { db } from '../lib/database';
import { sql } from 'drizzle-orm';
import { DocumentProcessor, Document } from './document-processor';
import { pool } from '../lib/database';

export interface SearchResult {
  content: string;
  metadata: {
    filename: string;
    year: string;
    chunk_index: number;
  };
  similarity_score: number;
}

export class VectorStore {
  private documentProcessor = new DocumentProcessor();

  async insertDocument(doc: Document): Promise<void> {
    try {
      const embedding = await this.documentProcessor.generateEmbedding(doc.content);
      
      await db.execute(sql`
        INSERT INTO documents (content, metadata, embedding)
        VALUES (${doc.content}, ${JSON.stringify(doc.metadata)}, ${JSON.stringify(embedding)})
      `);
    } catch (error) {
      console.error('Error inserting document:', error);
      throw error;
    }
  }

  async searchSimilar(
    query: string, 
    limit: number = 5, 
    yearFilter?: string
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.documentProcessor.generateEmbedding(query);
      
      // Convert embedding to vector format for PostgreSQL  
      const embeddingVector = `[${queryEmbedding.join(',')}]`;
      
      const client = await pool.connect();
      
      let sqlQuery: string;
      let params: any[];
      
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
      
      return results.rows.map((row: any) => ({
        content: row.content,
        metadata: row.metadata,
        similarity_score: parseFloat(row.similarity_score || 0),
      }));
    } catch (error) {
      console.error('Error searching similar documents:', error);
      return []; // Return empty array on error to prevent crashes
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM documents`);
      return parseInt(result.rows[0].count as string);
    } catch (error) {
      console.error('Error getting document count:', error);
      return 0;
    }
  }
}