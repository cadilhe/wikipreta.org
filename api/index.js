import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';
import { slugify, generateImageFilename, isBanned } from './utils.js';

// Load environment from project-level .env.local in dev
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
} else {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

console.log('Debug - DeepSeek Key exists:', !!DEEPSEEK_API_KEY);
if (DEEPSEEK_API_KEY) {
  console.log('Debug - DeepSeek Key starts with:', DEEPSEEK_API_KEY.substring(0, 4));
}
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const PREFER_OLLAMA = process.env.PREFER_OLLAMA === 'true';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Remove uploads directory check as we'll use Supabase Storage
// if (!fs.existsSync(UPLOADS_DIR)) {
//   fs.mkdirSync(UPLOADS_DIR, { recursive: true });
// }

const useMock = !API_KEY || API_KEY === 'PLACEHOLDER_API_KEY';
if (!API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is not set. The server will run in mock mode.');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const ai = !useMock ? new GoogleGenerativeAI(API_KEY) : null;

// ============= Health Check =============
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasGemini: !!API_KEY,
    hasDeepSeek: !!DEEPSEEK_API_KEY
  });
});

// ============= Auth Endpoints =============

// Auth endpoints are now handled by Supabase on the frontend.
// We can remove these endpoints or keep them as proxies if needed.
// For simplicity, we'll let the frontend talk directly to Supabase Auth.

// ============= Helper Functions (Supabase) =============
async function getTopicBySlug(slug) {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching topic:', error);
  }
  return data;
}

async function createTopic(topicData) {
  const { slug, title, content, highlights, relatedTopics, imageUrl, source } = topicData;
  const { data, error } = await supabase
    .from('topics')
    .upsert([{
      slug,
      title,
      content,
      highlights: highlights || [],
      related_topics: relatedTopics || [],
      image_url: imageUrl,
      source
    }], { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTopic(slug, data) {
  const { content, highlights, relatedTopics, imageUrl, editor_email } = data;

  // Get current topic for revision
  const topic = await getTopicBySlug(slug);
  
  if (topic && content && content !== topic.content) {
    // Save revision
    await supabase.from('revisions').insert([{
      topic_id: topic.id,
      content: topic.content,
      editor_email: editor_email || 'unknown'
    }]);
  }

  const updateData = {};
  if (content !== undefined) updateData.content = content;
  if (highlights !== undefined) updateData.highlights = highlights;
  if (relatedTopics !== undefined) updateData.related_topics = relatedTopics;
  if (imageUrl !== undefined) updateData.image_url = imageUrl;
  updateData.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('topics')
    .update(updateData)
    .eq('slug', slug)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

async function generateWithDeepSeek(prompt) {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.includes('sua-chave')) {
    console.log('Skipping DeepSeek: API key missing or placeholder used.');
    return null;
  }
  
  try {
    console.log('Using DeepSeek for generation...');
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    });
    
    if (!response.ok) throw new Error(`DeepSeek error: ${response.statusText}`);
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek generation failed:', error);
    return null;
  }
}

async function generateWithOllama(prompt) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false
      })
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama generation failed:', error);
    return null;
  }
}

async function getContextFromKnowledge(topic) {
  const OLLAMA_LOCAL = 'http://127.0.0.1:11434';
  
  try {
    let embedding;
    // Tenta primeiro o endpoint universal (mais estável)
    const res1 = await fetch(`${OLLAMA_LOCAL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: topic })
    });
    
    if (res1.ok) {
      const data = await res1.json();
      embedding = data.embedding;
    } else {
      // Fallback para o endpoint novo
      const res2 = await fetch(`${OLLAMA_LOCAL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', input: topic })
      });
      if (!res2.ok) throw new Error("Falha ao gerar embedding");
      const data = await res2.json();
      embedding = data.embeddings[0];
    }

    // 2. Busca no Supabase via RPC 'match_knowledge'
    const { data: documents, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.35,
      match_count: 5,
    });

    if (error) {
      console.error("Erro na busca vetorial:", error.message);
      return "";
    }
    
    if (!documents || documents.length === 0) {
      console.log(`ℹ️ Nenhum fragmento de conhecimento encontrado para: "${topic}" (Threshold: 0.35)`);
      return "";
    }

    console.log(`✅ Encontrados ${documents.length} fragmentos de conhecimento para: "${topic}"`);

    return documents.map(d => `[Fonte: ${d.metadata?.source || 'Documento'}]\n${d.content}`).join('\n\n---\n\n');
  } catch (e) {
    console.error("Erro ao buscar contexto de conhecimento:", e);
    return "";
  }
}

