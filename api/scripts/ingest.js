import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { supabase } from '../supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Silencia avisos chatos do PDF.js
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('standardFontDataUrl')) return;
  originalWarn(...args);
};

async function extractTextFromPDF(dataBuffer) {
  process.stdout.write(" 🔍 Extraindo texto... ");
  const loadingTask = pdfjs.getDocument({
    data: dataBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  });
  
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + ' ';
  }
  
  return fullText;
}

async function getEmbedding(text) {
  // Usando IP direto para evitar problemas de DNS/IPv6 no Windows
  const ollamaUrl = 'http://127.0.0.1:11434';
  
  try {
    // Tentativa com o endpoint universal /api/embeddings (mais estável no Windows)
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'nomic-embed-text', 
        prompt: text 
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || response.statusText);
    }
    
    return data.embedding;
  } catch (err) {
    // Fallback para o novo endpoint se o antigo falhar
    const response = await fetch(`${ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'nomic-embed-text', 
        input: text 
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`Ollama erro final: ${data.error || 'Falha total'}`);
    return data.embeddings[0];
  }
}

async function checkOllama() {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags');
    const data = await res.json();
    console.log("🟢 Ollama detectado! Modelos disponíveis:", data.models.map(m => m.name).join(', '));
    return true;
  } catch (e) {
    console.error("🔴 Erro: Não foi possível conectar ao Ollama em http://127.0.0.1:11434");
    return false;
  }
}

async function ingest() {
  if (!await checkOllama()) return;

  const sourcesDir = path.join(process.cwd(), 'api/data/fontes');
  if (!fs.existsSync(sourcesDir)) return console.log("Pasta não encontrada.");

  const files = fs.readdirSync(sourcesDir).filter(f => f.endsWith('.pdf'));
  console.log(`🚀 Ingestão LOCAL (IP Direto) - ${files.length} arquivos...`);

  for (const file of files) {
    // Inteligência: Verifica se o arquivo já foi processado anteriormente
    const { data: existing } = await supabase
      .from('knowledge_base')
      .select('id')
      .filter('metadata->>source', 'eq', file)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`\n⏭️ Ignorando: ${file} (já processado)`);
      continue;
    }

    console.log(`\n📄 Lendo: ${file}`);
    try {
      const dataBuffer = new Uint8Array(fs.readFileSync(path.join(sourcesDir, file)));
      const cleanText = (await extractTextFromPDF(dataBuffer)).replace(/\s+/g, ' ').trim();
      
      const chunks = [];
      for (let i = 0; i < cleanText.length; i += 800) {
        chunks.push(cleanText.substring(i, i + 1000));
        if (i + 1000 >= cleanText.length) break;
      }

      console.log(`🧩 Fragmentado em ${chunks.length} partes.`);

      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await getEmbedding(chunks[i]);
          
          const { error } = await supabase.from('knowledge_base').insert({
            content: chunks[i],
            metadata: { source: file },
            embedding: embedding
          });

          if (error) throw error;
          process.stdout.write(`\r✅ ${i+1}/${chunks.length} processados...`);
        } catch (err) {
          console.error(`\n❌ Fragmento ${i+1}: ${err.message}`);
          break;
        }
      }
    } catch (err) {
      console.error(`❌ Fatal em ${file}: ${err.message}`);
    }
  }
  console.log("\n✨ Concluído!");
}

ingest();
