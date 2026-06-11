import { getEmotionState, updateEmotionState } from '../db/database.js';
import { chatCompletion } from './llm.js';

const DEFAULT_EMOTIONS = {
  happiness: 0.5,
  sadness: 0.1,
  anger: 0.05,
  surprise: 0.2,
  fear: 0.05,
  disgust: 0.05,
  affection: 0.3,
  curiosity: 0.4,
};

const DECAY_RATE = 0.95;
const BASELINE = { ...DEFAULT_EMOTIONS };

export function getCurrentEmotion() {
  const state = getEmotionState();
  return state.emotions;
}

export function decayEmotions() {
  const current = getCurrentEmotion();
  const decayed = {};
  for (const [key, value] of Object.entries(current)) {
    const baseline = BASELINE[key] ?? 0.3;
    decayed[key] = baseline + (value - baseline) * DECAY_RATE;
    decayed[key] = Math.max(0, Math.min(1, decayed[key]));
  }
  updateEmotionState(decayed);
  return decayed;
}

export async function updateEmotionFromConversation(userMessage, assistantMessage) {
  try {
    const current = getCurrentEmotion();
    
    const prompt = `你是一个情绪分析引擎。根据以下对话内容，分析AI角色的情绪变化。

当前情绪状态: ${JSON.stringify(current)}

用户消息: "${userMessage}"
AI回复: "${assistantMessage}"

请输出更新后的情绪状态，每个维度取值0-1之间。输出纯JSON，不要其他文字。
格式: {"happiness":0.x,"sadness":0.x,"anger":0.x,"surprise":0.x,"fear":0.x,"disgust":0.x,"affection":0.x,"curiosity":0.x}`;

    const response = await chatCompletion([
      { role: 'system', content: '你是一个精确的情绪分析引擎。只输出JSON。' },
      { role: 'user', content: prompt },
    ], { tools: false, temperature: 0.3, max_tokens: 200 });
    
    let newEmotions;
    try {
      const text = response.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      newEmotions = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      console.error('Failed to parse emotion response, keeping current state');
      return current;
    }
    
    // Validate and clamp
    for (const key of Object.keys(DEFAULT_EMOTIONS)) {
      if (typeof newEmotions[key] !== 'number') {
        newEmotions[key] = current[key];
      }
      newEmotions[key] = Math.max(0, Math.min(1, newEmotions[key]));
    }
    
    updateEmotionState(newEmotions);
    return newEmotions;
  } catch (error) {
    console.error('Emotion update error:', error.message);
    return getCurrentEmotion();
  }
}

export function formatEmotionForPrompt(emotions) {
  const labels = {
    happiness: '开心',
    sadness: '难过',
    anger: '生气',
    surprise: '惊讶',
    fear: '害怕',
    disgust: '厌恶',
    affection: '好感/亲近感',
    curiosity: '好奇',
  };
  
  const parts = [];
  for (const [key, value] of Object.entries(emotions)) {
    if (value > 0.3) {
      const intensity = value > 0.7 ? '非常' : value > 0.5 ? '比较' : '有些';
      parts.push(`${intensity}${labels[key] || key}(${(value * 100).toFixed(0)}%)`);
    }
  }
  
  return parts.length > 0 
    ? `你当前的心情: ${parts.join('，')}` 
    : '你当前心情比较平静';
}

// Decay emotions every 10 minutes
let decayInterval;
export function startEmotionDecay() {
  if (decayInterval) return;
  decayInterval = setInterval(decayEmotions, 10 * 60 * 1000);
}

export function stopEmotionDecay() {
  if (decayInterval) {
    clearInterval(decayInterval);
    decayInterval = null;
  }
}
