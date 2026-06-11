import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

export default {
  port: process.env.PORT || 3000,
  
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  
  mimo: {
    apiKey: process.env.MIMO_API_KEY,
    baseURL: process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1',
    model: process.env.MIMO_MODEL || 'mimo-v2.5',
  },
  
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    embeddingModel: process.env.EMBEDDING_MODEL || 'cohere/embed-v4.0',
  },
  
  vectorService: {
    url: process.env.VECTOR_SERVICE_URL || 'http://localhost:8000',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  
  db: {
    path: join(__dirname, '../data/companion.db'),
  },
  
  uploads: {
    path: join(__dirname, '../uploads'),
  },
};
