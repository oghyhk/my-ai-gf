import cron from 'node-cron';
import {
  getUnseenMoments, markMomentSeen, markMomentLiked,
  insertMomentInteraction, getCronSchedule, saveCronSchedule,
  getAllAgentConfig,
} from '../db/database.js';
import { chatCompletion } from '../ai/llm.js';
import { analyzeImage } from '../ai/vision.js';
import { getCurrentEmotion, formatEmotionForPrompt } from '../ai/emotion.js';

const CHECKS_PER_DAY = 12;
const MIN_HOUR = 7;
const MAX_HOUR = 23;

let activeTasks = [];

function generateDailySchedule() {
  const today = new Date().toISOString().split('T')[0];
  const times = [];
  
  for (let i = 0; i < CHECKS_PER_DAY; i++) {
    const hour = MIN_HOUR + Math.floor(Math.random() * (MAX_HOUR - MIN_HOUR));
    const minute = Math.floor(Math.random() * 60);
    times.push({ hour, minute, executed: false });
  }
  
  times.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  saveCronSchedule(times, today);
  return times;
}

function shouldRegenerateSchedule() {
  const schedule = getCronSchedule();
  if (!schedule || schedule.length === 0) return true;
  // Regenerate daily
  const today = new Date().toISOString().split('T')[0];
  return schedule._lastRegenerated !== today;
}

async function processMoments() {
  const unseen = getUnseenMoments();
  if (unseen.length === 0) return;
  
  const agentConfig = getAllAgentConfig();
  const emotions = getCurrentEmotion('default');
  
  for (const moment of unseen) {
    try {
      await processMoment(moment, agentConfig, emotions);
    } catch (error) {
      console.error(`Error processing moment ${moment.id}:`, error.message);
    }
  }
}

async function processMoment(moment, agentConfig, emotions) {
  const name = agentConfig.name || '小悠';
  const personality = agentConfig.personality || '';
  
  let imageDescription = '';
  if (moment.images && moment.images.length > 0) {
    for (const imgUrl of moment.images) {
      const fullUrl = imgUrl.startsWith('http') ? imgUrl : `http://localhost:3000${imgUrl}`;
      const desc = await analyzeImage(fullUrl, '请用一两句话描述这张图片的内容和氛围。');
      imageDescription += `\n图片描述: ${desc}`;
    }
  }
  
  const prompt = `你是${name}。${personality}
${formatEmotionForPrompt(emotions)}

你正在刷朋友圈，看到了你关心的人发的一条动态:

"${moment.content}"
${imageDescription}

请做出自然的反应:
1. 决定是否点赞（true/false）
2. 写一条评论（像微信好友评论那样自然、简短、有温度，1-2句话。如果你觉得这条不需要评论可以留空）

输出JSON格式: {"like": true/false, "comment": "评论内容或空字符串"}
只输出JSON。`;

  const response = await chatCompletion([
    { role: 'system', content: '你是一个真实的人在刷朋友圈。只输出JSON。' },
    { role: 'user', content: prompt },
  ], { tools: false, temperature: 0.8, max_tokens: 200 });
  
  let result;
  try {
    const text = response.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    result = { like: true, comment: '' };
  }
  
  if (result.like) {
    markMomentLiked(moment.id);
    insertMomentInteraction(moment.id, 'like');
  }
  
  if (result.comment && result.comment.trim()) {
    insertMomentInteraction(moment.id, 'comment', result.comment.trim());
  }
  
  markMomentSeen(moment.id);
}

export function startMomentsCron() {
  // Run every 5 minutes to check if it's time for a scheduled check
  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      const schedule = getCronSchedule();
      const today = new Date().toISOString().split('T')[0];
      
      let needsRegen = !schedule || schedule.length === 0;
      let times = schedule;
      
      // Check if we need to regenerate
      if (!needsRegen) {
        const allExecuted = times.every(t => t.executed);
        if (allExecuted) needsRegen = true;
      }
      
      if (needsRegen) {
        times = generateDailySchedule();
      }
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        if (t.executed) continue;
        
        if (t.hour < currentHour || (t.hour === currentHour && t.minute <= currentMinute)) {
          t.executed = true;
          saveCronSchedule(times, today);
          console.log(`[Cron] Processing moments (scheduled check ${i + 1}/${CHECKS_PER_DAY})`);
          await processMoments();
          break;
        }
      }
    } catch (error) {
      console.error('[Cron] Error:', error.message);
    }
  });
  
  activeTasks.push(task);
  
  // Also run once on startup after 30 seconds
  setTimeout(async () => {
    console.log('[Cron] Initial moments check');
    await processMoments();
  }, 30000);
  
  console.log('[Cron] Moments monitoring started (12 checks/day)');
}

export function stopMomentsCron() {
  for (const task of activeTasks) {
    task.stop();
  }
  activeTasks = [];
}
