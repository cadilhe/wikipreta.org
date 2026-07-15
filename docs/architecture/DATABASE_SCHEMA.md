# Database Schema — Wikipreta.org

> Supabase (PostgreSQL) · RLS configurado · pgvector para RAG

---

## Diagrama

```
topics
  ├── id (PK)
  ├── slug (UNIQUE)
  ├── title
  ├── content
  ├── highlights[]    ← termos em negrito extraídos
  ├── related_topics[]
  ├── image_url
  └── source

  └──► revisions (1:N)
         ├── id (PK)
         ├── topic_id (FK)
         ├── content   ← versão anterior
         └── editor_email

knowledge_base           ← base RAG
  ├── id (PK)
  ├── content
  ├── embedding (vector) ← pgvector
  └── metadata (jsonb)
```

---

## Tabela: `topics`

```sql
CREATE TABLE topics (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT,
  highlights      JSONB DEFAULT '[]'::jsonb,   -- string[]
  related_topics  JSONB DEFAULT '[]'::jsonb,   -- string[]
  image_url       TEXT,
  source          TEXT DEFAULT 'gemini'
                    CHECK (source IN ('gemini','deepseek','user','mock','ollama')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_slug   ON topics(slug);
CREATE INDEX idx_topics_source ON topics(source);
CREATE INDEX idx_topics_title  ON topics USING gin(to_tsvector('portuguese', title));
```

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| `slug` | text UNIQUE | Chave de busca (accent-insensitive, sem artigos) |
| `highlights` | jsonb (string[]) | Termos em `**negrito**` extraídos do conteúdo |
| `related_topics` | jsonb (string[]) | Tópicos sugeridos pela IA |
| `source` | text | Qual provider gerou o conteúdo |

---

## Tabela: `revisions`

Histórico de edições para auditoria.

```sql
CREATE TABLE revisions (
  id           BIGSERIAL PRIMARY KEY,
  topic_id     BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,           -- conteúdo ANTERIOR à edição
  editor_email TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revisions_topic_id ON revisions(topic_id);
```

> A revisão armazena o conteúdo **antes** da edição — funciona como um "undo log".

---

## Tabela: `knowledge_base`

Base de conhecimento para RAG (Retrieval-Augmented Generation).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_base (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT NOT NULL,
  embedding VECTOR(384),       -- dimensão do modelo Ollama nomic-embed-text
  metadata  JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por similaridade (cosine)
CREATE INDEX idx_knowledge_embedding
  ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Busca semântica (função):**
```sql
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(384),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id BIGINT, content TEXT, similarity FLOAT)
LANGUAGE sql AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

---

## Tabela: `news_articles`

Cache de notícias importadas dos feeds RSS da cultura negra.

```sql
CREATE TABLE news_articles (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  source_name     TEXT NOT NULL,  -- Ex: "Mundo Negro", "Alma Preta"
  link            TEXT UNIQUE NOT NULL,
  pub_date        TIMESTAMPTZ NOT NULL,
  creator         TEXT,
  description     TEXT,
  ingested_to_kb  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_pub_date ON news_articles(pub_date DESC);
CREATE INDEX idx_news_ingested ON news_articles(ingested_to_kb);
```

---

## Storage: `verbetes-images`

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('verbetes-images', 'verbetes-images', true);

-- Política de upload (apenas usuários autenticados)
CREATE POLICY "authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verbetes-images');

-- Leitura pública
CREATE POLICY "public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'verbetes-images');
```

---

## RLS — Row Level Security

```sql
-- topics: leitura pública, escrita apenas autenticado
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read topics"
  ON topics FOR SELECT TO public USING (true);

CREATE POLICY "authenticated write topics"
  ON topics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated update topics"
  ON topics FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated delete topics"
  ON topics FOR DELETE TO authenticated USING (true);

-- revisions: leitura pública, insert autenticado
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read revisions" ON revisions FOR SELECT TO public USING (true);
CREATE POLICY "authenticated insert revisions" ON revisions FOR INSERT TO authenticated WITH CHECK (true);

-- knowledge_base: leitura pública (backend usa service_role para escrita)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read kb" ON knowledge_base FOR SELECT TO public USING (true);

-- news_articles: leitura pública, escrita apenas por autenticados
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read news_articles" ON news_articles FOR SELECT TO public USING (true);
CREATE POLICY "authenticated write news_articles" ON news_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## Resumo

| Tabela | Leitura | Escrita |
|---|---|---|
| `topics` | Pública | Autenticado |
| `revisions` | Pública | Autenticado |
| `knowledge_base` | Pública | Service Role (backend) |
| `news_articles` | Pública | Autenticado / Service Role |
| `storage/verbetes-images` | Pública | Autenticado |
