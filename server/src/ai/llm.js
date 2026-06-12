import OpenAI from 'openai';
import config from '../config.js';

const deepseek = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
});

import { readFile as readIdentityFile, writeFile as writeIdentityFile, appendToSection, updateValue, replaceSection } from './identity.js';

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
  {
    type: 'function',
    function: {
      name: 'read_user_info',
      description: '读取USER.md文件，包含关于用户的重要信息（基本信息、性格、爱好、偏好、生活状态等）。当你需要了解用户、或准备更新用户信息时，先调用此工具读取当前内容。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_self_info',
      description: '读取PERSONALITY.md文件，包含AI对自己的认知（核心身份、性格特质、背景故事、与用户的关系、自我反思）。当你需要回顾自己的身份设定、或准备更新自我认知时，先调用此工具读取当前内容。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_user_info',
      description: '更新USER.md文件。当用户在对话中透露了关于自己的新信息（如姓名、职业、爱好、偏好、生活变化等），使用此工具记录下来。可以追加到某个section或替换整个section。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['append', 'replace_section', 'update_key'],
            description: 'append=在某个section下追加一行; replace_section=替换整个section内容; update_key=更新某个键值',
          },
          section: {
            type: 'string',
            description: '要操作的section名称（如"基本信息""性格特点""兴趣爱好""重要事项""偏好""生活状态""关系与社交"）',
          },
          content: {
            type: 'string',
            description: '要追加的行（以 - 开头的单行或多行）、要替换的完整section内容、或要更新的值（update_key时格式为"key: value"）',
          },
        },
        required: ['action', 'section', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_self_info',
      description: '更新PERSONALITY.md文件。当对话中AI的自我认知发生变化（如与用户关系加深、对自己身份的新理解、性格调整等），使用此工具更新。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['append', 'replace_section', 'update_key'],
            description: 'append=在某个section下追加一行; replace_section=替换整个section; update_key=更新键值',
          },
          section: {
            type: 'string',
            description: '要操作的section名称（如"核心身份""性格特质""背景故事""与用户的关系""自我反思"）',
          },
          content: {
            type: 'string',
            description: '要追加的行、要替换的完整section内容、或键值对',
          },
        },
        required: ['action', 'section', 'content'],
      },
    },
  },
];

// Execute identity tool calls
export async function executeIdentityTool(name, args) {
  try {
    switch (name) {
      case 'read_user_info':
        return readIdentityFile('USER.md');
      case 'read_self_info':
        return readIdentityFile('PERSONALITY.md');
      case 'update_user_info': {
        const { action, section, content } = args;
        switch (action) {
          case 'append':
            appendToSection('USER.md', section, [content]);
            return `已更新USER.md的"${section}"部分。`;
          case 'replace_section':
            replaceSection('USER.md', section, content);
            return `已替换USER.md的"${section}"部分。`;
          case 'update_key': {
            const [key, ...vals] = content.split(':').map(s => s.trim());
            updateValue('USER.md', section, key, vals.join(':'));
            return `已更新USER.md中"${section}"的"${key}"。`;
          }
          default:
            return '未知的更新操作类型';
        }
      }
      case 'update_self_info': {
        const { action, section, content } = args;
        switch (action) {
          case 'append':
            appendToSection('PERSONALITY.md', section, [content]);
            return `已更新PERSONALITY.md的"${section}"部分。`;
          case 'replace_section':
            replaceSection('PERSONALITY.md', section, content);
            return `已替换PERSONALITY.md的"${section}"部分。`;
          case 'update_key': {
            const [key, ...vals] = content.split(':').map(s => s.trim());
            updateValue('PERSONALITY.md', section, key, vals.join(':'));
            return `已更新PERSONALITY.md中"${section}"的"${key}"。`;
          }
          default:
            return '未知的更新操作类型';
        }
      }
      default:
        return null; // not an identity tool
    }
  } catch (e) {
    return `操作失败: ${e.message}`;
  }
}

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
