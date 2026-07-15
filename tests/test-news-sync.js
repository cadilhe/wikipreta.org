import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const API_KEY = process.env.GEMINI_API_KEY;

console.log('--- WIKIPRETA NEWS FEED TEST SUITE ---');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Configured' : 'Missing');
console.log('SUPABASE_KEY:', supabaseKey ? 'Configured' : 'Missing');
console.log('GEMINI_API_KEY:', API_KEY ? 'Configured' : 'Missing');

// 1. Mock RSS feed XML string to test the parser
const mockRssXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Guia Negro</title>
  <link>https://guianegro.com.br</link>
  <description>Cultura e turismo negro</description>
  <item>
    <title><![CDATA[Afroturismo em Salvador: Roteiro Histórico]]></title>
    <link>https://guianegro.com.br/salvador-afroturismo/</link>
    <pubDate>Wed, 15 Jul 2026 14:30:00 +0000</pubDate>
    <dc:creator><![CDATA[Guilherme Soares]]></dc:creator>
    <description><![CDATA[Descubra os pontos históricos mais marcantes da cultura negra em Salvador, Bahia.]]></description>
  </item>
  <item>
    <title>Exposição de Arte Negra em São Paulo</title>
    <link>https://guianegro.com.br/exposicao-arte-sp/</link>
    <pubDate>Tue, 14 Jul 2026 10:00:00 +0000</pubDate>
    <dc:creator>Mariana Silva</dc:creator>
    <description>Nova mostra reúne obras de dezenas de artistas pretos da diáspora.</description>
  </item>
</channel>
</rss>
`;

function parseRSS(xmlText, sourceName) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  
  const extractTag = (xml, tagName) => {
    const regex = new RegExp(`<(${tagName}|[a-zA-Z0-9_-]+:${tagName})[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
    const m = xml.match(regex);
    if (!m) return '';
    let content = m[2].trim();
    if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
      content = content.substring(9, content.length - 3).trim();
    }
    return content;
  };

  const stripHtml = (html) => {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  };

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    const title = stripHtml(extractTag(itemXml, 'title'));
    const link = extractTag(itemXml, 'link');
    const pubDateStr = extractTag(itemXml, 'pubDate');
    const creator = stripHtml(extractTag(itemXml, 'creator') || extractTag(itemXml, 'author') || '');
    const description = stripHtml(extractTag(itemXml, 'description'));
    
    let pubDate = new Date();
    if (pubDateStr) {
      const parsedDate = Date.parse(pubDateStr);
      if (!isNaN(parsedDate)) {
        pubDate = new Date(parsedDate);
      }
    }

    if (title && link) {
      items.push({
        title,
        source_name: sourceName,
        link,
        pub_date: pubDate.toISOString(),
        creator: creator || null,
        description: description || null
      });
    }
  }
  return items;
}

console.log('\n--- 1. Testing parser with Mock XML ---');
const parsedMock = parseRSS(mockRssXml, 'Guia Negro');
console.log('Parsed Items Count:', parsedMock.length);
console.log('Parsed Items List:', JSON.stringify(parsedMock, null, 2));

if (parsedMock.length === 2 && parsedMock[0].title.includes('Afroturismo') && parsedMock[0].creator === 'Guilherme Soares') {
  console.log('🟢 Parser validation: SUCCESS');
} else {
  console.error('🔴 Parser validation: FAILED');
}

// 2. Testing real RSS fetching
console.log('\n--- 2. Fetching real feed (Guia Negro) ---');
async function testRealFetch() {
  try {
    const response = await fetch('https://guianegro.com.br/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const xmlText = await response.text();
    const parsed = parseRSS(xmlText, 'Guia Negro');
    console.log(`🟢 Successfully fetched and parsed Guia Negro! Found ${parsed.length} articles.`);
    if (parsed.length > 0) {
      console.log('Sample Article Title:', parsed[0].title);
      console.log('Sample Article Link:', parsed[0].link);
    }
  } catch (err) {
    console.error('🔴 Failed to fetch real feed:', err.message);
  }
}

// 3. Testing Embedding logic
async function testEmbedding() {
  console.log('\n--- 3. Testing 384d Embedding Generation ---');
  const sampleText = 'Afroturismo e valorização da cultura negra em Salvador e diáspora';
  
  // Try local Ollama
  try {
    const res = await fetch('http://127.0.0.1:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: sampleText })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.embedding) {
        console.log(`🟢 Successfully generated embedding using local Ollama! Dimensions: ${data.embedding.length}`);
        return;
      }
    }
  } catch (e) {
    console.log('Ollama is not running locally. Attempting Gemini API fallback...');
  }

  // Try Gemini
  if (API_KEY && API_KEY !== 'PLACEHOLDER_API_KEY') {
    try {
      const ai = new GoogleGenerativeAI(API_KEY);
      const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent({
        content: sampleText,
        outputDimensionality: 384
      });
      if (result.embedding && result.embedding.values) {
        console.log(`🟢 Successfully generated embedding using Gemini API fallback! Dimensions: ${result.embedding.values.length}`);
        return;
      }
    } catch (err) {
      console.error('🔴 Gemini embedding generation failed:', err.message);
    }
  } else {
    console.log('⚠️ GEMINI_API_KEY is not set or placeholder. Skipping Gemini fallback embedding test.');
  }
}

async function runAll() {
  await testRealFetch();
  await testEmbedding();
  console.log('\n--- TESTS COMPLETED ---');
}

runAll();
