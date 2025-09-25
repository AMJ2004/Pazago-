# Berkshire Hathaway Intelligence - Production Deployment Guide

## 🏭 Production Readiness Checklist

### 1. Authentic PDF Content
The system currently uses realistic sample content for development/demo purposes. For production deployment with authentic Berkshire Hathaway content:

#### PDF Sources
- Download actual shareholder letters from: https://www.berkshirehathaway.com/letters/letters.html
- Recommended files:
  - Annual letters from 2019-2024
  - Save as: `berkshire-hathaway-YYYY.pdf`

#### PDF Placement
Place PDF files in your project directory and update the file paths in:
- `src/scripts/load-sample-data.ts`
- Update the `pdfPaths` array with actual file locations

#### Verification
Run the data loading script and verify logs show:
- `✅ Extracted [NUMBER] characters from [filename]` (real content)
- NOT `📝 Using realistic sample content` (sample content)

### 2. OpenAI API Configuration
- Obtain a valid OpenAI API key
- Set `OPENAI_API_KEY` environment variable
- Verify embedding generation works (logs should not show "using mock embeddings")

### 3. Production Environment Variables
```bash
# Required for production
OPENAI_API_KEY=your_actual_openai_key
DATABASE_URL=your_production_database_url

# Optional
NODE_ENV=production
PORT=5000
```

### 4. Database Setup
- Ensure PostgreSQL with pgvector extension is available
- Run database migrations: `npm run db:push`
- Load authentic content: `npm run load-data`
- Verify document count matches expected PDF pages

### 5. API Endpoints

#### Mastra Playground
- Access: `http://your-domain:5000/`
- Interactive chat interface with the Berkshire agent

#### API Endpoints  
- Base API: `http://your-domain:5000/api`
- Agent interactions via Mastra framework
- Vector search via internal tools

### 6. Content Verification
Before going live, verify the system returns authentic content:

```bash
# Test query that should return real Berkshire content
npm run test-rag
```

Expected results should show:
- Authentic quotes from Warren Buffett
- Actual company performance data
- Real investment philosophy statements

### 7. Monitoring & Logging
- Monitor vector search performance
- Track embedding generation costs
- Log query patterns for optimization

## 🚨 Production Warnings

### Content Authenticity
- The current system uses sample content that reflects Berkshire Hathaway themes but is not verbatim from actual letters
- Users will expect authentic Warren Buffett quotes and insights
- Ensure all loaded content comes from official shareholder letters

### API Rate Limits  
- OpenAI API has rate limits and costs
- Consider caching embeddings for frequently accessed content
- Monitor token usage and costs

### Legal Considerations
- Berkshire Hathaway content may be copyrighted
- Verify compliance with fair use policies
- Consider adding appropriate disclaimers

## 📈 Performance Optimization

### Vector Search
- Create indexes on frequently queried metadata fields
- Consider pgvector index tuning for large datasets
- Monitor query performance and optimize as needed

### Embedding Caching
- Cache embeddings to avoid re-generating for same content
- Consider pre-computing embeddings for all content

### Database Scaling
- Monitor database performance under load
- Consider read replicas for high query volumes
- Optimize vector similarity queries

## 🔧 Troubleshooting

### Common Issues
1. **"Using sample content"** - PDFs not found at specified paths
2. **"Mock embeddings"** - OpenAI API key not set or invalid
3. **No search results** - Embeddings inconsistent between insert/query

### Debug Commands
```bash
# Check document count and content
npm run focused-test

# Reload all data
npm run load-data

# Test embedding consistency  
npm run debug-embedding-consistency
```

## 📞 Support
For production deployment assistance, ensure you have:
- Valid OpenAI API access
- Authentic Berkshire Hathaway PDF collection
- Production-grade PostgreSQL with pgvector
- Proper monitoring and logging infrastructure