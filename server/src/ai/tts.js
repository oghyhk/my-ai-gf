import config from '../config.js';

// Use Web Speech API for TTS (browser-side)
// This is a placeholder for potential server-side TTS integration
export function getTTSConfig() {
  return {
    enabled: true,
    voice: 'zh-CN',
    rate: 1.0,
    pitch: 1.1,
  };
}

// If you want server-side TTS, you can integrate with services like:
// - Edge TTS (free, high quality Chinese voices)
// - OpenAI TTS
// - ElevenLabs
// For now, we'll use browser-side Web Speech API

export async function synthesizeSpeech(text, options = {}) {
  // This would be implemented for server-side TTS
  // For now, return null to indicate browser-side TTS should be used
  return null;
}
