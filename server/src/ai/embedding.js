import config from '../config.js';

export async function getEmbedding(text) {
  try {
    const response = await fetch(`${config.openrouter.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-companion.local',
        'X-Title': 'AI Companion',
      },
      body: JSON.stringify({
        model: config.openrouter.embeddingModel,
        input: text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${error}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.message);
    throw error;
  }
}

export async function getEmbeddings(texts) {
  if (!texts.length) return [];
  
  try {
    const response = await fetch(`${config.openrouter.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-companion.local',
        'X-Title': 'AI Companion',
      },
      body: JSON.stringify({
        model: config.openrouter.embeddingModel,
        input: texts,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${error}`);
    }
    
    const data = await response.json();
    return data.data.map(d => d.embedding);
  } catch (error) {
    console.error('Embedding batch error:', error.message);
    throw error;
  }
}
