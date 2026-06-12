import { chatCompletion } from './llm.js';
import { getMessages } from '../db/database.js';
import { readAgentUserMd, readAgentPersonality, appendToSection, updateValue, replaceSection } from './identity.js';

const REVIEW_EVERY_N_MESSAGES = 5;

let messageCounter = 0;

export async function reviewIdentityFiles(conversationId, agentId = 'default') {
  messageCounter++;
  
  // Only review every N messages to save API costs
  if (messageCounter % REVIEW_EVERY_N_MESSAGES !== 0) return null;
  
  try {
    const messages = getMessages(conversationId, REVIEW_EVERY_N_MESSAGES);
    if (messages.length < 3) return null;
    
    const conversationText = messages
      .map(m => `${m.role === 'user' ? '用户' : '小悠'}: ${m.content}`)
      .join('\n\n');
    
    const userMd = readAgentUserMd(agentId) || '(空)';
    const selfMd = readAgentPersonality(agentId) || '(空)';
    
    const reviewPrompt = `你是一个文档维护工具。请审查以下最近的10条对话，判断是否需要更新用户档案(USER.md)或AI自我认知档案(PERSONALITY.md)。

## 对话记录：
${conversationText}

## 当前的 USER.md：
${userMd}

## 当前的 PERSONALITY.md：
${selfMd}

请分析这些对话，判断：
1. 用户是否透露了需要记录的新信息？（新事实、偏好变化、生活事件等）
2. AI与用户的关系是否有变化？（更亲近、更了解对方等）
3. AI是否需要调整自我认知？

输出JSON格式的建议（如果需要更新），如果不需要更新则输出空对象 {}。
格式: 
{
  "user_updates": [
    {"section": "基本信息", "action": "update_key", "content": "昵称: 小明"},
    {"section": "兴趣爱好", "action": "append", "content": "- 最近开始学吉他"}
  ],
  "self_updates": [
    {"section": "与用户的关系", "action": "replace_section", "content": "我们已经成为了好朋友。用户会和我分享生活中的开心和烦恼。"}
  ],
  "summary": "简短说明这次更新了什么"
}

只输出JSON，不要其他文字。`;

    const response = await chatCompletion([
      { role: 'system', content: '你是一个精确的文档审查工具。只输出JSON。' },
      { role: 'user', content: reviewPrompt },
    ], { tools: false, temperature: 0.2, max_tokens: 1000 });
    
    let plan;
    try {
      const text = response.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      console.error('Failed to parse review plan');
      return null;
    }
    
    if (!plan.user_updates && !plan.self_updates) return null;
    
    const results = { user: [], self: [] };
    
    // Apply USER.md updates
    if (Array.isArray(plan.user_updates)) {
      for (const update of plan.user_updates) {
        try {
          let ok = false;
          switch (update.action) {
            case 'update_key': {
              const [key, ...vals] = (update.content || '').split(':').map(s => s.trim());
              ok = updateValue('USER.md', update.section, key, vals.join(':'));
              break;
            }
            case 'append':
              ok = appendToSection('USER.md', update.section, [update.content]);
              break;
            case 'replace_section':
              ok = replaceSection('USER.md', update.section, update.content);
              break;
          }
          if (ok) results.user.push(`${update.section}: ${update.content}`);
        } catch (e) {
          console.error(`Failed user update: ${e.message}`);
        }
      }
    }
    
    // Apply PERSONALITY.md updates
    if (Array.isArray(plan.self_updates)) {
      for (const update of plan.self_updates) {
        try {
          let ok = false;
          switch (update.action) {
            case 'update_key': {
              const [key, ...vals] = (update.content || '').split(':').map(s => s.trim());
              ok = updateValue(agentId, 'self', update.section, key, vals.join(':'));
              break;
            }
            case 'append':
              ok = appendToSection(agentId, 'self', update.section, [update.content]);
              break;
            case 'replace_section':
              ok = replaceSection(agentId, 'self', update.section, update.content);
              break;
          }
          if (ok) results.self.push(`${update.section}: ${update.content}`);
        } catch (e) {
          console.error(`Failed self update: ${e.message}`);
        }
      }
    }
    
    const hasChanges = results.user.length > 0 || results.self.length > 0;
    if (hasChanges) {
      console.log(`[Identity Review] Updates applied:`, results);
    }
    
    return hasChanges ? results : null;
    
  } catch (error) {
    console.error('[Identity Review] Error:', error.message);
    return null;
  }
}
