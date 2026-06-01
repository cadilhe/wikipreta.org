# API Rules — Wikipreta.org

> Padrões para o backend Express (api/index.js) e os serviços frontend.

---

## 1. Estrutura do Backend

```
api/
├── index.js      ← Servidor Express + todas as rotas
├── supabase.js   ← Cliente Supabase (service_role)
├── utils.js      ← slugify, isBanned, sanitize
├── auth.js       ← validateToken (JWT Supabase)
└── db-init.js    ← Inicialização das tabelas
```

---

## 2. Endpoints

### Health
```
GET /api/ping
→ { status: 'ok', timestamp }
```

### Conteúdo (IA)
```
POST /api/gemini/content
Body: { topic: string }
→ { text, highlights[], relatedTopics[], source, cached }

POST /api/gemini/image        [auth obrigatório]
Body: { topic: string }
→ { imageUrl, source, cached }
```

### Tópicos CRUD
```
GET  /api/topics/:slug         → { topic, revisions[] }
GET  /api/topics?page=&limit=&search=   → { topics[], total, page, totalPages }
POST /api/topics               [auth] Body: { title, content, highlights[], image_url }
PUT  /api/topics/:slug         [auth] Body: { content, highlights[], image_url }
DELETE /api/topics/:slug       [auth]
```

### Utilitários
```
GET /api/random-images         → { images: string[] }
```

---

## 3. Validação de Request (Backend)

```javascript
// Toda rota de criação/edição deve validar:
const { title, content } = req.body;

if (!title || typeof title !== 'string') {
  return res.status(400).json({ error: 'Título obrigatório' });
}
if (title.length > 100) {
  return res.status(400).json({ error: 'Título muito longo (max 100 chars)' });
}
if (content && content.length > 10000) {
  return res.status(400).json({ error: 'Conteúdo muito longo (max 10.000 chars)' });
}
if (isBanned(title)) {
  return res.status(400).json({ error: 'Título inválido' });
}
```

---

## 4. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minuto
  max: 30,               // máximo 30 requests por IP
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' }
});

app.use('/api', limiter);
```

---

## 5. Serviços do Frontend

### databaseService.ts
Responsável por toda comunicação com o backend. **Nunca** chamar `/api/*` diretamente de componentes.

```typescript
// services/databaseService.ts
export const databaseService = {
  async getTopic(slug: string): Promise<Topic | null> {
    const res = await fetch(`/api/topics/${slug}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Erro ao buscar tópico');
    return res.json();
  },

  async saveTopic(topic: Partial<Topic>): Promise<Topic> {
    const token = await getToken(); // Supabase JWT
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(topic),
    });
    if (!res.ok) throw new Error('Erro ao salvar tópico');
    return res.json();
  },
};
```

### geminiService.ts
Proxy para os endpoints de IA.

```typescript
export async function generateContent(topic: string) {
  const res = await fetch('/api/gemini/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error('Erro ao gerar conteúdo');
  return res.json(); // { text, highlights, relatedTopics, source, cached }
}
```

---

## 6. Autenticação (Backend)

```javascript
// api/auth.js
import { supabase } from './supabase.js';

export async function validateToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}
```

---

## 7. CORS

```javascript
// api/index.js
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://wikipreta.org', 'https://www.wikipreta.org']
    : 'http://localhost:3000',
  credentials: true,
}));
```

---

## 8. Padrão de Resposta de Erro

```javascript
// ✅ Sempre usar este formato
res.status(400).json({ error: 'Mensagem clara para o usuário' });
res.status(401).json({ error: 'Não autorizado' });
res.status(404).json({ error: 'Tópico não encontrado' });
res.status(500).json({ error: 'Erro interno do servidor' });

// ❌ Nunca expor stack traces em produção
res.status(500).json({ error: error.stack }); // PROIBIDO
```
