import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import {
  getConversations,
  insertMessage,
  updateConversationTime,
} from '../db/database.js';
import { chatStream } from '../ai/llm.js';
import { buildSystemPrompt } from '../ai/personality.js';
import { getCurrentEmotion } from '../ai/emotion.js';

// Daily check-in times (random between 9-11 AM and 7-9 PM)
const MORNING_HOUR = 9 + Math.floor(Math.random() * 3);
const MORNING_MINUTE = Math.floor(Math.random() * 60);
const EVENING_HOUR = 19 + Math.floor(Math.random() * 2);
const EVENING_MINUTE = Math.floor(Math.random() * 60);

async function sendCheckIn(type) {
  try {
    const conversations = getConversations();
    if (conversations.length === 0) return;

    // Use the most recent conversation
    const conversation = conversations[0];
    const conversationId = conversation.id;

    const prompts = {
      morning: [
        '早上好！今天有什么计划吗？',
        '早安～昨晚睡得好吗？',
        '新的一天开始了，今天想做什么呢？',
      ],
      evening: [
        '晚上好～今天过得怎么样？',
        '今天辛苦了，有什么想分享的吗？',
        '晚上好呀，今天都做了些什么呢？',
      ],
    };

    const options = prompts[type] || prompts.morning;
    const message = options[Math.floor(Math.random() * options.length)];

    // Save the check-in message
    const msgId = insertMessage(conversationId, 'assistant', message);
    updateConversationTime(conversationId);

    console.log(`[CheckIn] Sent ${type} check-in: ${message}`);
  } catch (error) {
    console.error('[CheckIn] Error:', error);
  }
}

// Schedule morning check-in
cron.schedule(`${MORNING_MINUTE} ${MORNING_HOUR} * * *`, () => {
  console.log('[CheckIn] Morning check-in triggered');
  sendCheckIn('morning');
});

// Schedule evening check-in
cron.schedule(`${EVENING_MINUTE} ${EVENING_HOUR} * * *`, () => {
  console.log('[CheckIn] Evening check-in triggered');
  sendCheckIn('evening');
});

console.log(`[CheckIn] Scheduled: Morning ${MORNING_HOUR}:${MORNING_MINUTE.toString().padStart(2, '0')}, Evening ${EVENING_HOUR}:${EVENING_MINUTE.toString().padStart(2, '0')}`);
