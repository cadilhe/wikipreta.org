# Setup Guide — Wikipreta.org

Guia completo para configurar o ambiente de desenvolvimento do zero.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Node.js | 20.x LTS | `node -v` |
| npm | 9.x | `npm -v` |
| Git | 2.x | `git -v` |
| Conta Supabase | — | [supabase.com](https://supabase.com) |
| Chave DeepSeek | — | [platform.deepseek.com](https://platform.deepseek.com) |
| Chave Google Gemini | — | [aistudio.google.com](https://aistudio.google.com) |

---

## 1. Clonar e Instalar

```bash
git clone <repo-url> wikipreta
cd wikipreta
npm install
```

---

## 2. Variáveis de Ambiente

Crie `.env` na raiz do projeto:

```env
# ── IA Providers ──────────────────────────────────────
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AIza...
OLLAMA_BASE_URL=http://localhost:11434    # opcional
OLLAMA_MODEL=llama3                       # opcional
PREFER_OLLAMA=false

# ── Supabase (Frontend — expostos ao browser via VITE_) ──
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# ── Supabase (Backend — NUNCA prefixar com VITE_) ────
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # chave de serviço (acesso total)

# ── Servidor ─────────────────────────────────────────
PORT=4000
NODE_ENV=development
```

> ⚠️ **NUNCA** usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
> Variáveis prefixadas com `VITE_` são expostas ao browser — use apenas a `anon key`.

---

## 3. Inicializar o Banco de Dados

```bash
# Executa o db-init.js — cria tabelas no Supabase se não existirem
npm run setup:db
```

Ou aplique manualmente o SQL em `docs/architecture/DATABASE_SCHEMA.md` no SQL Editor do Supabase.

---

## 4. Configurar Supabase

### 4.1 Criar Projeto
1. [supabase.com/dashboard](https://supabase.com/dashboard) → New Project
2. Anote: Project URL, anon key e service_role key

### 4.2 Habilitar Auth
- Dashboard → Authentication → Providers → Email: **habilitar**
- Criar usuário admin manualmente (Auth → Users → Add User)
- No perfil do usuário: adicionar metadata `{ "role": "admin" }`

### 4.3 Criar Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('verbetes-images', 'verbetes-images', true);
```

### 4.4 Habilitar pgvector (para RAG)
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 5. Rodar o Projeto

```bash
# Frontend + Backend simultâneos (recomendado)
npm run dev:all

# Separadamente:
npm run dev          # Frontend apenas (Vite, porta 3000)
npm run dev:server   # Backend apenas (Express, porta 4000, com --watch)
```

Acesse [http://localhost:3000](http://localhost:3000)

O frontend faz proxy de `/api/*` → `http://localhost:4000` (configurado no `vite.config.ts`).

---

## 6. Estrutura de Pastas

```
wikipreta.org/
├── components/              ← Componentes React
│   ├── SearchBar.tsx
│   ├── ContentDisplay.tsx   ← Renderiza verbete com links interativos
│   ├── AdminLayout.tsx
│   ├── ThemeSwitcher.tsx
│   ├── HistoryPanel.tsx
│   └── LoadingSkeleton.tsx
│
├── pages/                   ← Páginas do admin
│   ├── AdminDashboard.tsx
│   ├── AdminImages.tsx
│   └── AdminUsers.tsx
│
├── services/                ← Serviços do frontend
│   ├── databaseService.ts   ← CRUD de tópicos (via API backend)
│   ├── geminiService.ts     ← Proxy para /api/gemini/*
│   └── supabase.ts          ← Cliente Supabase (browser)
│
├── context/
│   └── AuthContext.tsx      ← Estado de autenticação global
│
├── api/                     ← Express backend (Node.js)
│   ├── index.js             ← Servidor principal + todas as rotas
│   ├── supabase.js          ← Cliente Supabase (service role)
│   ├── utils.js             ← slugify, banned words
│   ├── auth.js              ← Helpers de JWT
│   └── db-init.js           ← Inicialização do banco
│
├── public/
│   └── assets/images/random/ ← Imagens culturais de fallback
│
├── App.tsx                  ← Router principal + lógica de app
├── index.tsx                ← Entry point React
├── vite.config.ts           ← Config Vite + proxy /api
└── docs/                    ← Esta documentação
```

---

## 7. Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev:all` | Frontend + Backend simultâneos |
| `npm run dev` | Apenas frontend (Vite, porta 3000) |
| `npm run dev:server` | Apenas backend (Express, porta 4000) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run setup:db` | Inicializar banco de dados |

---

## 8. Deploy

### Frontend (estático)
```bash
npm run build
# Gera dist/ — suba para Vercel, Netlify ou Hostinger
```

### Backend (Node.js)
O servidor Express precisa de um ambiente Node.js (ex: Railway, Render, VPS).

Variáveis de ambiente de produção:
- Usar chaves `live` de todos os providers
- `NODE_ENV=production`
- Configurar CORS para o domínio real em `api/index.js`
