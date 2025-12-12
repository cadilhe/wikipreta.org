# Wikipreta.org — Estrutura Limpa (Dezembro 2024)

## 📁 Estrutura do Projeto (Após Limpeza de Prisma)

```
wikipreta.org/
├── server/                    # Backend Express (port 4000)
│   ├── index.js              # Main server + API endpoints
│   ├── db-init.js            # SQLite initialization with better-sqlite3
│   ├── init-db.js            # Setup script to create database
│   ├── db_check.js           # Utility to query database
│   ├── utils.js              # Helper functions (slugify, generateImageFilename)
│   └── uploads/              # Generated images (Imagen API)
│
├── tests/                     # Test scripts (optional, can be deleted)
│   ├── e2e_test.js           # Full end-to-end test
│   ├── test_real_gemini.js   # Test real Gemini generation
│   ├── test_image_gen.js     # Test image generation
│   ├── test_mock_image.js    # Test mock image (offline)
│   └── smoke_test*.js        # Quick smoke tests
│
├── prisma/                    # Database files (SQLite only)
│   ├── dev.db                # SQLite database (auto-created)
│   └── schema.sql            # SQL DDL for tables
│
├── components/               # React components (UI)
├── services/                 # Frontend services (API calls)
├── index.tsx                 # React entry point
├── vite.config.ts            # Vite build config
├── package.json              # Dependencies & scripts
├── .env.local                # Environment variables (API key)
└── README.md                 # Documentation
```

## 🗑️ O Que Foi Removido

### Prisma ORM (Desatualizado)
- ❌ `prisma.config.ts` — Config file para Prisma v7 (não compatível)
- ❌ `prisma.config.js` — Alternative config format
- ❌ `prisma/schema.prisma` — Prisma schema (substituído por SQL puro)
- ❌ `server/db.js` — Prisma client factory

**Por que?** Prisma v7 introduziu breaking changes (datasource URL handling, TS config parsing) que não são necessários para este projeto. `better-sqlite3` é mais leve e direto.

## ✅ Estrutura Final (Limpa)

### Backend (`server/`)
- **index.js** — Express server + Gemini proxy + CRUD endpoints
- **db-init.js** — SQLite connection + schema initialization
- **utils.js** — Helper functions (slugify, image filename generation)

### Database (`prisma/`)
- **schema.sql** — Table DDL (topics + revisions)
- **dev.db** — SQLite database file (git-ignored)

### Frontend
- React + TypeScript + Vite (não alterado)
- Chama backend em `http://localhost:4000/api/*`

## 🚀 Como Usar

### Setup
```bash
npm install
npm run setup:db        # Initialize database (calls server/db-init.js)
```

### Desenvolvimento
```bash
npm run dev:all        # Start backend + frontend (concurrent)
# Backend: http://localhost:4000
# Frontend: http://localhost:3000
```

### Testes
```bash
node tests/e2e_test.js              # Full E2E (Gemini + DB)
node tests/test_real_gemini.js      # Text generation only
node tests/test_mock_image.js       # Mock mode offline test
```

## 📝 .gitignore Atualizado

```gitignore
# Database files (SQLite)
prisma/dev.db
prisma/dev.db-shm
prisma/dev.db-wal

# Generated images
server/uploads/*
!server/uploads/.gitkeep
```

## 🎯 Resumo da Migração

| Antes | Depois | Motivo |
|-------|--------|--------|
| Prisma ORM | better-sqlite3 | Mais simples, sem breaking changes |
| `prisma.config.ts` | `db-init.js` | Sem config files complexos |
| `schema.prisma` | `schema.sql` | SQL puro, transparente |
| Testes na raiz | `tests/` | Organização melhor |

## ✨ Benefícios da Nova Arquitetura

1. **Sem dependências desnecessárias** — Prisma removido
2. **SQL transparente** — Fácil debugar e modificar
3. **Sem breaking changes** — better-sqlite3 é estável
4. **Mock mode built-in** — Offline testing sem API key
5. **Auto-persistence** — Verbetes salvos automaticamente
6. **Revisions tracking** — Histórico de edições no DB