// ============= Gemini API Proxies =============
app.post('/api/gemini/content', async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  if (isBanned(topic)) {
    return res.status(403).json({ error: 'Este termo não é permitido na Wikipreta.' });
  }

  // Check DB first
  const slug = slugify(topic);
  const existingTopic = await getTopicBySlug(slug);

  if (existingTopic && existingTopic.source === 'gemini') {
    return res.json({
      text: existingTopic.content,
      highlights: existingTopic.highlights || [],
      relatedTopics: existingTopic.related_topics || [],
      generatedAt: existingTopic.updated_at,
      source: 'db',
      cached: true,
    });
  }

  // 1. Busca contexto nos documentos próprios (RAG)
  const knowledgeContext = await getContextFromKnowledge(topic);

  if (!ai && !DEEPSEEK_API_KEY && !PREFER_OLLAMA) return res.status(500).json({ error: 'AI client not initialized' });

  // 2. Constrói o prompt priorizando as fontes oficiais
  const prompt = knowledgeContext 
    ? `Você é um historiador especialista da WikiPreta. Use as referências oficiais abaixo para compor sua resposta.
    
    FONTES OFICIAIS (CONTEXTO):
    ${knowledgeContext}
    
    TAREFA:
    Escreva um parágrafo enciclopédico e educativo sobre "${topic}" baseando-se prioritariamente nas fontes acima. 
    Se a informação não estiver nas fontes, use seu conhecimento base de forma complementar.
    Mantenha o tom respeitoso e focado na cultura negra.
    Destaque termos importantes com dois asteriscos (ex: **Zumbi dos Palmares**).`
    : `Forneça uma biografia ou descrição enciclopédica concisa, em um único parágrafo, sobre "${topic}" no contexto da história e cultura negra do Brasil, da África ou da diáspora. O texto deve ser informativo, direto e respeitoso. Destaque outras personalidades, lugares ou conceitos relevantes envolvendo-os com dois asteriscos (ex: **Zumbi dos Palmares** ou **Quilombo**). Não inclua o nome do tópico no início do parágrafo.`;

  try {
    let generatedText = null;
    let source = 'unknown';

    // 1. Try DeepSeek first (Primary)
    if (!generatedText) {
      generatedText = await generateWithDeepSeek(prompt);
      if (generatedText) {
        source = 'deepseek';
        console.log('Successfully generated with DeepSeek');
      }
    }

    // 2. Try Gemini as backup
    if (!generatedText && ai) {
      try {
        console.log('Using Gemini (1.5 Flash) as backup...');
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent(prompt);
        generatedText = response.response.text().trim();
        source = 'gemini';
        console.log('Successfully generated with Gemini');
      } catch (geminiError) {
        console.error('Gemini fallback failed:', geminiError.message);
      }
    }

    // 3. Fallback to Ollama if others failed
    if (!generatedText) {
      console.log('Using Ollama as final fallback...');
      generatedText = await generateWithOllama(prompt);
      if (generatedText) source = 'ollama';
    }

    if (!generatedText) {
      return res.status(500).json({ error: 'Failed to generate content from any provider' });
    }

    const highlightMatches = generatedText.match(/\*\*([^*]+)\*\*/g) || [];
    const highlights = highlightMatches.map(h => h.replace(/\*\*/g, ''));

    // Save to DB
    if (!existingTopic) {
      await createTopic({ slug, title: topic, content: generatedText, highlights, relatedTopics: highlights, source });
    } else {
      await updateTopic(slug, { content: generatedText, highlights, relatedTopics: highlights });
    }

    return res.json({
      text: generatedText,
      highlights,
      relatedTopics: highlights,
      generatedAt: new Date().toISOString(),
      source: source,
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
});

app.post('/api/gemini/image', async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  if (isBanned(topic)) {
    return res.status(403).json({ error: 'Este termo não é permitido na Wikipreta.' });
  }

  // Check DB first for cached image
  const slug = slugify(topic);
  const existingTopic = await getTopicBySlug(slug);

  if (existingTopic && existingTopic.image_url) {
    return res.json({
      imageUrl: existingTopic.image_url,
      generatedAt: existingTopic.updated_at,
      source: 'db',
      cached: true,
    });
  }

  if (useMock) {
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const dataUrl = `data:image/png;base64,${tinyPngBase64}`;
    return res.json({
      imageBase64: dataUrl,
      mime: 'image/png',
      generatedAt: new Date().toISOString(),
      source: 'mock',
    });
  }

  if (!ai) return res.status(500).json({ error: 'AI client not initialized' });

  // Only check authentication if we actually need to generate a new image
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
      return res.status(401).json({ error: 'Access denied: Authentication required to generate new images' });
  }

  const prompt = `Crie uma imagem artística e simbólica representando '${topic}'. Estilo: arte digital, minimalista, com cores quentes e terrosas que remetam à cultura africana e brasileira. Evite rostos ou figuras humanas diretas, foque em conceitos, padrões e símbolos.`;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      const buffer = Buffer.from(base64ImageBytes, 'base64');
      
      const slug = slugify(topic);
      const filename = `${slug}-${Date.now()}.png`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verbetes-images')
        .upload(filename, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError.message);
        throw uploadError;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verbetes-images')
        .getPublicUrl(filename);

      // Update DB
      if (existingTopic) {
        await updateTopic(slug, { imageUrl: publicUrl });
      }

      return res.json({
        imageUrl: publicUrl,
        mime: 'image/png',
        generatedAt: new Date().toISOString(),
        source: 'gemini',
      });
    }
    return res.status(500).json({ error: 'No image generated' });
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
});

