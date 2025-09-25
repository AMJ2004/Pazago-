// Mock embedding service for development when OpenAI API is unavailable
export class MockEmbeddingService {
  // Generate a simple hash-based mock embedding that's consistent for the same text
  generateMockEmbedding(text: string, dimensions: number = 1536): number[] {
    const embedding = new Array(dimensions).fill(0);
    
    // Create a stable hash that's consistent across process runs
    let hash = this.stableHash(text);
    
    // Generate pseudo-random but consistent values based on the hash
    const rng = this.seededRandom(Math.abs(hash));
    
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = (rng() - 0.5) * 2; // Values between -1 and 1
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
  
  // Create a stable hash function that's deterministic
  private stableHash(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive hash for consistency
    return Math.abs(hash);
  }
  
  // Simple seeded random number generator for consistent results
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}