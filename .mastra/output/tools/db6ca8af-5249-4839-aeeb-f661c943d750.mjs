import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

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
    const { query, limit = 5} = context.input;
    return {
      results: [
        {
          content: "Investment philosophy placeholder - will be replaced with actual document content",
          metadata: {
            year: "2023",
            document: "Berkshire Hathaway Annual Letter 2023",
            page: 1
          },
          similarity_score: 0.95
        }
      ],
      summary: `Found ${limit} relevant passages about "${query}" in Berkshire Hathaway shareholder letters.`
    };
  }
});

export { vectorSearchTool };
