## Resumo do Aplicativo:

Vou resumir as principais características do aplicativo:

1. Navegação Infinita : O aplicativo permite que os usuários cliquem em palavras destacadas em negrito para navegar para novos verbetes relacionados, criando uma experiência de exploração contínua.

2. Arte e Cultura Visual : Para cada verbete, o aplicativo gera uma imagem única usando IA (Gemini/Imagen), trazendo uma representação artística do tema.

3. Plataforma Colaborativa : Os usuários podem editar e melhorar os verbetes existentes ou criar novos, contribuindo para o acervo de conhecimento.

4. Descoberta e Compartilhamento : Inclui funcionalidades como botão "Aleatório" para descobrir novos temas, histórico de leitura e opções para compartilhar verbetes.

## Aspectos Técnicos
- Desenvolvido com React e TypeScript
- Utiliza a API Gemini da Google para:
  - Gerar conteúdo textual sobre tópicos (gemini-2.5-flash)
  - Criar imagens artísticas representativas (imagen-4.0-generate-001)
- Armazena conteúdo localmente para acesso offline e rápido
- Suporta temas claro e escuro
- Inclui rastreamento de histórico de navegação
- Permite compartilhamento via Web Share API. 

O aplicativo tem uma abordagem educativa e cultural importante, focando na valorização da história e cultura negra do Brasil, África e diáspora africana, tornando esse conhecimento acessível e interativo.

---

## PROGRESSO (15 de julho de 2026)

### Concluído Hoje
- ✅ Criado script de migração do banco de dados `prisma/create_news_table.sql` para tabela `news_articles`.
- ✅ Implementado parser RSS/XML customizado leve no backend (`api/index.js`) capaz de ler múltiplos canais RSS de portais de cultura negra.
- ✅ Implementado gerador de embeddings híbrido de 384 dimensões em `api/index.js` (Ollama local / Gemini cloud API fallback).
- ✅ Criados endpoints `/api/news` (feed paginado com lazy-sync de 6 horas), `/api/news/sync` (sincronização forçada) e `/api/news/ingest` (indexação no RAG).
- ✅ Implementados métodos no frontend `services/databaseService.ts` para integrar o cliente React com a API de notícias de forma autenticada.
- ✅ Criada a página responsiva `pages/NewsFeedPage.tsx` com filtros de canais RSS, paginação, suporte a temas e painel de curador RAG.
- ✅ Modificado `App.tsx` para registrar a nova rota `/noticias` e o respectivo link "Notícias Pretas" no rodapé.
- ✅ Criado script de testes automatizados `tests/test-news-sync.js` e validado sucesso no terminal.

---

## PROGRESSO (7 de dezembro de 2025)

### Concluído Hoje
- ✅ Leitura completa do projeto (estrutura, componentes, serviços, configs)
- ✅ Criado backend Express (`server/index.js`) com endpoints `/api/gemini/content` e `/api/gemini/image`
- ✅ Implementado modo mock estruturado (JSON: text, highlights, relatedTopics, imageBase64, source, metadata)
- ✅ Refatorado `services/geminiService.ts` para chamar backend em vez de usar @google/genai no cliente
- ✅ Removido `process.env.API_KEY` do `vite.config.ts` (segurança)
- ✅ Atualizado `package.json` com dependências backend (express, cors, dotenv, concurrently)
- ✅ Scripts: `npm run dev:server`, `npm run dev`, `npm run dev:all`
- ✅ Melhorias UX: erro com botão retry, loading states, mensagens amigáveis
- ✅ `.gitignore` atualizado para excluir `.env.local`
- ✅ `README.md` com instruções de setup backend

### Preparado para Amanhã (Opção A — SQLite + Prisma + CRUD)

**Tarefas:**
- [ ] Instalar Prisma e @prisma/client
- [ ] Criar schema Prisma com tabelas `topics` (id, slug, title, content, highlights, relatedTopics, imageUrl, source, createdAt, updatedAt) e `revisions` (id, topicId, editor, content, createdAt)
- [ ] Criar migração SQLite: `npx prisma migrate dev --name init`
- [ ] Implementar endpoints CRUD no `server/index.js`:
  - POST /api/topics — criar novo verbete
  - GET /api/topics/:slug — buscar verbete por slug
  - PUT /api/topics/:slug — editar verbete
  - GET /api/topics — listar/buscar com paginação
  - POST /api/topics/:slug/regen — re-gerar via Gemini (sobrescrever)
- [ ] Adicionar lógica de cache: antes de chamar /api/gemini/content, verificar DB
- [ ] Salvar imagens geradas em `server/uploads/` e retornar URL no banco
- [ ] Atualizar `services/geminiService.ts` para usar nova estrutura de resposta com metadados

**Comandos para amanhã:**
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
# editar .env.local: DATABASE_URL="file:./dev.db"
# editar prisma/schema.prisma
npx prisma migrate dev --name init
npm run dev:all
```

**Nota:** Quando API key do Gemini estiver pronta, colocar em `.env.local` e testar geração real.

---




