-- Tabela no Supabase para armazenar notícias e o estado de indexação no RAG.
CREATE TABLE IF NOT EXISTS news_articles (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  source_name     TEXT NOT NULL,  -- Ex: "Mundo Negro", "Alma Preta", etc.
  link            TEXT UNIQUE NOT NULL,
  pub_date        TIMESTAMPTZ NOT NULL,
  creator         TEXT,
  description     TEXT,
  ingested_to_kb  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização de consultas por data e estado de ingestão
CREATE INDEX IF NOT EXISTS idx_news_pub_date ON news_articles(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_ingested ON news_articles(ingested_to_kb);

-- Habilita Row Level Security (RLS)
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública de todas as notícias
CREATE POLICY "public read news_articles" ON news_articles
  FOR SELECT TO public USING (true);

-- Permite escrita/atualização apenas pelo backend/administradores (usando service_role ou autenticado)
CREATE POLICY "authenticated write news_articles" ON news_articles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
