import OpenAI from 'openai';
import config from '../config.js';

const deepseek = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
});

// Tool definitions for function calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: '搜索互联网获取实时信息。当需要查询最新新闻、天气、价格、或任何需要实时信息时使用。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索查询关键词',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: '获取指定URL的网页内容。当需要阅读某个网页的详细内容时使用。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '要获取的网页URL',
          },
        },
        required: ['url'],
      },
    },
  },
];

export async function chat(messages, options = {}) {
  const { stream = false, tools = true, temperature = 0.8, max_tokens = 2000 } = options;
  
  const params = {
    model: config.deepseek.model,
    messages,
    temperature,
    max_tokens,
    stream,
  };
  
  if (tools) {
    params.tools = TOOLS;
    params.tool_choice = 'auto';
  }
  
  if (stream) {
    return await deepseek.chat.completions.create(params);
  }
  
  const response = await deepseek.chat.completions.create(params);
  return response.choices[0].message;
}

export async function chatStream(messages, options = {}) {
  return await chat(messages, { ...options, stream: true });
}

export async function chatCompletion(messages, options = {}) {
  return await chat(messages, { ...options, stream: false });
}
