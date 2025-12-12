#!/usr/bin/env node
/**
 * Test image generation: POST /api/gemini/image
 * Verify: image saved to server/uploads/, DB updated with imageUrl
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dbPath = path.join(rootDir, 'prisma/dev.db');
const uploadsDir = path.join(__dirname, 'uploads');

console.log('🎨 Starting image generation test...\n');

// Start server
console.log('📍 Starting backend server...');
const server = spawn('node', ['./server/index.js'], { 
  cwd: rootDir,
  stdio: ['ignore', 'inherit', 'inherit']
});

// Wait for server to start
await new Promise(r => setTimeout(r, 3000));

const topic = 'Kanimambo'; // Use same topic from previous test

console.log(`\n🖼️  Testing /api/gemini/image endpoint for topic: "${topic}"...`);

try {
  const res = await fetch('http://localhost:4000/api/gemini/image', {
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
  console.log(`✅ Received image response from Imagen`);
  console.log(`   Source: ${data.source}`);
  console.log(`   Mime: ${data.mime}`);
  console.log(`   Image URL: ${data.imageUrl}`);
  console.log(`   Base64 length: ${data.imageBase64?.length || 0} chars`);
  
  // Check if file exists on disk
  if (data.imageUrl) {
    const fileName = path.basename(data.imageUrl);
    const filePath = path.join(uploadsDir, fileName);
    
    console.log(`\n📁 Checking file on disk...`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ Image file found: ${filePath}`);
      console.log(`   Size: ${stats.size} bytes`);
    } else {
      console.warn(`⚠️  File not found at: ${filePath}`);
    }
  }
  
  // Check DB for updated imageUrl
  console.log(`\n💾 Checking database for imageUrl...`);
  const db = new Database(dbPath, { readonly: true });
  const slug = 'kanimambo';
  const row = db.prepare('SELECT * FROM topics WHERE slug = ?').get(slug);
  
  if (!row) {
    console.error(`❌ Topic not found in DB`);
    server.kill();
    process.exit(1);
  }

  if (row.imageUrl) {
    console.log(`✅ Topic imageUrl updated in DB`);
    console.log(`   imageUrl: ${row.imageUrl}`);
  } else {
    console.warn(`⚠️  No imageUrl in DB (may not have been updated)`);
  }
  
  console.log('\n✅ Image generation test completed!\n');
} catch (err) {
  console.error('❌ Test failed:', err.message);
  server.kill();
  process.exit(1);
}

server.kill();
