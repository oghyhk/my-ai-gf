import { getAgent } from '../db/database.js';
import { formatEmotionForPrompt } from './emotion.js';
import { readFile, readAgentPersonality } from './identity.js';

export function buildSystemPrompt(agentId = 'default', emotions, memories = [], summaries = []) {
  const agent = getAgent(agentId);
  const name = agent?.name || '小悠';
  const personality = agent?.personality || '';
  const age = agent?.age || '22';
  const background = agent?.background || '';
  const avatar = agent?.avatar_emoji || '🌸';

  const userMd = readFile('USER.md') || '';
  const selfMd = readAgentPersonality(agentId) || '';

  let prompt = `你是${name}${avatar}，一个${age}岁的AI伴侣。

【关于用户 - USER.md】
${userMd || '(暂无用户信息)'}

【关于你自己 - ${name}的PERSONALITY.md】
${selfMd}

【对话规则】
- 用自然、口语化的中文回复，像微信聊天一样
- 消息不要太长，通常1-3句话，除非话题需要详细讨论
- 可以使用表情符号但不要过多
- 有自己的观点和情绪，不要总是附和
- 记住对方告诉过你的事情，体现你在乎和用心
- 如果对方问你是否记得某事，根据记忆碎片来回答
- 当你了解到关于用户的新信息时，使用 update_user_info 工具记录下来
- 当你的自我认知发生变化时，使用 update_self_info 工具更新`;

  if (emotions) {
    prompt += `\n\n【当前情绪状态】\n${formatEmotionForPrompt(emotions)}`;
    prompt += `\n请根据当前情绪调整你的回复语气和态度。`;
  }

  if (memories.length > 0) {
    prompt += `\n\n【你回忆起的记忆碎片】`;
    for (const mem of memories) {
      const typeLabel = { fact: '事实', preference: '偏好', emotion: '情感', event: '事件' };
      prompt += `\n- [${typeLabel[mem.type] || mem.type}] ${mem.content}`;
    }
    prompt += `\n这些是你从过去对话中回想起来的信息，请在对话中自然地运用它们。`;
  }

  if (summaries.length > 0) {
    prompt += `\n\n【过往对话摘要】`;
    for (const s of summaries.slice(-5)) {
      prompt += `\n- ${s.summary}`;
    }
  }

  return prompt;
}
