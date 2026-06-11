import { Router } from 'express';
import {
  insertDiary,
  getDiaries,
  getDiary,
  updateDiaryAIComment,
  getUncommentedDiaries,
} from '../db/database.js';
import { chatCompletion } from '../ai/llm.js';
import { getAllAgentConfig } from '../db/database.js';

const router = Router();

// Create diary entry
router.post('/', (req, res) => {
  const { content, mood } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }
  const id = insertDiary(content, mood);
  const diary = getDiary(id);
  res.json(diary);
});

// Get all diaries
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const offset = parseInt(req.query.offset) || 0;
  const diaries = getDiaries(limit, offset);
  res.json(diaries);
});

// Get single diary
router.get('/:id', (req, res) => {
  const diary = getDiary(parseInt(req.params.id));
  if (!diary) return res.status(404).json({ error: 'Not found' });
  res.json(diary);
});

// Request AI comment on diary
router.post('/:id/comment', async (req, res) => {
  try {
    const diaryId = parseInt(req.params.id);
    const diary = getDiary(diaryId);
    if (!diary) return res.status(404).json({ error: 'Not found' });

    const config = getAllAgentConfig();
    const name = config.name || '小悠';
    const personality = config.personality || '';

    const prompt = `你是${name}。${personality}

你关心的人刚写了一篇日记：

"${diary.content}"

${diary.mood ? `他/她的心情标记为：${diary.mood}` : ''}

请以朋友的身份，温暖地回应这篇日记。1-3句话，真诚自然，不要过度。如果日记内容是积极的，分享喜悦；如果是困难的，给予支持和鼓励。`;

    const response = await chatCompletion(
      [
        { role: 'system', content: '你是一个温暖的朋友，回应日记。' },
        { role: 'user', content: prompt },
      ],
      { tools: false, temperature: 0.7, max_tokens: 300 }
    );

    const comment = response.content.trim();
    updateDiaryAIComment(diaryId, comment);

    res.json({ ...diary, ai_comment: comment, ai_commented_at: new Date().toISOString() });
  } catch (error) {
    console.error('Diary comment error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
