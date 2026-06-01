# Skill: Geração de Verbetes por IA

> O módulo central do Wikipreta — busca ou gera conteúdo enciclopédico sob demanda.

---

## Fluxo Completo

```
1. Usuário digita "Carolina Maria de Jesus" e pressiona Enter
2. Frontend → SearchBar.onSearch("Carolina Maria de Jesus")
3. App.tsx → loadTopic("carolina-maria-de-jesus")
4. databaseService.getTopic(slug) → GET /api/topics/carolina-maria-de-jesus
5. Se encontrado no banco → exibe conteúdo (source: cached)
6. Se não encontrado (404):
   a. geminiService.generateContent("Carolina Maria de Jesus")
   b. POST /api/gemini/content → { topic }
   c. Backend: buildRagContext(topic) → busca pgvector
   d. Backend: generateText(topic, ragContext) → DeepSeek → Gemini → Ollama
   e. Backend: extractHighlights(text) → ['Quarto de Despejo', 'São Paulo', ...]
   f. Backend: INSERT no banco (cache)
   g. Retorna { text, highlights, relatedTopics, source }
7. Frontend: databaseService.saveTopic() → POST /api/topics (salva cópia local se necessário)
8. ContentDisplay renderiza o verbete com links interativos
```

---

## Interface de Retorno da API

```typescript
interface ContentResponse {
  text: string;               // conteúdo HTML/markdown
  highlights: string[];       // termos em negrito extraídos
  relatedTopics: string[];    // sugestões de tópicos relacionados
  source: 'deepseek' | 'gemini' | 'ollama' | 'cached';
  cached: boolean;
}
```

---

## Prompt Enviado ao Provider

```
Você é um historiador especialista em história e cultura negra africana e afro-brasileira.

Escreva um verbete enciclopédico sobre: {TOPIC}

[RAG_CONTEXT — trechos da base de conhecimento, se disponível]

Regras:
- Português PT-BR, linguagem acessível
- Use **negrito** em TODOS os termos importantes (nomes, lugares, movimentos)
- Entre 300-600 palavras
- Sem títulos markdown (##) — apenas parágrafos
- Fatos históricos verificados
- Contexto social e cultural
```

---

## Extração de Highlights (Regex)

```javascript
// Extrai termos entre ** **
const regex = /\*\*([^*]+)\*\*/g;
const highlights = [];
let match;
while ((match = regex.exec(text)) !== null) {
  highlights.push(match[1].trim());
}
// Remove duplicatas
return [...new Set(highlights)];
```

---

## Verificação de Cache

```javascript
// Antes de gerar, verificar se o slug já existe
const existing = await supabase
  .from('topics')
  .select('*')
  .eq('slug', slugify(topic))
  .single();

if (existing.data) {
  return { ...existing.data, cached: true };
}
```

---

## Arquivos Relevantes

| Arquivo | Responsabilidade |
|---|---|
| `api/index.js` | Endpoint POST /api/gemini/content |
| `services/geminiService.ts` | Proxy frontend → backend |
| `services/databaseService.ts` | getTopic, saveTopic |
| `components/ContentDisplay.tsx` | Renderização do verbete |
| `App.tsx` | Orquestração do fluxo |

---

## Adicionando Conteúdo à Base RAG

Para enriquecer o conhecimento do sistema:

```javascript
// api/scripts/ — script de ingestão
const content = "Texto histórico sobre história negra...";
const embedding = await ollamaEmbed(content);

await supabase.from('knowledge_base').insert({
  content,
  embedding,
  metadata: { source: 'livro', autor: 'Abdias do Nascimento', ano: 1980 }
});
```
