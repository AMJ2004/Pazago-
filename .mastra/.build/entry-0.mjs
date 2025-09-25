import { Mastra } from '@mastra/core/mastra';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
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
  model: openai("gpt-4o-mini"),
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  tools: { vectorSearchTool }
});

const mastra = new Mastra({
  agents: {
    berkshireAgent
  }
});

export { mastra };
