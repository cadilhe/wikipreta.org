# Coding Rules — Wikipreta.org

> Padrões obrigatórios para todo código do projeto.

---

## 1. Stack e Versões

| Tecnologia | Versão | Contexto |
|---|---|---|
| React | 19.1.0 | Frontend |
| React Router DOM | 7.10.1 | Roteamento SPA |
| TypeScript | 5.8.2 | Frontend + tipos |
| Vite | 6.2.0 | Build e dev server |
| Tailwind CSS | (via Vite) | Estilização |
| Express.js | 4.18.2 | Backend API |
| Node.js | 20.x LTS | Runtime backend |
| @supabase/supabase-js | 2.105.3 | BD + Auth + Storage |
| @google/generative-ai | 0.24.1 | Gemini texto (fallback) |
| @google/genai | 1.7.0 | Gemini imagens |

---

## 2. Separação Frontend / Backend

**Regra fundamental:** as duas partes são projetos distintos dentro do mesmo repo.

```
Frontend (Vite/React) — porta 3000
  ├── Pode usar: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  ├── NÃO pode conter: chaves de IA, SUPABASE_SERVICE_ROLE_KEY
  └── Chama o backend via /api/* (proxy Vite)

Backend (Express) — porta 4000
  ├── Contém: DEEPSEEK_API_KEY, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY
  ├── Valida JWT do Supabase em rotas protegidas
  └── Expõe: /api/gemini/content, /api/gemini/image, /api/topics/*
```

---

## 3. Variáveis de Ambiente

```
# ✅ Seguro no frontend (prefixo VITE_)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# ❌ NUNCA no frontend
DEEPSEEK_API_KEY
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
OLLAMA_BASE_URL
```

---

## 4. Geração de Slug

**Sempre** usar a função `slugify()` de `api/utils.js` — nunca improviar:

```javascript
// api/utils.js
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')        // remove acentos
    .replace(/\b(a|e|da|de|do|na|no|as|os|das|dos|nas|nos)\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
```

---

## 5. Autenticação em Rotas Protegidas (Backend)

```javascript
// Toda rota de escrita deve validar o JWT
import { validateToken } from './auth.js';

app.post('/api/topics', async (req, res) => {
  const user = await validateToken(req);   // lança erro se inválido
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  // ... lógica da rota
});
```

**Rotas que requerem auth:**
- `POST /api/topics` — criar
- `PUT /api/topics/:slug` — editar
- `DELETE /api/topics/:slug` — excluir
- `POST /api/gemini/image` — gerar imagem

---

## 6. Banned Terms Filter

Antes de salvar qualquer tópico, validar contra a lista de termos banidos:

```javascript
import { isBanned } from './utils.js';

if (isBanned(req.body.title)) {
  return res.status(400).json({ error: 'Título inválido' });
}
```

A lista inclui: palavras de código (function, const, select, etc.), SQL injection patterns, slurs.

---

## 7. Limites de Payload

```javascript
// api/index.js — configuração global
app.use(express.json({ limit: '10mb' }));

// Validações por campo
const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 10000;

if (title.length > MAX_TITLE_LENGTH) {
  return res.status(400).json({ error: `Título muito longo (max ${MAX_TITLE_LENGTH} chars)` });
}
```

---

## 8. TypeScript no Frontend

- **Strict mode** ativo — sem `any` implícito.
- Interfaces em PascalCase: `Topic`, `Revision`, `User`.
- Tipar retornos de funções assíncronas.

```typescript
// ✅ Correto
interface Topic {
  id: number;
  slug: string;
  title: string;
  content: string;
  highlights: string[];
  related_topics: string[];
  image_url: string | null;
  source: 'gemini' | 'deepseek' | 'user' | 'mock';
  created_at: string;
  updated_at: string;
}

// ❌ Evitar
const topic: any = await fetchTopic(slug);
```

---

## 9. Tratamento de Erros

```typescript
// Frontend — capturar erros de API
try {
  const topic = await databaseService.getTopic(slug);
} catch (error) {
  console.error('[getTopic]', error);
  setError('Erro ao carregar o verbete.');
}

// Backend — resposta consistente
res.status(500).json({ error: 'Erro interno', details: error.message });
```

---

## 10. Commits Semânticos

```
feat:     nova funcionalidade
fix:      correção de bug
content:  adição/correção de verbetes ou base de conhecimento
security: correção de vulnerabilidade
refactor: refatoração sem mudança de comportamento
docs:     documentação
style:    formatação/CSS
chore:    tarefas de build/config
```

---

## 11. Estilização

- Usar **Tailwind CSS** via classes — sem CSS modules.
- Dark mode via classe `dark` no `<html>` (gerenciado pelo `ThemeSwitcher`).
- Tokens de cor no `tailwind.config` — nunca hardcodar hex diretamente no JSX.

```tsx
// ✅ Correto — Tailwind com dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />

// ❌ Evitar — inline style
<div style={{ backgroundColor: '#1a1a1a' }} />
```
