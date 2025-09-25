# Berkshire Hathaway Intelligence - Replit Agent Guide

## Overview

This is a production-ready RAG (Retrieval-Augmented Generation) application that serves as an intelligent assistant for answering questions about Warren Buffett's investment philosophy using Berkshire Hathaway shareholder letters (2019-2024). The application provides streaming AI responses with source citations through vector similarity search and is built on the Mastra framework for agent orchestration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Mastra Framework**: Provides agent orchestration, API management, and built-in playground interface accessible at the root endpoint (`/`)
- **Agent-based Architecture**: Single specialized agent (`berkshireAgent`) configured with domain-specific instructions for Warren Buffett's investment philosophy

### Data Processing Pipeline
- **PDF Content Extraction**: Uses `pdf-parse` library to extract text from Berkshire Hathaway shareholder letters
- **Document Chunking**: Splits content into manageable chunks (1000 characters with 200 character overlap) for optimal vector search
- **Embedding Generation**: Leverages OpenAI's embedding API to convert text chunks into vector representations
- **Mock Embedding Fallback**: Includes deterministic mock embedding service for development when OpenAI API is unavailable

### Vector Search Infrastructure
- **PostgreSQL with pgvector**: Primary database for storing document content, metadata, and vector embeddings
- **Neon Database Integration**: Uses `@neondatabase/serverless` for cloud PostgreSQL connectivity with WebSocket support
- **Drizzle ORM**: Database abstraction layer for type-safe queries and schema management
- **Similarity Search**: Implements cosine similarity search using PostgreSQL's vector operations

### AI Integration
- **OpenAI GPT-4o-mini**: Primary language model for generating responses
- **AI SDK Integration**: Uses `@ai-sdk/openai` for streaming completions and embedding generation
- **Vector Search Tool**: Custom Mastra tool that performs semantic search across shareholder letters and returns formatted results

### Content Management Strategy
- **Development Mode**: Uses realistic sample content that mimics authentic Berkshire Hathaway letter excerpts
- **Production Safeguards**: Includes validation scripts to ensure authentic PDF content is loaded in production environments
- **Content Authenticity Validation**: Detects sample vs. authentic content and prevents production deployment with mock data

### API Architecture
- **RESTful Endpoints**: Standard Mastra-generated endpoints for agent interaction
- **Streaming Responses**: Real-time response streaming with source citations
- **Interactive Playground**: Web-based chat interface for testing and demonstration

## External Dependencies

### AI Services
- **OpenAI API**: Required for embedding generation and chat completions (GPT-4o-mini model)
- Environment variable: `OPENAI_API_KEY`

### Database Services
- **PostgreSQL with pgvector extension**: Vector similarity search capabilities
- **Neon Database**: Serverless PostgreSQL hosting (recommended)
- Environment variable: `DATABASE_URL`

### Development Tools
- **TypeScript**: Primary development language with strict type checking
- **tsx**: TypeScript execution environment for scripts
- **Node.js**: Runtime environment (minimum version 20.9.0)

### Content Sources
- **Berkshire Hathaway Shareholder Letters**: Authentic PDF documents from 2019-2024
- Source: https://www.berkshirehathaway.com/letters/letters.html
- Production deployment requires downloading and placing actual PDFs in the project directory

### Deployment Considerations
- **Environment Detection**: Automatically adjusts behavior based on `NODE_ENV` setting
- **Content Validation**: Includes scripts to verify authentic content in production
- **Mock Service Fallbacks**: Graceful degradation when external services are unavailable