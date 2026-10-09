# Wikipreta.org 🏿✨

Wikipreta.org é uma enciclopédia interativa e colaborativa dedicada à preservação e disseminação da história e cultura negra. O sistema utiliza Inteligência Artificial para geração inicial de conteúdo, com uma camada de curadoria humana e persistência em banco de dados para garantir qualidade e performance.

## 🚀 Tecnologias

- **Frontend**: React 19 + Vite + Tailwind CSS.
- **Backend**: Express.js (Node.js).
- **Banco de Dados**: Supabase (PostgreSQL).
- **Autenticação**: Supabase Auth (Integrado ao dashboard de edição).
- **IA Generativa**: 
  - **Texto**: DeepSeek (Principal) com fallback para Gemini 1.5 Flash.
  - **Imagens**: Pool de imagens randômicas locais + suporte a URLs customizadas.

## 🛠️ Configuração Local

### Pré-requisitos
- Node.js instalado.
- Conta no Supabase (para banco de dados e autenticação).

### 1. Instalação
```bash
npm install
# ou
pnpm install
```

### 2. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz com as seguintes chaves:

```env
# AI Providers
DEEPSEEK_API_KEY=sua_chave_deepseek
GEMINI_API_KEY=sua_chave_gemini

# Supabase Configuration
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role (Uso exclusivo no backend)

# Outros
PORT=4000
```

### 3. Execução
Para rodar o frontend e o backend simultaneamente:
```bash
npm run dev:all
# ou
pnpm dev:all
```

## 🧠 Arquitetura e Funcionalidades

### Fluxo de Conteúdo (Cache)
1. O sistema busca o verbete no **Supabase**.
2. **Hit**: Se existir, carrega instantaneamente.
3. **Miss**: Se não existir, aciona o **DeepSeek/Gemini** para gerar a definição, salva no banco e exibe ao usuário.

### Sistema de Slugs (Busca Inteligente)
A busca e os links são insensíveis a acentos e ignoram artigos comuns (`a, e, da, do, na, no`). 
Exemplo: "Menina da Bahia" e "Menina Bahia" levam ao mesmo registro `menina-bahia`.

### Imagens
- **Randômicas**: Imagens locais em `public/assets/images/random/` são usadas como padrão.
- **Customizadas**: Editores podem salvar URLs de imagens específicas (como links do Supabase Storage) para verbetes individuais.

### Edição e Curadoria
Usuários logados podem editar textos e URLs de imagem através do editor integrado, que possui uma barra de ferramentas para formatação rápida. **Todo texto em negrito (`**termo**`) torna-se automaticamente um link para outro verbete.**

### Base de Conhecimento RAG (Retrieval-Augmented Generation) & Notícias
A inteligência artificial da Wikipreta é ancorada em uma sólida base documental vetorial (*pgvector* com embeddings de 384 dimensões via Ollama `nomic-embed-text` ou Gemini `text-embedding-004`):

1. **Acervo Bibliográfico e Histórico (+28.700 Chunks Indexados)**:
   - **História Geral da África (UNESCO)**: Todos os 8 volumes canônicos completos indexados.
   - **Dicionários e Obras de Referência**: *Dicionário da Escravidão e Liberdade* (Lilia Schwarcz e Flávio Gomes), *Dicionário Histórico dos Movimentos Sociais Brasileiros*, *Glossário do Pensamento Contracolonial*, e múltiplos dicionários e cartilhas antirracistas.
   - **Educação e Sociedade**: Obras sobre saberes quilombolas, racismo institucional, histórias do negro no Brasil, artefatos culturais e diáspora africana.
   - **Pipeline de Ingestão**: Scripts de fragmentação e vetorização automatizada em `api/scripts/ingest.js` (veja [`help-docs/MANUAL_RAG.md`](file:///d:/projects/cadilhe/wikipreta.org/help-docs/MANUAL_RAG.md)).

2. **Feed de Notícias Pretas & Atualidade em Tempo Real**:
   - Integração com 5 portais da imprensa negra (*Guia Negro*, *Mundo Negro*, *Alma Preta*, *Geledés* e *Notícia Preta*).
   - *Lazy-Sync com Cooldown (6h)* ou sincronização sob demanda.
   - Possibilidade de indexar notícias no RAG para conectar fatos contemporâneos aos verbetes históricos gerados pelo motor principal (**DeepSeek**).

## 📂 Estrutura de Pastas
- `/api`: API Express e lógica de integração com IAs, moderação e banco de dados.
  - `/api/data/fontes`: Repositório de fontes documentais e livros em PDF para o RAG.
  - `/api/scripts`: Utilitários de ingestão de conhecimento e vetorização.
- `/services`: Clientes de banco de dados e comunicação com a API.
- `/public/assets/images/random`: Repositório de imagens culturais para exibição randômica.
- `/components`: Componentes React (SearchBar, ContentDisplay, etc).
- `/pages`: Telas e páginas completas da aplicação (Dashboard, Feed de Notícias, etc).
- `/help-docs`: Manuais operacionais e de gestão de conhecimento (RAG, etc).

---
*Wikipreta.org - Conhecimento que resiste.*
