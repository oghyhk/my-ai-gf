import OpenAI from 'openai';
import config from '../config.js';

const mimo = new OpenAI({
  apiKey: config.mimo.apiKey,
  baseURL: config.mimo.baseURL,
});

export async function analyzeImage(imageUrl, prompt = '请描述这张图片的内容，包括场景、人物、情绪氛围等。') {
  try {
    const response = await mimo.chat.completions.create({
      model: config.mimo.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Vision analysis error:', error.message);
    return '无法分析图片内容';
  }
}

export async function analyzeImageBase64(base64Data, mimeType = 'image/jpeg', prompt = '请描述这张图片的内容，包括场景、人物、情绪氛围等。') {
  const imageUrl = `data:${mimeType};base64,${base64Data}`;
  return await analyzeImage(imageUrl, prompt);
}
