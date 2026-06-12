const API_BASE = '/api';

export async function getConversations() {
  const res = await fetch(`${API_BASE}/chat/conversations`);
  return res.json();
}

export async function createConversation(title = '', agentId = 'default') {
  const res = await fetch(`${API_BASE}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, agentId }),
  });
  return res.json();
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_BASE}/chat/conversations/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getChatHistory(conversationId, limit = 50) {
  const res = await fetch(`${API_BASE}/chat/history/${conversationId}?limit=${limit}`);
  return res.json();
}

export async function sendMessage(conversationId, message, onChunk, onDone, onError, onUsage) {
  const res = await fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content') onChunk(data.content);
          else if (data.type === 'done') onDone(data);
          else if (data.type === 'usage') { if (onUsage) onUsage(data); }
          else if (data.type === 'error') onError(data.error);
          else if (data.type === 'tool_result') onChunk(`\n[搜索: ${data.name}]\n`);
          else if (data.type === 'thinking') onChunk('');
        } catch {}
      }
    }
  }
}

export async function sendImage(conversationId, file, onChunk, onDone, onError) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('conversationId', conversationId);

  const res = await fetch(`${API_BASE}/chat/send-image`, {
    method: 'POST',
    body: formData,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content') onChunk(data.content);
          else if (data.type === 'done') onDone(data);
          else if (data.type === 'error') onError(data.error);
        } catch {}
      }
    }
  }
}

export async function getMoments(limit = 50, offset = 0) {
  const res = await fetch(`${API_BASE}/moments?limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function createMoment(content, images = []) {
  const res = await fetch(`${API_BASE}/moments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, images }),
  });
  return res.json();
}

export async function deleteMoment(id) {
  const res = await fetch(`${API_BASE}/moments/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function uploadMomentImages(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  const res = await fetch(`${API_BASE}/moments/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function getAgentStatus() {
  const res = await fetch(`${API_BASE}/agent/status`);
  return res.json();
}

export async function getPersonality() {
  const res = await fetch(`${API_BASE}/agent/personality`);
  return res.json();
}

export async function updatePersonality(updates) {
  const res = await fetch(`${API_BASE}/agent/personality`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function exportConversation(conversationId) {
  const res = await fetch(`${API_BASE}/chat/export/${conversationId}`);
  return res.json();
}
