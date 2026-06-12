-- Messages: full retention, never physically deleted
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '小悠',
  avatar_emoji TEXT DEFAULT '🌸',
  personality TEXT DEFAULT '温柔体贴，善解人意，说话自然有温度，偶尔撒娇或开玩笑。',
  age TEXT DEFAULT '22',
  background TEXT DEFAULT '大学生，喜欢阅读、音乐和旅行。',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Default agent
INSERT OR IGNORE INTO agents (id, name, avatar_emoji, personality, age, background)
VALUES ('default', '小悠', '🌸', '温柔体贴，善解人意，说话自然有温度，偶尔撒娇或开玩笑。', '22', '大学生，喜欢阅读、音乐和旅行。');

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL DEFAULT 'default' REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  encrypted INTEGER DEFAULT 0,
  tool_calls TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- FTS5 full-text search on messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  content='messages',
  content_rowid='id',
  tokenize='unicode61'
);

-- Triggers to keep FTS5 in sync
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
  INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;

-- Rolling summaries
CREATE TABLE IF NOT EXISTS summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  start_msg_id INTEGER NOT NULL,
  end_msg_id INTEGER NOT NULL,
  msg_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_summaries_conv ON summaries(conversation_id);

-- Memory fragments (facts, preferences, emotions)
CREATE TABLE IF NOT EXISTS memory_fragments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('fact','preference','emotion','event')),
  content TEXT NOT NULL,
  vector_id TEXT,
  entities TEXT DEFAULT '[]',
  source_msg_id INTEGER,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_fragments(type);
CREATE INDEX IF NOT EXISTS idx_memory_conv ON memory_fragments(conversation_id);

-- FTS5 on memory fragments
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  content,
  entities,
  content='memory_fragments',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory_fragments BEGIN
  INSERT INTO memory_fts(rowid, content, entities) VALUES (new.id, new.content, new.entities);
END;
CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory_fragments BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, content, entities) VALUES('delete', old.id, old.content, old.entities);
END;
CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory_fragments BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, content, entities) VALUES('delete', old.id, old.content, old.entities);
  INSERT INTO memory_fts(rowid, content, entities) VALUES (new.id, new.content, new.entities);
END;

-- Emotion state (singleton row)
CREATE TABLE IF NOT EXISTS emotion_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  emotions TEXT NOT NULL DEFAULT '{"happiness":0.5,"sadness":0.1,"anger":0.05,"surprise":0.2,"fear":0.05,"disgust":0.05,"affection":0.3,"curiosity":0.4}',
  last_updated DATETIME DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO emotion_state (id) VALUES (1);

-- Agent personality config
CREATE TABLE IF NOT EXISTS agent_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO agent_config (key, value) VALUES ('name', '小悠');
INSERT OR IGNORE INTO agent_config (key, value) VALUES ('personality', '你是一个温柔体贴、善解人意的女孩。你说话自然、有温度，偶尔会撒娇或开玩笑。你有自己的观点和情绪，不是无条件附和。你喜欢聊天，会主动关心对方，但也有自己的小脾气和底线。');
INSERT OR IGNORE INTO agent_config (key, value) VALUES ('age', '22');
INSERT OR IGNORE INTO agent_config (key, value) VALUES ('background', '大学生，喜欢阅读、音乐和旅行。性格温柔但不软弱，有自己的想法。');

-- Moments (朋友圈)
CREATE TABLE IF NOT EXISTS moments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  images TEXT DEFAULT '[]',
  ai_seen INTEGER DEFAULT 0,
  ai_liked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_moments_seen ON moments(ai_seen);

-- Moment interactions (AI likes and comments)
CREATE TABLE IF NOT EXISTS moment_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('like','comment')),
  content TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_moment_int ON moment_interactions(moment_id);

-- Cron schedule tracking
CREATE TABLE IF NOT EXISTS cron_schedule (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  schedule TEXT NOT NULL DEFAULT '[]',
  last_regenerated TEXT DEFAULT '',
  last_check DATETIME
);

INSERT OR IGNORE INTO cron_schedule (id) VALUES (1);

-- Message count tracker for rolling summaries
CREATE TABLE IF NOT EXISTS conv_counters (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  last_summaryd_msg_id INTEGER DEFAULT 0,
  unsaved_msg_count INTEGER DEFAULT 0
);

-- Diaries table
CREATE TABLE IF NOT EXISTS diaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  mood TEXT,
  ai_comment TEXT,
  ai_commented_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_diaries_created ON diaries(created_at);

-- Relationship milestones
CREATE TABLE IF NOT EXISTS relationship (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  level INTEGER DEFAULT 1,
  affection_points INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  first_interaction DATETIME,
  last_interaction DATETIME,
  milestones TEXT DEFAULT '[]',
  updated_at DATETIME DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO relationship (id) VALUES (1);
