# 🧠 Manual do Sistema RAG - WikiPreta

Este documento explica como gerenciar e atualizar o conhecimento da IA do WikiPreta utilizando a técnica de **RAG (Retrieval-Augmented Generation)**.

## 📋 Pré-requisitos
1.  **Ollama instalado** no Windows ([ollama.com](https://ollama.com)).
2.  **Modelo de Vetores:** Ter executado `ollama pull nomic-embed-text`.
3.  **Supabase:** Acesso ao banco de dados com a tabela `knowledge_base` configurada.

## 🚀 Como Adicionar Novo Conhecimento (Passo a Passo)

### Passo 1: Preparar os Arquivos
Coloque todos os arquivos PDF que você deseja que a IA conheça na pasta:
`api/data/fontes/`

### Passo 2: Iniciar o Processamento
Certifique-se de que o Ollama está aberto e execute o comando no terminal:
```bash
node api/scripts/ingest.js
```
O script fará o seguinte:
- Ler os PDFs.
- Fragmentar o texto em partes menores (chunks).
- Gerar vetores usando o Ollama local.
- Salvar tudo no Supabase.

### Passo 3: Limpeza (Opcional)
Após o processamento, você pode mover os arquivos para uma pasta de backup. O script agora é inteligente e ignora arquivos que já estão no banco de dados, então não há risco de duplicar se você esquecer um arquivo lá.

### Passo 4: Usar no WikiPreta
Inicie o sistema normalmente:
```bash
pnpm dev
```
Agora, quando você perguntar algo sobre os temas dos livros processados, a IA fará uma busca semântica no Supabase, encontrará os fragmentos relevantes e responderá com base neles.

---

## 🛠️ Solução de Problemas Comuns

### Erro: "Model not found"
**Solução:** Rode `ollama pull nomic-embed-text`.

### IA não responde com base nos livros
**Causa:** O "limite de similaridade" pode estar muito alto.
**Solução:** No arquivo `api/index.js`, na função `getContextFromKnowledge`, você pode baixar o valor de `match_threshold` (ex: de 0.5 para 0.4 ou 0.3).

---
*Manual gerado em: 07/05/2026*
