// Real smoke test: POST /api/gemini/content with real Gemini API
const url = 'http://localhost:4000/api/gemini/content';
const topic = 'Kanimambo';

console.log(`[${new Date().toISOString()}] Testing real Gemini generation for: ${topic}`);

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    
    if (res.status !== 200) {
      console.error(`ERROR: Status ${res.status}`);
      const text = await res.text();
      console.error(text);
      process.exit(1);
    }
    
    const data = await res.json();
    console.log('\n✅ SUCCESS (Real Gemini)');
    console.log(`   Source: ${data.source}`);
    console.log(`   Text length: ${data.text?.length || 0} chars`);
    console.log(`   Highlights: ${data.highlights?.join(', ') || 'none'}`);
    console.log(`   Related topics: ${data.relatedTopics?.join(', ') || 'none'}`);
    console.log(`\n📄 Full text:\n${data.text}`);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }
})();
