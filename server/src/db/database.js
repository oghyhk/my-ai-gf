import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import { encrypt, decrypt } from './crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (db) return db;
  
  const dataDir = path.dirname(config.db.path);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  db = new Database(config.db.path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  
  // Initialize schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  
  return db;
}

// Message helpers
export function insertMessage(conversationId, role, content, toolCalls = null, metadata = null) {
  const d = getDb();
  const encrypted = role === 'user' || role === 'assistant' ? 1 : 0;
  const storedContent = encrypted ? encrypt(content) : content;
  
  const stmt = d.prepare(`
    INSERT INTO messages (conversation_id, role, content, encrypted, tool_calls, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    conversationId, role, storedContent, encrypted,
    toolCalls ? JSON.stringify(toolCalls) : null,
    metadata ? JSON.stringify(metadata) : null
  );
  return result.lastInsertRowid;
}

export function getMessages(conversationId, limit = 50, before = null) {
  const d = getDb();
  let query = `SELECT * FROM messages WHERE conversation_id = ?`;
  const params = [conversationId];
  
  if (before) {
    query += ` AND id < ?`;
    params.push(before);
  }
  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const rows = d.prepare(query).all(...params);
  return rows.reverse().map(row => ({
    ...row,
    content: row.encrypted ? decrypt(row.content) : row.content,
    tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

export function getMessageCount(conversationId, afterMsgId = 0) {
  const d = getDb();
  const row = d.prepare(
    `SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND id > ? AND role IN ('user','assistant')`
  ).get(conversationId, afterMsgId);
  return row.cnt;
}

export function getMessagesRange(conversationId, afterMsgId, limit) {
  const d = getDb();
  const rows = d.prepare(
    `SELECT * FROM messages WHERE conversation_id = ? AND id > ? AND role IN ('user','assistant') ORDER BY id ASC LIMIT ?`
  ).all(conversationId, afterMsgId, limit);
  return rows.map(row => ({
    ...row,
    content: row.encrypted ? decrypt(row.content) : row.content,
  }));
}

// Conversation helpers
export function createConversation(id, title = '', agentId = 'default') {
  const d = getDb();
  d.prepare(`INSERT INTO conversations (id, title, agent_id) VALUES (?, ?, ?)`).run(id, title, agentId);
  d.prepare(`INSERT INTO conv_counters (conversation_id) VALUES (?)`).run(id);
}

export function getConversations(agentId = null) {
  const d = getDb();
  if (agentId) {
    return d.prepare(`
      SELECT c.*, a.name as agent_name, a.avatar_emoji as agent_avatar,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
      FROM conversations c
      LEFT JOIN agents a ON a.id = c.agent_id
      WHERE c.agent_id = ?
      ORDER BY c.updated_at DESC
    `).all(agentId).map(maybeDecryptLast);
  }
  return d.prepare(`
    SELECT c.*, a.name as agent_name, a.avatar_emoji as agent_avatar,
      (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
    FROM conversations c
    LEFT JOIN agents a ON a.id = c.agent_id
    ORDER BY c.updated_at DESC
  `).all().map(maybeDecryptLast);
}

function maybeDecryptLast(row) {
  const lm = row.last_message;
  return {
    ...row,
    last_message: lm && lm.startsWith('00') ? '' : (lm || ''),
  };
}

export function deleteConversation(id) {
  const d = getDb();
  d.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
}

export function updateConversationTime(id) {
  const d = getDb();
  d.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(id);
}

// Summary helpers
export function insertSummary(conversationId, summary, startMsgId, endMsgId, msgCount) {
  const d = getDb();
  d.prepare(`
    INSERT INTO summaries (conversation_id, summary, start_msg_id, end_msg_id, msg_count)
    VALUES (?, ?, ?, ?, ?)
  `).run(conversationId, summary, startMsgId, endMsgId, msgCount);
}

export function getSummaries(conversationId) {
  const d = getDb();
  return d.prepare(
    `SELECT * FROM summaries WHERE conversation_id = ? ORDER BY created_at ASC`
  ).all(conversationId);
}

export function getLastSummarizedMsgId(conversationId) {
  const d = getDb();
  const row = d.prepare(
    `SELECT last_summaryd_msg_id FROM conv_counters WHERE conversation_id = ?`
  ).get(conversationId);
  return row ? row.last_summaryd_msg_id : 0;
}

export function updateLastSummarizedMsgId(conversationId, msgId) {
  const d = getDb();
  d.prepare(`
    INSERT INTO conv_counters (conversation_id, last_summaryd_msg_id, unsaved_msg_count) VALUES (?, ?, 0)
    ON CONFLICT(conversation_id) DO UPDATE SET last_summaryd_msg_id = ?, unsaved_msg_count = 0
  `).run(conversationId, msgId, msgId);
}

// Memory fragment helpers
export function insertMemoryFragment(conversationId, type, content, vectorId, entities, sourceMsgId) {
  const d = getDb();
  const result = d.prepare(`
    INSERT INTO memory_fragments (conversation_id, type, content, vector_id, entities, source_msg_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(conversationId, type, content, vectorId, JSON.stringify(entities), sourceMsgId);
  return result.lastInsertRowid;
}

export function getMemoryFragments(conversationId, limit = 50) {
  const d = getDb();
  return d.prepare(
    `SELECT * FROM memory_fragments WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?`
  ).all(conversationId, limit).map(row => ({
    ...row,
    entities: JSON.parse(row.entities || '[]'),
  }));
}

export function searchMemoryFTS(query, limit = 20) {
  const d = getDb();
  try {
    return d.prepare(`
      SELECT mf.*, rank FROM memory_fts 
      JOIN memory_fragments mf ON mf.id = memory_fts.rowid
      WHERE memory_fts MATCH ?
      ORDER BY rank LIMIT ?
    `).all(query, limit);
  } catch {
    return [];
  }
}

export function searchMessageFTS(query, limit = 20) {
  const d = getDb();
  try {
    return d.prepare(`
      SELECT m.*, rank FROM messages_fts 
      JOIN messages m ON m.id = messages_fts.rowid
      WHERE messages_fts MATCH ?
      ORDER BY rank LIMIT ?
    `).all(query, limit).map(row => ({
      ...row,
      content: row.encrypted ? decrypt(row.content) : row.content,
    }));
  } catch {
    return [];
  }
}

export function getMemoryByEntities(entities) {
  const d = getDb();
  if (!entities.length) return [];
  const placeholders = entities.map(() => 'entities LIKE ?').join(' OR ');
  const params = entities.map(e => `%${e}%`);
  try {
    return d.prepare(
      `SELECT * FROM memory_fragments WHERE ${placeholders} ORDER BY created_at DESC LIMIT 30`
    ).all(...params);
  } catch {
    return [];
  }
}

// Emotion state
export function getEmotionState() {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM emotion_state WHERE id = 1`).get();
  return { ...row, emotions: JSON.parse(row.emotions) };
}

export function updateEmotionState(emotions) {
  const d = getDb();
  d.prepare(`
    UPDATE emotion_state SET emotions = ?, last_updated = datetime('now') WHERE id = 1
  `).run(JSON.stringify(emotions));
}

// Agent config
export function getAgentConfig(key) {
  const d = getDb();
  const row = d.prepare(`SELECT value FROM agent_config WHERE key = ?`).get(key);
  return row ? row.value : null;
}

export function getAllAgentConfig() {
  const d = getDb();
  const rows = d.prepare(`SELECT * FROM agent_config`).all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export function setAgentConfig(key, value) {
  const d = getDb();
  d.prepare(`
    INSERT INTO agent_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
  `).run(key, value, value);
}

// Moments
export function insertMoment(content, images = []) {
  const d = getDb();
  const result = d.prepare(
    `INSERT INTO moments (content, images) VALUES (?, ?)`
  ).run(content, JSON.stringify(images));
  return result.lastInsertRowid;
}

export function getMoments(limit = 50, offset = 0) {
  const d = getDb();
  return d.prepare(
    `SELECT * FROM moments ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset).map(row => ({
    ...row,
    images: JSON.parse(row.images || '[]'),
  }));
}

export function getMoment(id) {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM moments WHERE id = ?`).get(id);
  if (!row) return null;
  return { ...row, images: JSON.parse(row.images || '[]') };
}

export function deleteMoment(id) {
  const d = getDb();
  d.prepare(`DELETE FROM moments WHERE id = ?`).run(id);
}

export function getUnseenMoments() {
  const d = getDb();
  return d.prepare(`SELECT * FROM moments WHERE ai_seen = 0 ORDER BY created_at ASC`).all().map(row => ({
    ...row,
    images: JSON.parse(row.images || '[]'),
  }));
}

export function markMomentSeen(id) {
  const d = getDb();
  d.prepare(`UPDATE moments SET ai_seen = 1 WHERE id = ?`).run(id);
}

export function markMomentLiked(id) {
  const d = getDb();
  d.prepare(`UPDATE moments SET ai_liked = 1 WHERE id = ?`).run(id);
}

export function insertMomentInteraction(momentId, type, content = null) {
  const d = getDb();
  const result = d.prepare(
    `INSERT INTO moment_interactions (moment_id, type, content) VALUES (?, ?, ?)`
  ).run(momentId, type, content);
  return result.lastInsertRowid;
}

export function getMomentInteractions(momentId) {
  const d = getDb();
  return d.prepare(
    `SELECT * FROM moment_interactions WHERE moment_id = ? ORDER BY created_at ASC`
  ).all(momentId);
}

// Cron schedule
export function getCronSchedule() {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM cron_schedule WHERE id = 1`).get();
  return row ? JSON.parse(row.schedule) : [];
}

export function saveCronSchedule(schedule, lastRegenerated) {
  const d = getDb();
  d.prepare(`
    UPDATE cron_schedule SET schedule = ?, last_regenerated = ?, last_check = datetime('now') WHERE id = 1
  `).run(JSON.stringify(schedule), lastRegenerated);
}

export function updateCronLastCheck() {
  const d = getDb();
  d.prepare(`UPDATE cron_schedule SET last_check = datetime('now') WHERE id = 1`).run();
}

// Diary helpers
export function insertDiary(content, mood = null) {
  const d = getDb();
  const result = d.prepare(
    `INSERT INTO diaries (content, mood) VALUES (?, ?)`
  ).run(content, mood);
  return result.lastInsertRowid;
}

export function getDiaries(limit = 30, offset = 0) {
  const d = getDb();
  return d.prepare(
    `SELECT * FROM diaries ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
}

export function getDiary(id) {
  const d = getDb();
  return d.prepare(`SELECT * FROM diaries WHERE id = ?`).get(id);
}

export function updateDiaryAIComment(id, comment) {
  const d = getDb();
  d.prepare(
    `UPDATE diaries SET ai_comment = ?, ai_commented_at = datetime('now') WHERE id = ?`
  ).run(comment, id);
}

export function getUncommentedDiaries() {
  const d = getDb();
  return d.prepare(
    `SELECT * FROM diaries WHERE ai_comment IS NULL ORDER BY created_at ASC LIMIT 5`
  ).all();
}

// Relationship helpers
export function getRelationship() {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM relationship WHERE id = 1`).get();
  return row ? { ...row, milestones: JSON.parse(row.milestones || '[]') } : null;
}

export function updateRelationshipStats() {
  const d = getDb();
  const now = new Date().toISOString();
  
  // Count total messages
  const msgCount = d.prepare(
    `SELECT COUNT(*) as cnt FROM messages WHERE role IN ('user', 'assistant')`
  ).get().cnt;
  
  // Count unique days
  const dayCount = d.prepare(
    `SELECT COUNT(DISTINCT DATE(created_at)) as cnt FROM messages`
  ).get().cnt;
  
  // Get first interaction
  const first = d.prepare(
    `SELECT MIN(created_at) as first FROM messages`
  ).get().first;
  
  // Calculate affection points (based on message frequency and sentiment)
  const rel = getRelationship();
  const affectionPoints = (rel?.affection_points || 0) + 1;
  
  // Calculate level based on total interactions
  const level = Math.floor(Math.sqrt(msgCount / 10)) + 1;
  
  d.prepare(`
    UPDATE relationship 
    SET total_messages = ?, 
        total_days = ?, 
        first_interaction = ?, 
        last_interaction = ?,
        affection_points = ?,
        level = ?,
        updated_at = ?
    WHERE id = 1
  `).run(msgCount, dayCount, first, now, affectionPoints, level, now);
}

export function addMilestone(milestone) {
  const d = getDb();
  const rel = getRelationship();
  const milestones = rel?.milestones || [];
  milestones.push({ ...milestone, date: new Date().toISOString() });
  d.prepare(
    `UPDATE relationship SET milestones = ? WHERE id = 1`
  ).run(JSON.stringify(milestones));
}

// ============ AGENT HELPERS ============

export function getAgents() {
  const d = getDb();
  return d.prepare(`SELECT * FROM agents ORDER BY created_at ASC`).all();
}

export function getAgent(id) {
  const d = getDb();
  return d.prepare(`SELECT * FROM agents WHERE id = ?`).get(id);
}

export function createAgent(id, name, avatarEmoji, personality, age, background) {
  const d = getDb();
  d.prepare(`
    INSERT INTO agents (id, name, avatar_emoji, personality, age, background)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, avatarEmoji, personality, age, background);
  return getAgent(id);
}

export function updateAgent(id, updates) {
  const d = getDb();
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(updates)) {
    if (['name', 'avatar_emoji', 'personality', 'age', 'background'].includes(k)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return getAgent(id);
  values.push(id);
  d.prepare(`UPDATE agents SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  return getAgent(id);
}

export function deleteAgent(id) {
  const d = getDb();
  if (id === 'default') return false;
  d.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
  return true;
}

export function getConversationsForAgent(agentId) {
  return getConversations(agentId);
}

export function getConversation(id) {
  const d = getDb();
  const row = d.prepare(`
    SELECT c.*, a.name as agent_name, a.avatar_emoji as agent_avatar
    FROM conversations c
    LEFT JOIN agents a ON a.id = c.agent_id
    WHERE c.id = ?
  `).get(id);
  if (!row) return null;
  return row;
}
