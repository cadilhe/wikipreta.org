// Hybrid validation test: check typo and unrecognized term behavior
const port = process.env.PORT || 4000;
const url = `http://127.0.0.1:${port}/api/gemini/content`;

async function test(topic) {
  console.log(`\nTesting topic: "${topic}"`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    console.log('STATUS:', res.status);
    const json = await res.json();
    console.log('RESPONSE:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Test failed for topic ' + topic, err);
  }
}

(async () => {
  // 1. Test local typo ("Sebegal" or "Senegal" typo) - wait, does Senegal exist in db?
  // Let's test a typo of an existing predefined word, e.g. "Zumbi dos Palmare" (missing s)
  await test('Zumbi dos Palmare');

  // 2. Test out of scope term ("computador")
  await test('computador');

  // 3. Test random keys ("asdfghjkl")
  await test('asdfghjkl');
})();
