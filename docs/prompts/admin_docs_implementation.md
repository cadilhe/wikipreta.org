# Solicitação de Implementação: Central de Documentação do Administrador (docs)

Preciso implementar um visualizador de documentação interna na área administrativa. O objetivo é ler arquivos Markdown (`.md`) da pasta `/docs` (e de todas as suas subpastas) na raiz do projeto e renderizá-los dinamicamente em uma rota de documentação administrativa protegida, adicionando um link de acesso no painel de administração.

## 🛠️ Contexto do Projeto
* **Frontend:** React 19 + Vite (Roteamento via `react-router-dom` no arquivo `App.tsx`).
* **Backend:** Express.js (Node.js) sob a pasta `/api` (arquivo principal: `api/index.js`).
* **Autenticação:** Supabase Auth integrada ao contexto de autenticação (`useAuth` em `context/AuthContext.tsx`).
* **Estilização:** Tailwind CSS (estilo vanilla com suporte a temas Dark/Light controlado via classe `.dark` no elemento `<html>`).
* **Origem dos Documentos:** Diretório raiz `/docs` (contendo arquivos como `INDEX.md`, `SETUP_GUIDE.md` e subpastas como `/docs/architecture/`, `/docs/operations/`, etc.).

---

## 🎯 Requisitos da Implementação

### 1. Backend (API Express protegida para Admin)
Como o frontend roda no cliente, o servidor Express precisa ler o sistema de arquivos local e validar as permissões de administrador antes de entregar o conteúdo:
* Crie um middleware de autenticação e verificação de privilégios em `/api` para validar o token JWT do Supabase e garantir que o usuário tenha a `role` de **`admin`**.
* Crie os seguintes endpoints protegidos por esse middleware de admin:
  * **`GET /api/admin/docs`**: Escaneia recursivamente a pasta `/docs` (e suas subpastas), gerando uma lista estruturada/hierárquica de arquivos `.md` disponíveis com metadados (como título extraído via `gray-matter`, slug/caminho relativo e subpasta de origem).
  * **`GET /api/admin/docs/:path`**: Recebe o caminho relativo do documento (ex: `architecture/database.md`), lê o arquivo da pasta `/docs` e retorna o frontmatter e o conteúdo bruto do Markdown.

### 2. Rota e Página Protegida no Frontend (React)
* Instale a biblioteca `react-markdown` (ou semelhante) no frontend para renderizar o Markdown.
* Crie o componente de página `pages/AdminDocsPage.tsx` (ou semelhante).
* A página deve possuir um layout de duas colunas:
  * **Painel Lateral Esquerdo (Navegação):** Exibe a árvore hierárquica (ou lista categorizada) dos documentos encontrados na pasta `/docs` e subpastas.
  * **Painel Direito (Leitura):** Renderiza o conteúdo do Markdown ativo em ambos os temas (light/dark) do site.
* No arquivo `App.tsx`, registre a nova rota envolvendo-a com o componente de proteção existente:
  ```tsx
  <Route 
    path="/admin/docs" 
    element={
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDocsPage />
      </ProtectedRoute>
    } 
  />
  ```

### 3. Integração com a Área Administrativa
* Adicione o link "Documentação Técnica" ou "Docs Internos" apenas em locais visíveis para administradores autenticados, tais como:
  * No painel de controle administrativo `pages/AdminDashboard.tsx`.
  * Nas opções da barra de navegação superior/rodapé quando o usuário logado for um `admin`.

### 4. Estilo & UI/UX (Suporte Dark/Light)
* Respeite a paleta de cores do site, com detalhes em dourado/âmbar (`#B8860B` / `#D4AF37`) e contraste adequado no tema escuro.
* Os arquivos `.md` devem ser renderizados de forma legível (tipografia agradável, bom espaçamento para cabeçalhos e realce básico para blocos de código se houver).

---

## 🚀 O que você deve entregar:
1. Endpoints e regras de proteção no backend `/api` para leitura recursiva de arquivos da pasta `/docs`.
2. Nova página `AdminDocsPage.tsx` e as alterações de rotas no `App.tsx`.
3. Modificações na interface administrativa para exibir o link de acesso aos documentos.
4. Novas dependências a serem adicionadas nos respectivos arquivos `package.json` (ex: `gray-matter` no Express, `react-markdown` no React).
