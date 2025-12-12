#!/usr/bin/env node
/**
 * Complete E2E test: Start server, test Gemini generation, check DB
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dbPath = path.join(rootDir, 'prisma/dev.db');

console.log('🚀 Starting E2E test...\n');

// Start server
console.log('📍 Starting backend server...');
const server = spawn('node', ['./server/index.js'], { 
  cwd: rootDir,
  stdio: ['ignore', 'inherit', 'inherit']
});

// Wait for server to start
await new Promise(r => setTimeout(r, 3000));

console.log('\n🌐 Testing /api/gemini/content endpoint...');
const topic = 'Kanimambo';

try {
  const res = await fetch('http://localhost:4000/api/gemini/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
    timeout: 60000
  });

  if (!res.ok) {
    console.error(`❌ Server returned ${res.status}`);
    const text = await res.text();
    console.error(text);
    server.kill();
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ Received response from Gemini`);
  console.log(`   Source: ${data.source}`);
  console.log(`   Text length: ${data.text?.length} chars`);
  console.log(`   Highlights: ${data.highlights?.join(', ')}`);
  
  // Check DB
  console.log('\n💾 Checking database...');
  const db = new Database(dbPath, { readonly: true });
  const slug = 'kanimambo';
  const row = db.prepare('SELECT * FROM topics WHERE slug = ?').get(slug);
  
  if (!row) {
    console.error(`❌ Topic not found in DB with slug: ${slug}`);
    server.kill();
    process.exit(1);
  }

  console.log(`✅ Found topic in DB`);
  console.log(`   Title: ${row.title}`);
  console.log(`   Source: ${row.source}`);
  console.log(`   Content length: ${row.content?.length} chars`);
  console.log(`   Created at: ${row.createdAt}`);
  
  console.log('\n✅ All tests passed!\n');
} catch (err) {
  console.error('❌ Test failed:', err.message);
  server.kill();
  process.exit(1);
}

server.kill();
