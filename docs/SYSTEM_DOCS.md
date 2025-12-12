# Documentação do Sistema Wikipreta.org

## Visão Geral
Wikipreta.org é uma enciclopédia interativa focada na história e cultura negra. O sistema utiliza Inteligência Artificial (Google Gemini) para gerar conteúdo inicial (texto e imagens), que é então armazenado localmente para garantir performance, economia de custos e permitir a curadoria humana.

## Arquitetura

### Frontend (React + Vite)
- **Framework**: React 19 com TypeScript.
- **Roteamento**: `react-router-dom` para navegação SPA.
- **Estilização**: TailwindCSS (via arquivos CSS padrão e classes utilitárias).
- **Gerenciamento de Estado**:
    - `AuthContext`: Gerencia estado de autenticação (JWT).
    - Estados locais em componentes para dados de tópicos e UI.

### Backend (Express + Node.js)
- **Servidor**: Express na porta 4000.
- **Banco de Dados**: SQLite gerenciado via `better-sqlite3` e scripts SQL diretos.
- **ORM/Query Builder**: SQL cru para performance e simplicidade, estrutura inicializada via `db-init.js`.
- **Autenticação**:
    - **JWT**: Tokens assinados para sessões stateless.
    - **Bcrypt**: Hashing de senhas.
    - **Middleware**: `authenticateToken` protege rotas sensíveis.

### Fluxo de Dados e Cache
1. **Requisição de Conteúdo**:
   - O usuário acessa um tópico (ex: "Zumbi").
   - O backend verifica o banco de dados (`topics` table).
   - **Cache Hit**: Retorna conteúdo do banco (rápido, sem custo AI).
   - **Cache Miss**: Chama API Gemini -> Gera texto -> Salva no banco -> Retorna ao usuário.

2. **Requisição de Imagem**:
   - Backend verifica se existe referência de imagem no banco.
   - Verifica se o arquivo físico existe em `server/uploads`.
   - **Hit**: Retorna imagem local.
   - **Miss**: Chama Gemini (Imagen 3) -> Salva arquivo -> Atualiza banco -> Retorna.

## Autenticação e Permissões

### Níveis de Acesso
- **Visitante**: Pode buscar, ler verbetes e gerar novos verbetes (se configurado para permitir geração pública, atualmente sim para texto).
- **Editor/Admin**: Pode editar verbetes existentes, gerar imagens (se restrito) e gerenciar conteúdo.

### Endpoints de Auth
- `POST /api/auth/login`: Autentica usuário e retorna JWT.
- `POST /api/auth/register`: Cria novo usuário (atualmente aberto ou via script).
- `GET /api/auth/me`: Retorna dados do usuário atual.

### Como criar o primeiro Admin
Execute o script de seed no servidor:
```bash
node server/create-admin.js
```
Isso criará o usuário `admin` com senha `adminpassword123`.

## Banco de Dados
Arquivo: `prisma/dev.db` (SQLite)

### Tabelas Principais
- **topics**: Armazena o conteúdo atual dos verbetes.
- **revisions**: Histórico de alterações de texto.
- **users**: Usuários e hashes de senha.

## Guia de Desenvolvimento

### Instalação
```bash
npm install
npm run setup:db
```

### Execução
Roda frontend (3000) e backend (4000) simultaneamente:
```bash
npm run dev:all
```

### Variáveis de Ambiente (.env.local)
```
GEMINI_API_KEY=sua_chave_aqui
JWT_SECRET=segredo_para_tokens
```
