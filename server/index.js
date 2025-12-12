import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initializeDatabase } from './db-init.js';
import { slugify, generateImageFilename } from './utils.js';
import { hashPassword, comparePassword, generateToken, authenticateToken, requireRole } from './auth.js';

// Load environment from project-level .env.local (explicit)
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.GEMINI_API_KEY;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize database
initializeDatabase();

const useMock = !API_KEY || API_KEY === 'PLACEHOLDER_API_KEY';
if (!API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is not set. The server will run in mock mode.');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const ai = !useMock ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// ============= Auth Endpoints =============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role = 'editor' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if user exists
    const userStmt = db.prepare('SELECT * FROM users WHERE username = ?');
    if (userStmt.get(username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await hashPassword(password);
    const insertStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const info = insertStmt.run(username, hash, role);

    return res.status(201).json({ id: info.lastInsertRowid, username, role });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ============= Helper Functions =============
function getTopicBySlug(slug) {
  const stmt = db.prepare('SELECT * FROM topics WHERE slug = ?');
  return stmt.get(slug);
}

function createTopic(slug, title, content, highlights, relatedTopics, imageUrl, source) {
  const stmt = db.prepare(`
    INSERT INTO topics (slug, title, content, highlights, relatedTopics, imageUrl, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const highlightsJson = JSON.stringify(highlights || []);
  const relatedJson = JSON.stringify(relatedTopics || []);
  return stmt.run(slug, title, content, highlightsJson, relatedJson, imageUrl, source);
}

function updateTopic(slug, data) {
  const { content, highlights, relatedTopics, imageUrl, editor } = data;

  // Save revision if content changed
  const topic = getTopicBySlug(slug);
  if (topic && content && content !== topic.content) {
    const revStmt = db.prepare(`
      INSERT INTO revisions (topicId, content, editor)
      VALUES (?, ?, ?)
    `);
    revStmt.run(topic.id, topic.content, editor || 'unknown');
  }

  // Update topic
  const updateStmt = db.prepare(`
    UPDATE topics
    SET content = COALESCE(?, content),
        highlights = COALESCE(?, highlights),
        relatedTopics = COALESCE(?, relatedTopics),
        imageUrl = COALESCE(?, imageUrl),
        updatedAt = CURRENT_TIMESTAMP
    WHERE slug = ?
  `);

  const highlightsJson = highlights ? JSON.stringify(highlights) : null;
  const relatedJson = relatedTopics ? JSON.stringify(relatedTopics) : null;
  return updateStmt.run(content, highlightsJson, relatedJson, imageUrl, slug);
}

// ============= Gemini API Proxies =============
app.post('/api/gemini/content', async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  // Check DB first
  const slug = slugify(topic);
  const existingTopic = getTopicBySlug(slug);

  if (existingTopic && existingTopic.source === 'gemini') {
    return res.json({
      text: existingTopic.content,
      highlights: JSON.parse(existingTopic.highlights || '[]'),
      relatedTopics: JSON.parse(existingTopic.relatedTopics || '[]'),
      generatedAt: existingTopic.updatedAt,
      source: 'db',
      cached: true,
    });
  }

  if (useMock) {
    const mockText = `Uma breve descrição de ${topic} destacando figuras como **Zumbi dos Palmares** e conceitos como **Quilombo**. Este texto é um mock local.`;
    const highlights = ['Zumbi dos Palmares', 'Quilombo'];
    const related = ['Zumbi dos Palmares', 'Quilombo', 'Capoeira'];
    return res.json({
      text: mockText,
      highlights,
      relatedTopics: related,
      generatedAt: new Date().toISOString(),
      source: 'mock',
    });
  }

  if (!ai) return res.status(500).json({ error: 'AI client not initialized' });

  const prompt = `Forneça uma biografia ou descrição enciclopédica concisa, em um único parágrafo, sobre "${topic}" no contexto da história e cultura negra do Brasil, da África ou da diáspora. O texto deve ser informativo, direto e respeitoso. Destaque outras personalidades, lugares ou conceitos relevantes envolvendo-os com dois asteriscos (ex: **Zumbi dos Palmares** ou **Quilombo**). Não inclua o nome do tópico no início do parágrafo.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const highlightMatches = response.text.trim().match(/\*\*([^*]+)\*\*/g) || [];
    const highlights = highlightMatches.map(h => h.replace(/\*\*/g, ''));

    // Save to DB
    if (!existingTopic) {
      createTopic(slug, topic, response.text.trim(), highlights, highlights, null, 'gemini');
    } else {
      updateTopic(slug, { content: response.text.trim(), highlights, relatedTopics: highlights });
    }

    return res.json({
      text: response.text.trim(),
      highlights,
      relatedTopics: highlights,
      generatedAt: new Date().toISOString(),
      source: 'gemini',
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
});

app.post('/api/gemini/image', authenticateToken, async (req, res) => {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Missing topic' });

  // Check DB first for cached image
  const slug = slugify(topic);
  const existingTopic = getTopicBySlug(slug);

  if (existingTopic && existingTopic.imageUrl) {
    // Verify the file actually exists on disk
    const imagePath = path.join(__dirname, existingTopic.imageUrl);
    if (fs.existsSync(imagePath)) {
      // Read and return cached image as base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return res.json({
        imageBase64: dataUrl,
        imageUrl: existingTopic.imageUrl,
        mime: 'image/png',
        generatedAt: existingTopic.updatedAt,
        source: 'db',
        cached: true,
      });
    }
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
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      const dataUrl = `data:image/png;base64,${base64ImageBytes}`;

      const slug = slugify(topic);
      const filename = generateImageFilename(slug);
      const filepath = path.join(UPLOADS_DIR, filename);
      const buffer = Buffer.from(base64ImageBytes, 'base64');
      fs.writeFileSync(filepath, buffer);

      // Update DB
      const topic_row = getTopicBySlug(slug);
      if (topic_row) {
        updateTopic(slug, { imageUrl: `/uploads/${filename}` });
      }

      return res.json({
        imageBase64: dataUrl,
        imageUrl: `/uploads/${filename}`,
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

app.get('/api/topics', (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let stmt, countStmt;
    if (search) {
      stmt = db.prepare(`
        SELECT * FROM topics
        WHERE title LIKE ?
        ORDER BY updatedAt DESC
        LIMIT ? OFFSET ?
      `);
      countStmt = db.prepare('SELECT COUNT(*) as count FROM topics WHERE title LIKE ?');
      const searchPattern = `%${search}%`;
      const topics = stmt.all(searchPattern, limit, offset);
      const { count } = countStmt.get(searchPattern);
      return res.json({
        topics,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) },
      });
    }

    stmt = db.prepare('SELECT * FROM topics ORDER BY updatedAt DESC LIMIT ? OFFSET ?');
    countStmt = db.prepare('SELECT COUNT(*) as count FROM topics');
    const topics = stmt.all(limit, offset);
    const { count } = countStmt.get();
    return res.json({
      topics,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.get('/api/topics/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const topic = getTopicBySlug(slug);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const revStmt = db.prepare('SELECT * FROM revisions WHERE topicId = ? ORDER BY createdAt DESC LIMIT 5');
    const revisions = revStmt.all(topic.id);

    return res.json({
      ...topic,
      highlights: JSON.parse(topic.highlights || '[]'),
      relatedTopics: JSON.parse(topic.relatedTopics || '[]'),
      revisions,
    });
  } catch (error) {
    console.error('Error fetching topic:', error);
    return res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

app.post('/api/topics', authenticateToken, (req, res) => {
  try {
    const { title, content, highlights = [], relatedTopics = [], imageUrl = null, source = 'user' } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const slug = slugify(title);
    if (getTopicBySlug(slug)) return res.status(409).json({ error: 'Topic already exists' });

    createTopic(slug, title, content, highlights, relatedTopics, imageUrl, source);
    return res.status(201).json({ slug, title, content, highlights, relatedTopics, imageUrl, source });
  } catch (error) {
    console.error('Error creating topic:', error);
    return res.status(500).json({ error: 'Failed to create topic' });
  }
});

app.put('/api/topics/:slug', authenticateToken, (req, res) => {
  try {
    const { slug } = req.params;
    const topic = getTopicBySlug(slug);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const { content, highlights, relatedTopics, imageUrl, editor } = req.body;
    updateTopic(slug, { content, highlights, relatedTopics, imageUrl, editor });

    const updated = getTopicBySlug(slug);
    return res.json({
      ...updated,
      highlights: JSON.parse(updated.highlights || '[]'),
      relatedTopics: JSON.parse(updated.relatedTopics || '[]'),
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    return res.status(500).json({ error: 'Failed to update topic' });
  }
});

// ============= Server Start =============
app.listen(PORT, () => {
  console.log(`✅ Wikipreta API server listening on http://localhost:${PORT}`);
  console.log(`📊 Database: ${path.join(__dirname, '../prisma/dev.db')}`);
  console.log(`🎭 Mock mode: ${useMock}`);
});
