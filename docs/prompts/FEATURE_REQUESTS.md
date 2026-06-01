# Feature Requests — Wikipreta.org

> Templates para solicitar novas funcionalidades.

---

## Template Geral

```markdown
## [F00X] Nome da Feature

**Tipo:** Nova Feature | Melhoria | Bug Fix
**Módulo:** Enciclopédia | Admin | IA | Auth | Imagens | API
**Prioridade:** Alta | Média | Baixa

### Descrição
[O que faz em 2-3 frases]

### Motivação
[Por que é importante? Qual problema resolve?]

### Comportamento Esperado
1. Passo 1
2. Passo 2

### Schema (se aplicável)
[Novas colunas ou tabelas]

### Critérios de Aceite
- [ ] Critério 1
```

---

## [F001] Busca Full-Text no Conteúdo

**Módulo:** Enciclopédia · **Prioridade:** Alta

Atualmente a busca encontra apenas tópicos existentes por slug/título.
Full-text search permitiria encontrar verbetes pelo conteúdo.

**Schema:**
```sql
-- Índice GIN já existe em title, adicionar em content
CREATE INDEX idx_topics_content ON topics
  USING gin(to_tsvector('portuguese', content));

-- Função de busca
CREATE OR REPLACE FUNCTION search_topics(query TEXT)
RETURNS TABLE (id BIGINT, slug TEXT, title TEXT, excerpt TEXT, rank FLOAT)
LANGUAGE sql AS $$
  SELECT id, slug, title,
    ts_headline('portuguese', content, plainto_tsquery('portuguese', query)) AS excerpt,
    ts_rank(to_tsvector('portuguese', content), plainto_tsquery('portuguese', query)) AS rank
  FROM topics
  WHERE to_tsvector('portuguese', title || ' ' || content) @@ plainto_tsquery('portuguese', query)
  ORDER BY rank DESC
  LIMIT 20;
$$;
```

**Critérios:**
- [ ] Endpoint `GET /api/search?q=quilombo` retorna tópicos com trechos relevantes
- [ ] SearchBar exibe resultados inline (dropdown) durante digitação
- [ ] Highlight do termo buscado nos resultados

---

## [F002] Exportar Verbete como PDF

**Módulo:** Enciclopédia · **Prioridade:** Média

Botão "Exportar PDF" na página do verbete.

**Critérios:**
- [ ] PDF inclui: título, imagem, conteúdo formatado, data de geração
- [ ] Fonte e estilo consistentes com o design da enciclopédia
- [ ] Funciona no mobile
- [ ] Gerado client-side (sem endpoint extra) via `pdfjs-dist` ou `pdf-lib`

---

## [F003] Categorias e Tags

**Módulo:** Enciclopédia + Admin · **Prioridade:** Média

Classificação de verbetes por categoria (Pessoas, Movimentos, Cultura, Arte, etc.)

**Schema:**
```sql
ALTER TABLE topics ADD COLUMN categories TEXT[] DEFAULT '{}';
CREATE INDEX idx_topics_categories ON topics USING gin(categories);
```

**Critérios:**
- [ ] Seletor de categorias na criação/edição de verbete
- [ ] Filtro por categoria na enciclopédia
- [ ] Sidebar com categorias mais populares

---

## [F004] Citações e Fontes

**Módulo:** Enciclopédia · **Prioridade:** Alta

Permitir que editores adicionem referências bibliográficas aos verbetes.

**Schema:**
```sql
CREATE TABLE citations (
  id          BIGSERIAL PRIMARY KEY,
  topic_id    BIGINT REFERENCES topics(id) ON DELETE CASCADE,
  authors     TEXT,
  title       TEXT NOT NULL,
  year        INTEGER,
  url         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Critérios:**
- [ ] Seção "Referências" no final de cada verbete
- [ ] Interface de adição de citação no modo edição
- [ ] Formatação ABNT automática

---

## [F005] API Pública de Verbetes

**Módulo:** API · **Prioridade:** Média

Permitir que desenvolvedores acessem verbetes via API REST com chave de API.

```
GET https://api.wikipreta.org/v1/topics/:slug
  Headers: X-API-Key: <chave>
  → { title, content, highlights[], image_url, source, created_at }

GET https://api.wikipreta.org/v1/topics?search=quilombo&limit=10
  → { topics[], total }
```

**Schema:**
```sql
CREATE TABLE api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id),
  key_hash   TEXT UNIQUE NOT NULL,
  name       TEXT,
  requests   INTEGER DEFAULT 0,
  limit_day  INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## [F006] Modo PWA / Offline

**Módulo:** Frontend · **Prioridade:** Baixa

Instalar o Wikipreta como app nativo com suporte offline para verbetes já visitados.

**Critérios:**
- [ ] manifest.json configurado (nome, ícones, cores)
- [ ] Service Worker com cache de verbetes visitados (IndexedDB)
- [ ] Indicador "Você está offline" quando sem conexão
- [ ] Botão "Instalar App" no mobile
