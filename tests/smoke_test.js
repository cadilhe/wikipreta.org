const url = 'http://localhost:4000/api/gemini/content';
(async () => {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Kanimambo' }),
    });
    const data = await resp.json();
    console.log('Status:', resp.status);
    console.log('Response JSON:');
    console.log(JSON.stringify(data, null, 2));

    // Basic automated checks
    if (resp.status !== 200) {
      console.error('Smoke test failed: non-200 status');
      process.exit(2);
    }
    if (!data.text || typeof data.text !== 'string') {
      console.error('Smoke test failed: missing text');
      process.exit(3);
    }
    if (!data.source || data.source !== 'mock') {
      console.warn('Notice: response not marked as mock (expected for local testing)');
    }
    console.log('Smoke test passed (content endpoint)');
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
