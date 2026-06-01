# Skill: CRUD de Tópicos e Revisões

> Criar, ler, editar e excluir verbetes — com histórico de revisões.

---

## Modelo de Dados

```typescript
interface Topic {
  id: number;
  slug: string;                 // chave única, accent-insensitive
  title: string;
  content: string;              // texto com **negrito** para links
  highlights: string[];         // termos extraídos do negrito
  related_topics: string[];     // sugestões de outros verbetes
  image_url: string | null;
  source: 'gemini' | 'deepseek' | 'user' | 'mock' | 'ollama';
  created_at: string;
  updated_at: string;
}

interface Revision {
  id: number;
  topic_id: number;
  content: string;              // conteúdo ANTERIOR à edição
  editor_email: string;
  created_at: string;
}
```

---

## Criar Tópico

```
POST /api/topics          [auth obrigatório]
Body: { title, content, highlights[], related_topics[], image_url }

1. validateToken(req) → user
2. slugify(title) → slug
3. isBanned(title) → rejeita se banido
4. Verifica duplicata: SELECT FROM topics WHERE slug = ?
5. INSERT INTO topics
6. Retorna { topic }
```

---

## Ler Tópico

```
GET /api/topics/:slug     [público]

1. SELECT * FROM topics WHERE slug = :slug
2. SELECT * FROM revisions WHERE topic_id = topic.id ORDER BY created_at DESC
3. Retorna { topic, revisions[] }
```

---

## Editar Tópico

```
PUT /api/topics/:slug     [auth obrigatório]
Body: { content, highlights[], image_url }

1. validateToken(req) → user
2. SELECT topic atual → guarda content atual
3. INSERT INTO revisions { topic_id, content: content_atual, editor_email }
4. UPDATE topics SET content = ?, highlights = ?, updated_at = NOW()
5. Retorna { topic }
```

> Cada edição gera automaticamente uma revisão com o conteúdo anterior.

---

## Excluir Tópico

```
DELETE /api/topics/:slug  [auth obrigatório]

1. validateToken(req)
2. SELECT topic → verifica existência
3. DELETE FROM topics WHERE slug = :slug
   (revisions são deletadas por CASCADE)
4. Retorna { success: true }
```

---

## Listar Tópicos (Admin)

```
GET /api/topics?page=1&limit=20&search=zumbi   [público]

1. Constrói query com paginação
2. Se search: WHERE title ILIKE '%zumbi%'
3. SELECT + COUNT total
4. Retorna { topics[], total, page, totalPages }
```

---

## Modo de Edição (Frontend)

Ativado via URL param `?edit=true` (requer auth):

```tsx
// App.tsx
const editMode = new URLSearchParams(location.search).get('edit') === 'true';

async function handleSave(updatedContent: string) {
  const token = await supabase.auth.getSession();
  await databaseService.updateTopic(slug, {
    content: updatedContent,
    highlights: extractHighlights(updatedContent),
  }, token);
  setEditMode(false);
  setTopic({ ...topic, content: updatedContent });
}
```

---

## Histórico de Revisões

```tsx
// Exibir revisões no painel admin
{revisions.map(rev => (
  <div key={rev.id} className="revision-item">
    <span className="text-sm text-gray-500">
      {format(new Date(rev.created_at), 'dd/MM/yyyy HH:mm')}
    </span>
    <span className="text-sm">{rev.editor_email}</span>
    <button onClick={() => restoreRevision(rev.content)}>
      Restaurar
    </button>
  </div>
))}
```

---

## Arquivos Relevantes

| Arquivo | Responsabilidade |
|---|---|
| `api/index.js` | Rotas CRUD (`/api/topics/*`) |
| `services/databaseService.ts` | CRUD via fetch |
| `pages/AdminDashboard.tsx` | Interface de listagem/edição |
| `App.tsx` | Modo de edição inline |
| `api/utils.js` | slugify, isBanned |
