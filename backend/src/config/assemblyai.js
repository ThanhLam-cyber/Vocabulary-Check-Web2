const { AssemblyAI } = require('assemblyai');

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "7a229d92bcab4396a26fffce338e5cd0",
});

module.exports = assemblyai;

// config/openai.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 15000, // 15 seconds timeout
});

module.exports = openai;

// config/cache.js
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  get(key, ttl = 300000) { // Default 5 minutes
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() - item.timestamp > ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }

  set(key, data) {
    this.stats.sets++;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size to prevent memory leak
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }
}

module.exports = new CacheManager();