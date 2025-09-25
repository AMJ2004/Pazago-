import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { VectorStore } from "../../services/vector-store";

const vectorStore = new VectorStore();

export const vectorSearchTool = createTool({
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
      
      const formattedResults = results.map(result => ({
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
        summary: `Found ${results.length} relevant passages about "${query}" in Berkshire Hathaway shareholder letters${year_filter ? ` from ${year_filter}` : ''}.`
      };
    } catch (error) {
      console.error('Vector search error:', error);
      return {
        results: [],
        summary: `Error searching for "${query}". Please make sure documents are loaded in the database.`
      };
    }
  }
});