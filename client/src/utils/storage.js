const CONVERSATION_KEY = 'ai_companion_conversation';
const MOMENTS_KEY = 'ai_companion_moments';

export async function getConversation() {
  const data = localStorage.getItem(CONVERSATION_KEY);
  return data ? JSON.parse(data) : { messages: [] };
}

export async function saveMessage(message) {
  const conversation = await getConversation();
  conversation.messages.push(message);
  localStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversation));
  
  // Also save to server
  await fetch('/api/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

export async function getMoments() {
  const response = await fetch('/api/moments');
  if (!response.ok) throw new Error('Failed to fetch moments');
  return response.json();
}

export async function createMoment(momentData) {
  const response = await fetch('/api/moments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(momentData),
  });
  if (!response.ok) throw new Error('Failed to create moment');
  return response.json();
}
