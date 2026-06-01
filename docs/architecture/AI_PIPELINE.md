# AI Pipeline — Wikipreta.org

> Como o conteúdo é gerado: RAG + multi-provider fallback + cache automático.

---

## Visão Geral

```
Usuário busca "Zumbi dos Palmares"
        │
        ▼
[1. Cache Check]
  └── slug existe no banco? → retorna imediatamente (source: cached)
        │ não existe
        ▼
[2. Busca RAG]
  └── Ollama gera embedding da query
  └── pgvector busca top-5 trechos relevantes da knowledge_base
        │
        ▼
[3. Geração de Texto]
  ├── Tenta DeepSeek API (primário)
  ├── Falha → Tenta Gemini 1.5 Flash
  └── Falha → Tenta Ollama local (se PREFER_OLLAMA=true)
        │
        ▼
[4. Extração de Highlights]
  └── Regex /\*\*([^*]+)\*\*/g → array de termos em negrito
        │
        ▼
[5. Cache no Banco]
  └── INSERT em topics (slug, title, content, highlights, source)
        │
        ▼
[6. Retorno]
  └── { text, highlights[], relatedTopics[], source, cached: false }
```

---

## Providers de Texto

| Ordem | Provider | Env Var | Notas |
|---|---|---|---|
| 1 (primário) | DeepSeek | `DEEPSEEK_API_KEY` | API compatível com OpenAI |
| 2 (fallback) | Gemini 1.5 Flash | `GEMINI_API_KEY` | @google/generative-ai |
| 3 (opcional) | Ollama | `OLLAMA_BASE_URL` | Ativado com `PREFER_OLLAMA=true` |

```javascript
// api/index.js — lógica de fallback
async function generateText(topic, ragContext) {
  const providers = buildProviderList(); // ordem baseada em PREFER_OLLAMA

  for (const provider of providers) {
    try {
      const result = await provider.generate(topic, ragContext);
      return { ...result, source: provider.name };
    } catch (error) {
      console.warn(`[AI] ${provider.name} falhou:`, error.message);
      continue;
    }
  }
  throw new Error('Todos os providers de IA indisponíveis');
}
```

---

## System Prompt de Geração de Verbete

```
Você é um historiador especialista em história e cultura negra africana e afro-brasileira.

Escreva um verbete enciclopédico sobre: {TOPIC}

Contexto adicional (base de conhecimento):
{RAG_CONTEXT}

Regras obrigatórias:
1. Escreva em português (PT-BR), linguagem acessível e respeitosa
2. Use **negrito** em todos os termos importantes (pessoas, lugares, movimentos, datas)
   → Esses termos se tornarão links para outros verbetes
3. Entre 300 e 600 palavras
4. Estruture com parágrafos claros
5. Foque em fatos históricos verificados
6. Inclua contexto social e cultural
7. NUNCA use markdown de títulos (##) — apenas parágrafos e **negrito**
```

---

## RAG — Retrieval-Augmented Generation

```javascript
// api/index.js
async function buildRagContext(topic) {
  try {
    // 1. Gerar embedding da query
    const embedding = await ollamaEmbed(topic); // modelo: nomic-embed-text

    // 2. Buscar trechos relevantes
    const { data } = await supabase.rpc('search_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
    });

    if (!data?.length) return '';

    // 3. Concatenar contexto
    return data.map(d => d.content).join('\n\n');
  } catch {
    return ''; // RAG falhou — continua sem contexto
  }
}
```

> Se Ollama não estiver disponível, o sistema gera o verbete **sem RAG** — funciona normalmente, apenas com qualidade ligeiramente menor.

---

## Extração de Highlights

```javascript
// Após geração do texto
function extractHighlights(text) {
  const matches = text.match(/\*\*([^*]+)\*\*/g) ?? [];
  return matches.map(m => m.replace(/\*\*/g, '').trim());
}

// Exemplo:
// "...líder do **Quilombo dos Palmares** e símbolo de **resistência**..."
// → highlights: ['Quilombo dos Palmares', 'resistência']
```

---

## Provider de Imagem

| Provider | Env Var | Modelo |
|---|---|---|
| Gemini Imagen | `GEMINI_API_KEY` | imagen-3.0-generate-011 |

```javascript
async function generateImage(topic) {
  const prompt = `Ilustração artística histórica sobre: ${topic}.
    Estilo: arte afro-brasileira, cores vibrantes, sem texto na imagem.`;

  const response = await genai.models.generateImages({
    model: 'imagen-3.0-generate-011',
    prompt,
    config: { numberOfImages: 1 }
  });

  const imageData = response.generatedImages[0].image.imageBytes;

  // Upload para Supabase Storage
  const filename = `${slugify(topic)}-${Date.now()}.jpg`;
  const { data } = await supabase.storage
    .from('verbetes-images')
    .upload(filename, Buffer.from(imageData, 'base64'), {
      contentType: 'image/jpeg',
      upsert: true
    });

  return supabase.storage.from('verbetes-images').getPublicUrl(filename).data.publicUrl;
}
```

---

## Fallback de Imagem

Se a geração de imagem falhar (quota, timeout):
1. Seleciona aleatoriamente da lista de imagens locais em `public/assets/images/random/`
2. Lista obtida via `GET /api/random-images`

---

## Cache de Conteúdo

Após geração bem-sucedida, o verbete é salvo no banco:

```javascript
await supabase.from('topics').insert({
  slug: slugify(topic),
  title: topic,
  content: generatedText,
  highlights: extractHighlights(generatedText),
  related_topics: extractRelatedTopics(generatedText),
  source: providerUsed,       // 'deepseek' | 'gemini' | 'ollama'
  image_url: imageUrl ?? null,
});
```

Requisições subsequentes para o mesmo slug retornam do banco instantaneamente (`cached: true`).
