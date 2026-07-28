-- Tabela: news_feeds
-- Armazena dinamicamente as fontes de feeds RSS/Atom da cultura negra
CREATE TABLE IF NOT EXISTS news_feeds (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT UNIQUE NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE news_feeds ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- 1. Leitura pública para qualquer um
CREATE POLICY "public read news_feeds" ON news_feeds FOR SELECT TO public USING (true);

-- 2. Escrita, atualização e remoção apenas para administradores autenticados
CREATE POLICY "authenticated write news_feeds" ON news_feeds FOR ALL TO authenticated USING (true);

-- Popular com os feeds de notícias iniciais recomendados (sem duplicar URLs)
INSERT INTO news_feeds (name, url, active) VALUES
  ('Guia Negro', 'https://guianegro.com.br/feed/', true),
  ('Mundo Negro', 'https://mundonegro.inf.br/feed/', true),
  ('Alma Preta', 'https://almapreta.com.br/feed/', true),
  ('Geledés', 'https://www.geledes.org.br/feed/', true),
  ('Notícia Preta', 'https://noticiapreta.com.br/feed/', true)
ON CONFLICT (url) DO NOTHING;
