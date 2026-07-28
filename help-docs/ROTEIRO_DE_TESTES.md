# 🧪 Roteiro de Teste Completo - Wikipreta.org

## 1. Preparação do Ambiente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados
npm run setup:db

# 3. Verificar .env.local tem a chave GEMINI_API_KEY definida

# 4. Iniciar frontend + backend
npm run dev:all
```

---

## 2. Testes da Página Principal (http://localhost:3000)

| **Funcionalidade** | **O que testar** | ✅ |
|---|---|---|
| **Carregamento inicial** | Página carrega com tema correto (light/dark) | |
| **Verbete padrão** | "Kanimambo" carrega automaticamente com conteúdo | |
| **Barra de busca** | Digitar um termo e pressionar Enter busca o verbete | |
| **Botão Aleatório** | Clica no dado e carrega verbete aleatório | |
| **Palavras em negrito** | Clicar em palavras em negrito navega para novo verbete | |
| **Tema (dark/light)** | Botão de tema alterna corretamente | |
| **Histórico** | Ícone de relógio abre painel lateral com histórico | |
| **Limpar histórico** | Botão limpa histórico corretamente | |
| **Copiar conteúdo** | Ícone de copiar copia título + definição | |
| **Compartilhar** | Botão share abre opções nativas (mobile) | |
| **Geração de imagem** | Após carregar verbete, imagem é gerada automaticamente | |
| **Download de imagem** | Botão de download baixa a imagem gerada | |

---

## 3. Testes de Navegação

| **Funcionalidade** | **O que testar** | ✅ |
|---|---|---|
| **Home** | Link "Home" no footer retorna à página inicial | |
| **Sobre** | Link "Sobre" mostra página de informações | |
| **Privacidade** | Link "Privacidade" mostra política de privacidade | |
| **URL com parâmetro** | Acessar `/?topic=Quilombo` carrega o verbete correto | |

---

## 4. Testes de Autenticação

| **Funcionalidade** | **O que testar** | ✅ |
|---|---|---|
| **Login (http://localhost:3000/login)** | Página de login carrega corretamente | |
| **Login inválido** | Credenciais erradas mostram mensagem de erro | |
| **Login válido** | Credenciais corretas redirecionam e mostram "Sair" | |
| **Logout** | Botão "Sair" desloga e esconde botões de admin | |
| **Botão Editar** | Só aparece quando autenticado | |
| **Edição de verbete** | Editar conteúdo e salvar funciona | |

---

## 5. Testes do Admin Dashboard (http://localhost:3000/admin)

| **Funcionalidade** | **O que testar** | ✅ |
|---|---|---|
| **Acesso protegido** | Redireciona para login se não autenticado | |
| **Dashboard** | Lista de tópicos carrega corretamente | |
| **Navegação entre conceitos** | Botões "Anterior"/"Próximo" funcionam | |

---

## 6. Testes da API Backend (http://localhost:4000)

```bash
# Teste de geração de conteúdo
curl -X POST http://localhost:4000/api/gemini/content \
  -H "Content-Type: application/json" \
  -d '{"topic":"Zumbi dos Palmares"}'

# Teste de geração de imagem
curl -X POST http://localhost:4000/api/gemini/image \
  -H "Content-Type: application/json" \
  -d '{"topic":"Capoeira"}'

# Listar todos os tópicos
curl http://localhost:4000/api/topics
```

---

## 7. Testes E2E Automatizados

```bash
# Executar teste E2E existente
node tests/e2e_test.js
```

---

## 8. Checklist de Responsividade

- [ ] Desktop (1920x1080)
- [ ] Tablet (768px)
- [ ] Mobile (375px)
- [ ] Paisagem mobile
