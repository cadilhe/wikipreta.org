fayou# Planejamento: Post Diário Automático no Instagram via Supabase e n8n

Sim, é totalmente possível e é uma das melhores automações para manter suas redes sociais ativas sem esforço manual. Em vez de publicar imediatamente quando um verbete é criado (o que poderia poluir o feed se você criar vários no mesmo dia), o ideal é agendar um **Post Diário**.

Abaixo está o fluxo detalhado de como estruturar essa automação no **n8n**.

---

## Desenho do Fluxo no n8n

O fluxo diário segue esta sequência lógica:

```
[Cron/Schedule] ──> [Buscar Verbete do DB] ──> [Formatar para Insta] ──> [Postar no Instagram] ──> [Marcar como Postado]
```

### 1. Gatilho Agendador (Schedule Trigger)
* Um nó **Schedule** no n8n configurado para rodar uma vez por dia no horário de sua preferência (ex: todos os dias às 09:00).

### 2. Buscar um Verbete Não Postado (Supabase Node)
Para que o sistema saiba qual postar e não repita conteúdo:
* **Preparação no Banco**: Adicione duas colunas na tabela `topics` do Supabase:
  * `posted_to_instagram` (boolean, default: `false`)
  * `instagram_posted_at` (timestamp, opcional)
* **Busca no n8n**: O nó do Supabase executa uma consulta selecionando o verbete mais antigo que ainda não foi postado:
  ```sql
  SELECT * FROM topics 
  WHERE posted_to_instagram = false 
  ORDER BY created_at ASC 
  LIMIT 1;
  ```

### 3. Formatar Legenda (Code Node ou OpenAI/Gemini Node)
O conteúdo de uma enciclopédia pode ser muito longo para uma legenda do Instagram. Você tem duas opções no n8n:
* **Opção Simples (Fórmula)**: Usar o resumo do texto (`content.substring(0, 300)`) concatenado com as hashtags padrão.
* **Opção Inteligente (IA no n8n)**: Passar o verbete por um nó do **Gemini / OpenAI** no n8n com o prompt:
  > *"Resuma este verbete sobre cultura negra em um parágrafo cativante para o Instagram. Use emojis e adicione que o link completo está na bio ou no site wikipreta.org/verbete/{slug}."*
* **Footer Padrão (Requisito 14)**: Adicione o footer fixo:
  ```text
  ...
  
  🏿✨ Conheça a história completa em wikipreta.org/verbete/{{ slug }} (Link na bio!)
  
  #Wikipreta #CulturaNegra #HistoriaNegra #HistoriaDoBrasil #VidasNegrasImportam
  ```

### 4. Publicar no Instagram (Instagram Business Node)
* **Pré-requisitos da Meta**:
  1. A conta do Instagram deve ser comercial (**Professional/Business**).
  2. Ela deve estar vinculada a uma **Página do Facebook** da qual você seja administrador.
  3. No n8n, você usa a credencial **Instagram OAuth2 API** conectada à sua conta da Meta.
* **Publicação**: O nó do Instagram do n8n requer uma **Media URL** (a URL pública da imagem do verbete hospedada no Supabase Storage) e a **Caption** (legenda formatada).

### 5. Atualizar o Supabase (Supabase Node)
* Após o sucesso da publicação, o n8n faz um update na linha do verbete no Supabase, alterando `posted_to_instagram` para `true` e salvando a data atual em `instagram_posted_at`. Isso garante que no dia seguinte o sistema pegará o próximo da fila.

---

## Preparando o Supabase para a Automação (SQL)

Você pode rodar este comando no editor SQL do Supabase para criar os campos necessários para rastreamento:

```sql
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS posted_to_instagram boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_posted_at timestamp with time zone;
```