// ============= CRUD Endpoints =============
app.get('/api/random-images', (req, res) => {
  const randomImagesDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'random');
  const staticFallback = [
    'hu-chen-60XLoOgwkfA-unsplash.jpg',
    'ian-kiragu-GSh_PwsZsPQ-unsplash.jpg',
    'ian-macharia-7k91OUDYAQ0-unsplash.jpg',
    'james-wiseman-IebZAH6kaNw-unsplash.jpg',
    'jeff-ackley-YwDo_HwORXs-unsplash.jpg',
    'ninno-jackjr-CG6Gd__QIOY-unsplash.jpg',
    'random1.png',
    'random2.png',
    'random3.png',
    'random4.png',
    'random5.png',
    'seth-doyle-zf9_yiAekJs-unsplash.jpg'
  ];

  try {
    if (!fs.existsSync(randomImagesDir)) {
      console.log('Using static fallback for random images (Serverless environment)');
      return res.json(staticFallback);
    }
    const files = fs.readdirSync(randomImagesDir)
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.json(files.length > 0 ? files : staticFallback);
  } catch (error) {
    console.error('Error listing random images:', error);
    res.json(staticFallback);
  }
});

app.get('/api/topics', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('topics')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: topics, count, error } = await query;

    if (error) throw error;

    return res.json({
      topics,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: count, 
        pages: Math.ceil(count / limit) 
      },
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.get('/api/topics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const topic = await getTopicBySlug(slug);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const { data: revisions, error: revError } = await supabase
      .from('revisions')
      .select('*')
      .eq('topic_id', topic.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (revError) throw revError;

    return res.json({
      ...topic,
      highlights: topic.highlights || [],
      relatedTopics: topic.related_topics || [],
      revisions,
    });
  } catch (error) {
    console.error('Error fetching topic:', error);
    return res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

app.post('/api/topics', async (req, res) => {
  try {
    const { title, content, highlights = [], relatedTopics = [], imageUrl = null, source = 'user' } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const slug = slugify(title);
    const existing = await getTopicBySlug(slug);
    if (existing) return res.status(409).json({ error: 'Topic already exists' });

    const created = await createTopic({ slug, title, content, highlights, relatedTopics, imageUrl, source });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating topic:', error);
    return res.status(500).json({ error: 'Failed to create topic' });
  }
});

app.put('/api/topics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const topic = await getTopicBySlug(slug);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const { content, highlights, relatedTopics, imageUrl, editor_email } = req.body;
    const updated = await updateTopic(slug, { content, highlights, relatedTopics, imageUrl, editor_email });

    return res.json({
      ...updated,
      highlights: updated.highlights || [],
      relatedTopics: updated.related_topics || [],
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    return res.status(500).json({ error: 'Failed to update topic' });
  }
});

app.delete('/api/topics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('slug', slug);

    if (error) throw error;

    return res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// ============= Server Start =============
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Wikipreta API server listening on http://localhost:${PORT}`);
    console.log(`🎭 Mock mode: ${useMock}`);
  });
}

export default app;
