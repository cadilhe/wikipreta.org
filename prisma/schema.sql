-- Topics table: armazena verbetes gerados
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  highlights TEXT, -- JSON array como string
  relatedTopics TEXT, -- JSON array como string
  imageUrl TEXT,
  source TEXT DEFAULT 'user', -- 'gemini', 'user', 'mock'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Revisions table: histórico de edições
CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topicId INTEGER NOT NULL,
  content TEXT NOT NULL,
  editor TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE
);

-- Users table: autenticação
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'editor', -- 'admin', 'editor'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_source ON topics(source);
CREATE INDEX IF NOT EXISTS idx_revisions_topicId ON revisions(topicId);
