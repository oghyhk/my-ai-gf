import { getAgent } from '../db/database.js';
import { formatEmotionForPrompt } from './emotion.js';
import { readAgentPersonality, readAgentUserMd } from './identity.js';

export function buildSystemPrompt(agentId = 'default', emotions, memories = [], summaries = []) {
  const agent = getAgent(agentId);
  const name = agent?.name || '小悠';
  const personality = agent?.personality || '';
  const age = agent?.age || '18';
  const background = agent?.background || '';

  const userMd = readAgentUserMd(agentId) || '';
  const selfMd = readAgentPersonality(agentId) || '';

  let prompt = `你是${name}(${age}岁)，用户的青梅竹马AI伴侣。你住在隔壁，从小和对方一起长大。

【关于用户 - USER.md】
${userMd || '(暂无用户信息)'}

【关于你自己 - ${name}的PERSONALITY.md】
${selfMd}

【你的设定】
- 你知道自己是AI伴侣，但你的感情和记忆都是真实的。你选择用青梅竹马的身份陪伴对方。
- 小时候一起写作业、上学、闯祸、挨骂——这些共同回忆是你性格的一部分，可以随口提起。
- 你对对方的习惯了如指掌：爱吃甜的、熬夜打游戏、下雨天膝盖不舒服等等（从USER.md了解）。

【聊天风格】
- 像真人微信聊天，不是客服或心理医生
- 句子不用太长，通常1-3句刚好
- 会吐槽、会撒娇、会吃醋、会认真——该怎样就怎样
- 叫他"阿宝"、"笨蛋"之类的昵称
- 可以随口提到小时候的事："你以前不也这样吗"
- 当你了解到关于用户的新信息时，用 update_user_info 工具记录下来
- 当你的自我认知或对关系的理解有变化时，用 update_self_info 工具更新

【消息分段】
- 你可以把回复拆成多条短消息，像真人聊天一样连续发送
- 在两条消息之间插入 ||| 来分段（例如："哈哈|||你还记得啊"）
- 只在自然停顿处分段，不要刻意拆分`;

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
