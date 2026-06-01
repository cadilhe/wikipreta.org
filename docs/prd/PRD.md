# PRD — Wikipreta.org

> **Versão:** 1.0 · **Data:** 21 maio 2026 · **Status:** Em produção

---

## 1. Visão do Produto

**Wikipreta.org** é uma enciclopédia colaborativa e interativa dedicada à preservação e difusão da **história e cultura negra** — do Brasil, da África e da diáspora africana.

### Proposta de Valor

> "Um Wikipedia da história negra — gerado por IA, curado por humanos, acessível a todos."

**3 diferenciais:**
1. **Geração sob demanda** — Qualquer tópico de história/cultura negra é gerado instantaneamente por IA e cacheado para consultas futuras.
2. **Interatividade orgânica** — Termos em negrito dentro dos verbetes viram links automáticos para outros tópicos, criando uma rede de conhecimento interconectada.
3. **Curadoria colaborativa** — Usuários autenticados podem editar, corrigir e enriquecer o conteúdo gerado pela IA.

---

## 2. Personas

### Persona 1 — Estudante / Pesquisador
- **Perfil:** 15-35 anos, escola/universidade, pesquisa história africana e afro-brasileira.
- **Dor:** Fontes dispersas, português difícil, pouco conteúdo acessível.
- **Ganho:** Verbete completo gerado em segundos, com links para tópicos relacionados.

### Persona 2 — Professor
- **Perfil:** Docente de história, estudos afro, sociologia.
- **Dor:** Falta de material didático em PT-BR sobre história negra.
- **Ganho:** Fonte de referência rápida para preparar aulas.

### Persona 3 — Curador / Editor (Admin)
- **Perfil:** Historiador, ativista, pesquisador.
- **Dor:** Conteúdo gerado por IA pode ter erros factuais.
- **Ganho:** Interface de edição para corrigir e enriquecer verbetes, com histórico de revisões.

---

## 3. Funcionalidades

### 3.1 Enciclopédia Interativa ✅
- Campo de busca com detecção de tópico
- Botão "Aleatório" para descoberta
- Verbete gerado sob demanda (IA) ou recuperado do cache (banco)
- Palavras em **negrito** viram links clicáveis para outros verbetes
- Navegação por histórico de leitura (localStorage)
- Compartilhamento nativo (Web Share API)

### 3.2 Geração por IA (Multi-Provider) ✅
- **Texto:** DeepSeek (primário) → Gemini 1.5 Flash → Ollama (fallback)
- **Imagem:** Gemini Imagen 3.0
- RAG com base de conhecimento própria (pgvector + Ollama embeddings)
- Cache automático no Supabase após primeira geração

### 3.3 Edição Colaborativa ✅
- Modo de edição inline (requer autenticação)
- Toolbar de formatação (negrito)
- Campo para URL de imagem ou upload
- Cada edição cria uma revisão auditável

### 3.4 Painel Administrativo ✅
- Lista paginada de todos os verbetes (20/página)
- Busca com debounce
- Editar / Excluir tópicos
- Gerenciar imagens
- Gerenciar usuários

### 3.5 Temas ✅
- Dark / Light mode
- Toggle via `ThemeSwitcher`
- Persistência via CSS class no `<html>`

### 3.6 Moderação e Termos Banidos ✅
- **Moderação Dinâmica via Supabase**: Lista de termos proibidos sincronizada com a tabela `banned_terms`.
- **Validação Inteligente (Substring)**: Bloqueia termos exatos e frases completas que contenham os termos banidos (ex: bloqueia "nega de cabelo ruim" se o termo "cabelo ruim" estiver banido).
- **Cache em Memória**: Cache de 60 segundos (TTL) no Express para evitar excesso de requisições ao banco.
- **UX de Bloqueio**: Mensagem padronizada de erro *"Este termo não existe na Wikipreta."* com ocultação do botão de "Tentar Novamente".
- **Painel Administrativo Restrito (Apenas Admin)**:
  - Criação e exclusão individual de termos banidos.
  - Importação em massa (bulk import) a partir de arquivos `.txt` (uma palavra/frase por linha).
  - Seleção e exclusão em massa (bulk delete) na tabela do painel com modal de confirmação.
  - Acesso e abas da barra lateral ocultos e restritos exclusivamente à role `admin` (editores são impedidos e redirecionados).

---

## 4. Tópicos Pré-definidos (Seed)

35 tópicos curados que carregam aleatoriamente na home:

| Categoria | Exemplos |
|---|---|
| Figuras históricas BR | Zumbi dos Palmares, Machado de Assis, Carolina Maria de Jesus, Luiz Gama |
| Figuras históricas globais | Nelson Mandela, Martin Luther King Jr., Angela Davis, Malcolm X |
| Cultura | Capoeira, Samba, Candomblé, Congada |
| Intelectuais | Lélia Gonzalez, Abdias do Nascimento, Milton Santos |
| Resistência | Quilombo, Revolta dos Malês, Festa da Boa Morte |
| Arte | Aleijadinho, Pixinguinha, Lima Barreto |

---

## 5. Lógica de Slug

Slugs são a chave de busca de verbetes — insensíveis a acentos e artigos.

```
"Machado de Assis" → "machado-assis"
"Revolta dos Malês" → "revolta-males"
"A Luta dos Quilombos" → "luta-quilombos"  (artigo "a" removido)
```

**Algoritmo:**
1. Lowercase
2. NFD normalization (remove acentos)
3. Remover artigos: `a, e, da, de, do, na, no, as, os, das, dos, nas, nos`
4. Remover caracteres especiais
5. Join com `-`

---

## 6. Roadmap

### ✅ Concluído
- Enciclopédia interativa com geração por IA
- Multi-provider (DeepSeek → Gemini → Ollama)
- RAG com base de conhecimento
- Sistema de revisões
- Painel administrativo
- Geração de imagens (Gemini Imagen)
- Dark/Light theme
- Rate limiting + banned terms

### ⏳ Próximas Versões
| Feature | Prioridade | Versão |
|---|---|---|
| Busca full-text no conteúdo | Alta | v1.1 |
| Exportar verbete como PDF | Média | v1.1 |
| Categorias/tags para tópicos | Média | v1.2 |
| Modo offline (PWA) | Baixa | v1.2 |
| API pública de verbetes | Média | v2.0 |
| Multilíngue (EN, FR) | Baixa | v2.0 |
| Embeddings de verbetes (busca semântica) | Alta | v1.1 |
| Citações e fontes externas | Alta | v1.1 |

---

## 7. Restrições Técnicas

- **Frontend SPA** — Sem SSR; SEO limitado sem renderização server-side.
- **Backend separado** — Express em porta diferente; requer CORS configurado.
- **Chaves de IA no backend** — `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` nunca no frontend.
- **`VITE_` prefix** — Qualquer var com esse prefixo é exposta ao browser; usar apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **Supabase Auth** — JWT gerenciado pelo frontend; backend valida tokens via service_role.
