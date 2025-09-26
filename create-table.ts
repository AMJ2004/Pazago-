import { db } from './src/lib/database';
import { sql } from 'drizzle-orm';

async function createTable() {
  try {
    // Enable vector extension
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Create documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB,
        embedding vector(1536)
      );
    `);

    console.log('Table created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

createTable().catch(console.error);
