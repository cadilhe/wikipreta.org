# Treinamento de IA com Fontes Próprias (WikiPreta)

Este documento detalha as estratégias para integrar fontes de dados exclusivas (livros, dicionários e áudios) ao motor de inteligência artificial da WikiPreta, permitindo que a geração de conteúdo seja fiel e embasada em referências específicas.

## 1. Conceitos Fundamentais

### RAG (Retrieval-Augmented Generation) - **A Abordagem Ideal**
Em vez de treinar o modelo do zero, o RAG permite que a IA "consulte" uma biblioteca em tempo real.
- **Fluxo:** Pergunta do Usuário -> Busca na Base de Dados de Vetores -> Trechos Relevantes Encontrados -> Prompt enviado para IA (Contexto + Pergunta).
- **Por que usar:** 
    - Permite citar fontes (Ex: "De acordo com o livro X, pág 10...").
    - Fácil de atualizar (basta subir um arquivo novo).
    - Custo muito menor que o treinamento (Fine-tuning).

### Fine-Tuning (Ajuste Fino)
Consiste em treinar uma camada adicional no modelo de IA com seus dados.
- **Quando usar:** Para mudar o *tom* de voz da IA ou ensinar jargões muito específicos que não existem em lugar nenhum.
- **Desvantagem:** É um processo estático. Para cada livro novo, seria necessário um novo treinamento.

---

## 2. Processamento de Fontes

### Livros e Dicionários (Texto)
1. **Extração:** Converter PDFs ou imagens em texto digital (OCR).
2. **Chunking:** Dividir o texto em parágrafos ou blocos de ~1000 caracteres.
3. **Embeddings:** Converter esses blocos em vetores numéricos (usando modelos como `text-embedding-004` do Google).
4. **Armazenamento:** Salvar no **Supabase Vector (pgvector)**.

### Áudios (Entrevistas/Palestras)
1. **Transcrição:** Usar modelos como o **OpenAI Whisper** para converter áudio em texto.
2. **Processamento:** O texto gerado segue o mesmo fluxo dos livros (Chunking -> Embeddings -> Banco de Dados).

---

## 3. Implementação Técnica na WikiPreta

Atualmente, o projeto já utiliza **Supabase** e **DeepSeek/Gemini**. O próximo passo técnico seria:

1. **Habilitar o pgvector** no Supabase.
2. **Criar uma Tabela de Conhecimento:**
   ```sql
   CREATE TABLE knowledge_base (
     id uuid PRIMARY KEY,
     content text, -- O trecho do livro/áudio
     metadata jsonb, -- Fonte, página, autor, data
     embedding vector(768) -- A "assinatura" digital para busca
   );
   ```
3. **Atualizar a API de Geração (`api/index.js`):**
   - Antes de enviar o prompt para o DeepSeek, realizar uma busca por "similaridade" no banco.
   - Incluir os resultados no prompt como "Contexto de Referência".

## 4. Próximos Passos Sugeridos

1. **Curadoria de Fontes:** Listar os primeiros 5 livros/dicionários essenciais.
2. **Script de Ingestão:** Criar uma ferramenta simples para subir esses textos para o banco de dados.
3. **Interface de "Citação":** Ajustar o frontend para exibir de onde a IA tirou aquela informação específica.

---
*Documento gerado para apoio à evolução da WikiPreta.org*
