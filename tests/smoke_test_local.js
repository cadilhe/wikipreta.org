// Simple smoke test: POST /api/gemini/content and print result
const port = process.env.PORT || 4000;
const url = `http://localhost:${port}/api/gemini/content`;
const topic = 'Zumbi dos Palmares';

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (err) {
    console.error('Smoke test failed', err);
    process.exit(1);
  }
})();
