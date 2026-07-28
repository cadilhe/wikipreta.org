# Wikipreta.org — Documentação Central

> Enciclopédia colaborativa de história e cultura negra com geração de conteúdo por IA.
> Stack: React 19 · Vite · Express.js · Supabase · DeepSeek · Gemini

---

## Onde Começar

| Objetivo | Arquivo |
|---|---|
| Entender o produto e sua visão | [prd/PRD.md](./prd/PRD.md) |
| Configurar o ambiente de desenvolvimento | [SETUP_GUIDE.md](../help-docs/SETUP_GUIDE.md) |
| Entender regras de código | [rules/CODING_RULES.md](./rules/CODING_RULES.md) |
| Entender a pipeline de geração por IA | [architecture/AI_PIPELINE.md](./architecture/AI_PIPELINE.md) |
| Entender o schema do banco | [architecture/DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md) |
| Trabalhar em um módulo específico | `skills/SKILL_*.md` |
| Contexto completo para agente IA | [prompts/AI_AGENT_PROMPT.md](./prompts/AI_AGENT_PROMPT.md) |

---

## Estrutura da Documentação

```
docs/
├── INDEX.md                         ← Este arquivo
│
├── prd/
│   └── PRD.md                       ← Visão, personas, funcionalidades, roadmap
```,StartLine:13,TargetContent:
│
├── rules/
│   ├── CODING_RULES.md              ← Stack, padrões, convenções, segurança
│   ├── COMPONENT_RULES.md           ← Componentes React, contexto, roteamento
│   └── API_RULES.md                 ← Express backend, endpoints, validação
│
├── architecture/
│   ├── DATABASE_SCHEMA.md           ← Tabelas, índices, RLS (Supabase)
│   └── AI_PIPELINE.md               ← Pipeline de geração IA (RAG + fallback)
│
├── skills/
│   ├── SKILL_content_generation.md  ← Geração de verbetes por IA
│   ├── SKILL_topics_crud.md         ← CRUD de tópicos e revisões
│   ├── SKILL_image_generation.md    ← Geração e armazenamento de imagens
│   ├── SKILL_admin.md               ← Painel administrativo
│   └── SKILL_auth.md                ← Autenticação Supabase + JWT
│
└── prompts/
    ├── AI_AGENT_PROMPT.md           ← System prompt para agentes IA
    └── FEATURE_REQUESTS.md          ← Templates de feature requests
```

---

## Stack em 30 Segundos

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + React Router 7 + TypeScript 5.8 |
| **Build** | Vite 6.2 |
| **Estilo** | Tailwind CSS |
| **Backend** | Express.js 4 (porta 4000) |
| **Banco** | Supabase (PostgreSQL + Auth + Storage + pgvector) |
| **IA Texto** | DeepSeek (primário) → Gemini 1.5 Flash → Ollama |
| **IA Imagem** | Gemini Imagen 3.0 |
| **Auth** | Supabase Auth (JWT) |
| **Deploy** | Frontend: estático · Backend: Node.js |

---

## Arquitetura de Alto Nível

```
Browser (React + Vite)
    │
    ├── /api/* → proxy → Express Backend (porta 4000)
    │                         ├── DeepSeek API
    │                         ├── Gemini API
    │                         ├── Ollama (opcional, VPS)
    │                         └── Supabase (PostgreSQL + Storage)
    │
    └── Supabase JS (Auth direto do frontend)
```

---

## Módulos do Sistema

| Módulo | Skill | Status |
|---|---|---|
| Geração de Verbetes (IA + RAG) | [SKILL_content_generation.md](./skills/SKILL_content_generation.md) | ✅ Produção |
| CRUD de Tópicos e Revisões | [SKILL_topics_crud.md](./skills/SKILL_topics_crud.md) | ✅ Produção |
| Geração de Imagens | [SKILL_image_generation.md](./skills/SKILL_image_generation.md) | ✅ Produção |
| Painel Administrativo | [SKILL_admin.md](./skills/SKILL_admin.md) | ✅ Produção |
| Autenticação | [SKILL_auth.md](./skills/SKILL_auth.md) | ✅ Produção |

---

## Regras de Segurança

| Camada | Proteção |
|---|---|
| **Rate Limiting** | 30 req/min por IP no backend |
| **Payload** | Máx 10MB request, 100 chars título, 10.000 chars conteúdo |
| **Banned Terms** | 1000+ termos bloqueados (slurs, SQL injection, palavras de código) |
| **Auth** | JWT validado via Supabase em todas as rotas de escrita |
| **Storage** | Imagens em bucket `verbetes-images` (Supabase Storage) |
| **API Keys** | Nenhuma chave de IA exposta no frontend — tudo via backend proxy |

---

*Atualizado em 21 de maio de 2026*
