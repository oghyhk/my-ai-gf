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
