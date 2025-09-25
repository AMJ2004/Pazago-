# Berkshire Hathaway Intelligence RAG Application

A production-ready intelligent assistant that answers questions about Warren Buffett's investment philosophy using Berkshire Hathaway shareholder letters (2019-2024) with streaming responses, vector search, and source citations.

## 🎯 Overview

This application uses the Mastra framework to provide:
- **RAG (Retrieval-Augmented Generation)** with PostgreSQL + pgvector
- **Streaming AI responses** with source citations
- **Vector similarity search** across Berkshire Hathaway content
- **Production-ready safeguards** for content authenticity
- **Interactive playground** and API endpoints

## 🚀 Quick Start

### Development Mode
```bash
# Install dependencies
npm install

# Load sample data (development)
npm run load-data

# Start development server
npm run dev

# Access playground
open http://localhost:5000
```

### Production Deployment
```bash
# Set production environment
export NODE_ENV=production
export OPENAI_API_KEY=your_openai_key
export DATABASE_URL=your_postgres_url

# Validate content authenticity
npm run validate-content

# Start production server
npm run start
```

## 🏗️ Architecture

### Core Components
- **Mastra Framework**: Agent orchestration and API management
- **PostgreSQL + pgvector**: Vector similarity search database
- **OpenAI API**: Embedding generation and chat completions
- **PDF Processing**: Document ingestion with chunking strategy

### Key Services
- `DocumentProcessor`: PDF parsing and content chunking
- `VectorStore`: Similarity search and retrieval
- `BerkshireAgent`: Investment philosophy expert agent
- `MockEmbeddingService`: Development fallback for embeddings

## 📊 API Endpoints

### Mastra Playground
- **URL**: `http://localhost:5000/`
- **Description**: Interactive chat interface
- **Features**: Streaming responses, source citations, conversation history

### API Base
- **URL**: `http://localhost:5000/api`
- **Authentication**: None (development), configure for production
- **Format**: REST API with JSON responses

### Agent Interactions
```typescript
// Example API interaction
POST /api/agents/berkshire-agent/chat
{
  "message": "What does Warren Buffett think about cryptocurrency?",
  "stream": true
}
```

## 🔍 Example Queries

### Investment Philosophy
- "What is Warren Buffett's investment philosophy?"
- "How does Berkshire evaluate management quality?"
- "What makes a good investment according to Buffett?"

### Market Strategy
- "How does market volatility affect Berkshire's strategy?"
- "What does Buffett think about market timing?"
- "How does Berkshire approach value investing?"

### Specific Topics
- "What does Warren Buffett think about cryptocurrency?"
- "How does Berkshire evaluate acquisition targets?"
- "What role does patience play in Buffett's strategy?"

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run load-data    # Load sample/authentic data
npm run test-rag     # Test RAG functionality
npm run validate-content  # Validate content authenticity
```

### Database Management
```bash
# Push schema changes
npm run db:push

# Generate migrations
npm run db:generate

# View database
npm run db:studio
```

## 📁 Project Structure

```
src/
├── mastra/
│   ├── agents/          # AI agents configuration
│   ├── tools/           # Agent tools (vector search)
│   └── index.ts         # Mastra configuration
├── services/
│   ├── document-processor.ts  # PDF processing
│   ├── vector-store.ts       # Vector operations  
│   ├── mock-embeddings.ts    # Development fallback
├── scripts/
│   ├── load-sample-data.ts   # Data loading
│   ├── test-rag.ts          # RAG testing
│   └── validate-authentic-content.ts  # Content validation
└── lib/
    └── database.ts          # Database configuration
```

## 🔒 Production Requirements

### Content Authenticity
- ✅ Real Berkshire Hathaway PDFs required
- ✅ Content validation before deployment  
- ✅ No sample content in production mode

### Environment Variables
```bash
# Required
NODE_ENV=production
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...

# Optional
PORT=5000
SESSION_SECRET=your_session_secret
```

### Pre-deployment Checklist
1. [ ] Authentic PDFs loaded
2. [ ] `npm run validate-content` passes
3. [ ] OpenAI API key configured
4. [ ] PostgreSQL with pgvector available
5. [ ] Environment variables set
6. [ ] Content authenticity verified

## 📈 Performance

### Vector Search
- **Database**: PostgreSQL with pgvector extension
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Similarity**: Cosine similarity with distance operator `<=>`
- **Indexing**: Optimized for large document collections

### Caching Strategy
- Embeddings cached to reduce API costs
- Vector search results cached for performance
- Chat responses cached for repeated queries

## 🐛 Troubleshooting

### Common Issues

#### "Using mock embeddings"
- **Cause**: OpenAI API key not set or invalid
- **Solution**: Set valid `OPENAI_API_KEY` environment variable

#### "Sample content detected"
- **Cause**: No authentic PDFs loaded
- **Solution**: Place real Berkshire PDFs in project, run `npm run load-data`

#### "No results found"
- **Cause**: Embedding consistency issues
- **Solution**: Clear database, reload data with `npm run load-data`

#### Server startup errors
- **Cause**: Missing dependencies or database connection
- **Solution**: Run `npm install`, check `DATABASE_URL`

### Debug Commands
```bash
# Test vector search
npm run focused-test

# Check embedding consistency  
npm run debug-embedding-consistency

# Validate production readiness
NODE_ENV=production npm run validate-content
```

## 📞 Support & Resources

### Documentation
- [Mastra Framework Docs](https://mastra.ai/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Reference](https://platform.openai.com/docs)

### Development Resources
- `PRODUCTION_GUIDE.md` - Detailed production deployment
- Source code comments and TypeScript types
- Example scripts in `src/scripts/`

### Getting Help
1. Check troubleshooting section above
2. Review logs in development console
3. Test with provided debug scripts
4. Validate environment configuration

## 📝 License

MIT License - see LICENSE file for details

---

**Built with**: Mastra Framework, PostgreSQL, OpenAI API, TypeScript
**Author**: Berkshire Hathaway Intelligence Team
**Version**: 1.0.0