#!/usr/bin/env node
/**
 * Test mock image generation (no API key)
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

console.log('🎨 Testing MOCK image generation...\n');

// Create temp env without API key
const env = { ...process.env, GEMINI_API_KEY: '' };

console.log('📍 Starting backend in MOCK mode...');
const server = spawn('node', ['./server/index.js'], { 
  cwd: rootDir,
  env,
  stdio: ['ignore', 'inherit', 'inherit']
});

await new Promise(r => setTimeout(r, 3000));

const topic = 'Escravidão Transatlântica';

console.log(`\n🖼️  Testing /api/gemini/image (MOCK mode)...`);

try {
  const res = await fetch('http://localhost:4000/api/gemini/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
    timeout: 10000
  });

  if (!res.ok) {
    console.error(`❌ Server returned ${res.status}`);
    server.kill();
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ Mock image generation successful`);
  console.log(`   Source: ${data.source}`);
  console.log(`   Mime: ${data.mime}`);
  console.log(`   Base64 preview: ${data.imageBase64?.substring(0, 50)}...`);
  console.log(`\n✅ Mock mode works for offline testing!\n`);
} catch (err) {
  console.error('❌ Test failed:', err.message);
  server.kill();
  process.exit(1);
}

server.kill();
