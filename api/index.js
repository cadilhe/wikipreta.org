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

// ============= Banned Terms Cache & Helper =============
let cachedBannedTerms = new Set();
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

async function getBannedTerms() {
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_TTL || cachedBannedTerms.size === 0) {
    try {
      const { data, error } = await supabase
        .from('banned_terms')
        .select('term');
      if (!error && data) {
        cachedBannedTerms = new Set(data.map(d => d.term.toLowerCase().trim()));
        lastCacheUpdate = now;
        console.log(`Loaded ${cachedBannedTerms.size} banned terms from database.`);
      } else if (error) {
        console.error('Failed to load banned terms from Supabase:', error.message);
      }
    } catch (err) {
      console.error('Failed to load banned terms:', err);
    }
  }
  return cachedBannedTerms;
}

async function isBannedDb(topic) {
  if (!topic) return false;
  
  const normalized = topic.toLowerCase().trim();

  // 1. Check local static list (fast check)
  if (isBanned(normalized)) return true;

  // 2. Check dynamic list from DB (cached)
  try {
    const dbTerms = await getBannedTerms();
    for (const term of dbTerms) {
      if (term.endsWith(' ')) {
        const trimmed = term.trim();
        if (normalized === trimmed || normalized.startsWith(term) || normalized.includes(` ${term}`)) {
          return true;
        }
      } else if (normalized.includes(term)) {
        return true;
      }
    }
  } catch (err) {
    console.error('Error in isBannedDb:', err);
  }
  
  return false;
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
  const { slug, title, content, highlights, relatedTopics, imageUrl, source, author_id } = topicData;
  const { data, error } = await supabase
    .from('topics')
    .upsert([{
      slug,
      title,
      content,
      highlights: highlights || [],
      related_topics: relatedTopics || [],
      image_url: imageUrl,
      source,
      author_id
    }], { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTopic(slug, data) {
  const { title, content, highlights, relatedTopics, imageUrl, editor_email } = data;

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
  if (title !== undefined) {
    updateData.title = title;
    updateData.slug = slugify(title);
  }
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

function getLevenshteinDistance(s, t) {
  if (!s || !t) return 99;
  const d = [];
  const n = s.length;
  const m = t.length;
  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= n; i++) d[i] = [i];
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[n][m];
}

async function validateTopicWithAI(topic) {
  const prompt = `Analise o termo "${topic}". Identifique se é um termo válido (um personagem histórico, local, evento ou conceito real e relevante no contexto da história/cultura negra da África, Brasil ou diáspora) ou se é um erro ortográfico ou spam/caracteres aleatórios.
  Responda APENAS com um objeto JSON no formato:
  {
    "isValid": true,
    "isTypo": false,
    "correctedTerm": "",
    "reason": "breve justificativa"
  }
  Mande apenas o JSON cru, sem tags de bloco de código markdown ou texto explicativo extra.`;

  let responseText = null;

  // 1. Try DeepSeek first
  responseText = await generateWithDeepSeek(prompt);

  // 2. Try Gemini backup
  if (!responseText && ai) {
    try {
      console.log('Using Gemini for term validation...');
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(prompt);
      responseText = response.response.text().trim();
    } catch (err) {
      console.error('Gemini validation fallback failed:', err.message);
    }
  }

  // 3. Try Ollama backup
  if (!responseText) {
    console.log('Using Ollama for term validation...');
    responseText = await generateWithOllama(prompt);
  }

  if (!responseText) {
    console.log('No AI provider available for validation, defaulting to valid');
    return { isValid: true };
  }

  try {
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(json)?/i, '');
      cleanText = cleanText.replace(/```$/, '');
      cleanText = cleanText.trim();
    }
    const result = JSON.parse(cleanText);
    return {
      isValid: result.isValid !== undefined ? !!result.isValid : true,
      isTypo: !!result.isTypo,
      correctedTerm: result.correctedTerm || '',
      reason: result.reason || ''
    };
  } catch (e) {
    console.error('Failed to parse AI validation response:', responseText, e);
    return { isValid: true }; // Default to true if parsing fails
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

// Note: The first duplicate definition of POST /api/gemini/content was removed to fix rate-limiting vulnerability.


// ============= Security Middlewares (Zero-Trust) =============

// Simple in-memory rate limiter to prevent API abuse/DoS (Law 3)
const rateLimitCache = new Map();
const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 30; // Max 30 requests per minute

  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const record = rateLimitCache.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  record.count += 1;
  if (record.count > maxRequests) {
    // 🔒 SEGURANÇA [VULN-DoS]: Evita abuso de chamadas de custo de IA / DoS
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  next();
};

app.use(rateLimiter);

// Middleware to enforce authentication using Supabase JWT tokens (Law 5, Law 6)
const requireSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 🔒 SEGURANÇA [VULN-BAC]: Nega acesso a operações privilegiadas sem token
      return res.status(401).json({ error: 'Access denied: No token provided' });
    }

    // Call Supabase auth API to verify the token securely (verify token in backend)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // 🔒 SEGURANÇA [VULN-BAC]: Nega acesso caso o token seja inválido ou expirado
      return res.status(403).json({ error: 'Access denied: Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

// Input validation middleware to prevent payload size overflow and XSS (Law 2, Law 3)
const validateTopicPayload = (req, res, next) => {
  const { title, content } = req.body || {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid or missing title' });
    }
    if (title.length > 100) {
      return res.status(400).json({ error: 'Title is too long (maximum 100 characters)' });
    }
  }

  if (content !== undefined) {
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid content format' });
    }
    if (content.length > 10000) {
      // 🔒 SEGURANÇA [VULN-DoS]: Rejeita payloads massivos que possam estourar buffers ou bancos de dados
      return res.status(400).json({ error: 'Content is too long (maximum 10000 characters)' });
    }
  }

  next();
};

// ============= Gemini API Proxies =============
app.post('/api/gemini/content', async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  if (await isBannedDb(topic)) {
    return res.status(403).json({ error: 'Este termo não existe na Wikipreta.' });
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

  // --- FLUXO HÍBRIDO DE PREVENÇÃO DE ERROS E ALUCINAÇÕES ---
  // 1. Busca local por aproximação no banco de dados (Levenshtein)
  try {
    const { data: allTopics } = await supabase
      .from('topics')
      .select('slug, title');

    if (allTopics && allTopics.length > 0) {
      const normalizedInput = slug.trim().toLowerCase();
      let bestMatch = null;
      let minDistance = 99;

      for (const t of allTopics) {
        if (!t.slug || !t.title) continue;
        const existingSlug = t.slug.trim().toLowerCase();
        const dist = getLevenshteinDistance(normalizedInput, existingSlug);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = t;
        }
      }

      // Limite: 1 para palavras de até 5 caracteres, 2 para palavras maiores
      const threshold = normalizedInput.length <= 5 ? 1 : 2;
      if (minDistance > 0 && minDistance <= threshold && bestMatch) {
        console.log(`🔍 Typo detected locally: "${topic}" -> "${bestMatch.title}" (distance: ${minDistance})`);
        return res.status(400).json({
          error: 'typo',
          suggestedTopic: bestMatch.title,
          suggestedSlug: bestMatch.slug
        });
      }
    }
  } catch (err) {
    console.error('Error in local similarity check:', err);
  }

  // 2. Validação ativa via IA (para novos termos)
  console.log(`Checking if "${topic}" is a valid, real term...`);
  const validation = await validateTopicWithAI(topic);

  // If AI claims it is a typo, but the corrected slug matches the query slug, it is actually valid
  if (validation.isTypo && validation.correctedTerm && slugify(validation.correctedTerm) === slug) {
    validation.isValid = true;
    validation.isTypo = false;
  }

  if (!validation.isValid) {
    if (validation.isTypo && validation.correctedTerm) {
      const correctedSlug = slugify(validation.correctedTerm);
      console.log(`🔍 Typo detected by AI: "${topic}" -> "${validation.correctedTerm}"`);
      return res.status(400).json({
        error: 'typo',
        suggestedTopic: validation.correctedTerm,
        suggestedSlug: correctedSlug
      });
    } else {
      console.log(`🚫 Query rejected by AI: "${topic}" (Reason: ${validation.reason})`);
      return res.status(422).json({
        error: `O termo "${topic}" não foi reconhecido como um conceito ou figura real no escopo da Wikipreta. Por favor, verifique a grafia ou tente outro termo.`
      });
    }
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

// requireSupabaseAuth applied to image generation as it is resource/cost intensive
app.post('/api/gemini/image', requireSupabaseAuth, async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  if (await isBannedDb(topic)) {
    return res.status(403).json({ error: 'Este termo não existe na Wikipreta.' });
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
    let { page = 1, limit = 10, search = '', sortBy = 'updated_at', order = 'desc', dateFilter = 'all' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // 🔒 SEGURANÇA [VULN-DoS]: Capa o limite de paginação para evitar dumping total de dados (Law 3)
    limit = Math.min(limit, 100);
    const offset = (page - 1) * limit;

    // Validate parameters to prevent injection or invalid queries
    if (!['title', 'updated_at', 'views'].includes(sortBy)) {
      sortBy = 'updated_at';
    }
    if (!['asc', 'desc'].includes(order)) {
      order = 'desc';
    }

    let query = supabase
      .from('topics')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === '7d') {
        now.setDate(now.getDate() - 7);
        query = query.gte('updated_at', now.toISOString());
      } else if (dateFilter === '30d') {
        now.setDate(now.getDate() - 30);
        query = query.gte('updated_at', now.toISOString());
      } else if (dateFilter === '90d') {
        now.setDate(now.getDate() - 90);
        query = query.gte('updated_at', now.toISOString());
      }
    }

    query = query
      .order(sortBy, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: topics, count, error } = await query;

    if (error) throw error;

    return res.json({
      topics,
      pagination: {
        page,
        limit,
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

    // Safely and asynchronously increment views in the background
    // tolerating database states where column 'views' does not exist yet.
    const currentViews = topic.views || 0;
    supabase
      .from('topics')
      .update({ views: currentViews + 1 })
      .eq('id', topic.id)
      .then(({ error }) => {
        if (error) {
          console.warn('Could not increment views (table might need ALTER TABLE command):', error.message);
        }
      });

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

app.post('/api/topics', requireSupabaseAuth, validateTopicPayload, async (req, res) => {
  try {
    const { title, content, highlights = [], relatedTopics = [], imageUrl = null, source = 'user' } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    if (await isBannedDb(title)) {
      return res.status(403).json({ error: 'Este termo não existe na Wikipreta.' });
    }

    const slug = slugify(title);
    const existing = await getTopicBySlug(slug);
    if (existing) return res.status(409).json({ error: 'Topic already exists' });

    const author_id = req.user?.id || null;
    const created = await createTopic({ slug, title, content, highlights, relatedTopics, imageUrl, source, author_id });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating topic:', error);
    return res.status(500).json({ error: error.message || 'Failed to create topic' });
  }
});

app.put('/api/topics/:slug', requireSupabaseAuth, validateTopicPayload, async (req, res) => {
  try {
    const { slug } = req.params;
    const topic = await getTopicBySlug(slug);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const { title, content, highlights, relatedTopics, imageUrl, editor_email } = req.body;

    if (title && title !== topic.title) {
      if (await isBannedDb(title)) {
        return res.status(403).json({ error: 'Este termo não existe na Wikipreta.' });
      }

      const newSlug = slugify(title);
      if (newSlug !== slug) {
        const existing = await getTopicBySlug(newSlug);
        if (existing) {
          return res.status(409).json({ error: 'Já existe outro verbete com este título.' });
        }
      }
    }

    const updated = await updateTopic(slug, { title, content, highlights, relatedTopics, imageUrl, editor_email });

    return res.json({
      ...updated,
      highlights: updated.highlights || [],
      relatedTopics: updated.related_topics || [],
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    return res.status(500).json({ error: error.message || 'Failed to update topic' });
  }
});

app.delete('/api/topics/:slug', requireSupabaseAuth, async (req, res) => {
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
    return res.status(500).json({ error: error.message || 'Failed to delete topic' });
  }
});

// Middleware to enforce administrator privileges
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.user_metadata?.role === 'admin') {
    next();
  } else {
    // 🔒 SEGURANÇA [VULN-BAC]: Nega acesso caso o usuário autenticado não seja administrador
    return res.status(403).json({ error: 'Access denied: Requires admin role' });
  }
};

// Middleware to enforce administrator or editor privileges
const requireAdminOrEditor = (req, res, next) => {
  const role = req.user?.user_metadata?.role || 'editor';
  if (req.user && (role === 'admin' || role === 'editor')) {
    next();
  } else {
    // 🔒 SEGURANÇA [VULN-BAC]: Nega acesso caso o usuário autenticado não seja administrador ou editor
    return res.status(403).json({ error: 'Access denied: Requires admin or editor role' });
  }
};

// ============= Admin Endpoints =============
// --- Banned Terms Admin Routes ---
app.get('/api/admin/banned-terms', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('banned_terms')
      .select('*')
      .order('term', { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching banned terms:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch banned terms' });
  }
});

app.post('/api/admin/banned-terms', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { term } = req.body;
    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return res.status(400).json({ error: 'Term is required' });
    }

    const normalizedTerm = term.trim().toLowerCase();

    const { data, error } = await supabase
      .from('banned_terms')
      .insert([{ term: normalizedTerm }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Term already banned' });
      }
      throw error;
    }

    // Update cache
    cachedBannedTerms.add(normalizedTerm);

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error adding banned term:', error);
    return res.status(500).json({ error: error.message || 'Failed to add banned term' });
  }
});

app.delete('/api/admin/banned-terms/:id', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the term first so we can remove it from cache
    const { data: termData, error: fetchError } = await supabase
      .from('banned_terms')
      .select('term')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    const { error } = await supabase
      .from('banned_terms')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (termData) {
      cachedBannedTerms.delete(termData.term);
    }

    return res.json({ message: 'Term unbanned successfully' });
  } catch (error) {
    console.error('Error deleting banned term:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete banned term' });
  }
});

app.post('/api/admin/banned-terms/delete-bulk', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of ids is required' });
    }

    // Get terms for the given IDs so we can remove them from cache
    const { data: termsData, error: fetchError } = await supabase
      .from('banned_terms')
      .select('term')
      .in('id', ids);

    if (fetchError) throw fetchError;

    const { error: deleteError } = await supabase
      .from('banned_terms')
      .delete()
      .in('id', ids);

    if (deleteError) throw deleteError;

    // Update cache
    if (termsData) {
      termsData.forEach(t => cachedBannedTerms.delete(t.term));
    }

    return res.json({ message: `${ids.length} termos desbanidos com sucesso.` });
  } catch (error) {
    console.error('Error deleting bulk banned terms:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete terms in bulk' });
  }
});

app.post('/api/admin/banned-terms/bulk', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { terms } = req.body;
    if (!terms || !Array.isArray(terms)) {
      return res.status(400).json({ error: 'Array of terms is required' });
    }

    // Clean and validate terms
    const cleanedTerms = terms
      .map(t => typeof t === 'string' ? t.trim().toLowerCase() : '')
      .filter(t => t.length > 0 && !t.startsWith('#'));

    if (cleanedTerms.length === 0) {
      return res.status(400).json({ error: 'No valid terms to import' });
    }

    const batchSize = 100;
    const inserted = [];
    
    for (let i = 0; i < cleanedTerms.length; i += batchSize) {
      const batch = cleanedTerms.slice(i, i + batchSize).map(term => ({ term }));
      const { data, error } = await supabase
        .from('banned_terms')
        .upsert(batch, { onConflict: 'term' })
        .select();
      
      if (error) throw error;
      if (data && Array.isArray(data)) inserted.push(...data);
    }

    // Refresh memory cache
    cleanedTerms.forEach(term => cachedBannedTerms.add(term));

    return res.status(201).json({ 
      message: `${cleanedTerms.length} termos processados com sucesso.`,
      count: inserted.length 
    });
  } catch (error) {
    console.error('Error importing bulk banned terms:', error);
    return res.status(500).json({ error: error.message || 'Failed to import terms in bulk' });
  }
});

app.get('/api/admin/users', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    // Mapear apenas dados relevantes e seguros
    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'editor',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until
    }));

    return res.json(mappedUsers);
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ error: error.message || 'Failed to list users' });
  }
});

app.put('/api/admin/users/:id/role', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // 🔒 SEGURANÇA [VULN-BAC]: Impede que o administrador altere o próprio papel
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own admin status' });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { role }
    });

    if (error) throw error;

    return res.json({
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'editor',
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at,
      banned_until: data.user.banned_until
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: error.message || 'Failed to update user role' });
  }
});

app.put('/api/admin/users/:id/ban', requireSupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { ban } = req.body; // boolean

    // 🔒 SEGURANÇA [VULN-BAC]: Impede que o administrador bana a si mesmo
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    const banDuration = ban ? '87600h' : 'none'; // 10 anos ou remover ban
    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: banDuration
    });

    if (error) throw error;

    return res.json({
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'editor',
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at,
      banned_until: data.user.banned_until
    });
  } catch (error) {
    console.error('Error toggling user ban status:', error);
    return res.status(500).json({ error: error.message || 'Failed to toggle ban status' });
  }
});

// ============= Admin Images Endpoints =============
app.get('/api/admin/images', requireSupabaseAuth, async (req, res) => {
  try {
    const { data: files, error } = await supabase.storage
      .from('verbetes-images')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    const images = files.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('vervetes-images') // note o fallback para o nome correto
        .getPublicUrl(file.name);

      // Garantir o uso do bucket correto
      const { data: { publicUrl: correctUrl } } = supabase.storage
        .from('verbetes-images')
        .getPublicUrl(file.name);

      return {
        name: file.name,
        url: correctUrl,
        size: file.metadata?.size || 0,
        created_at: file.created_at
      };
    });

    return res.json(images);
  } catch (error) {
    console.error('Error listing images:', error);
    return res.status(500).json({ error: error.message || 'Failed to list images' });
  }
});

app.delete('/api/admin/images/:name', requireSupabaseAuth, async (req, res) => {
  try {
    const { name } = req.params;

    // Remover imagem do bucket
    const { error: deleteError } = await supabase.storage
      .from('verbetes-images')
      .remove([name]);

    if (deleteError) throw deleteError;

    // Obter URL pública para remover referências nos verbetes
    const { data: { publicUrl } } = supabase.storage
      .from('verbetes-images')
      .getPublicUrl(name);

    // 🔒 SEGURANÇA [VULN-BAC]: Limpa os links quebrados na tabela topics
    await supabase
      .from('topics')
      .update({ image_url: null })
      .eq('image_url', publicUrl);

    return res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete image' });
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
