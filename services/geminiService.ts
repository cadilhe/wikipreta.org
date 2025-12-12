/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This module now proxies requests to a backend API instead of calling Gemini directly
// from the browser. This prevents embedding secret API keys in the client bundle
// and keeps the architecture secure. The backend endpoints expected are:
// POST /api/gemini/content  -> { topic }
// POST /api/gemini/image    -> { topic }

/**
 * Request helper to call our backend API.
 */
const postJson = async (url: string, body: any) => {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Server responded ${resp.status}: ${text}`);
    }
    return resp.json();
  } catch (err) {
    console.error('Request failed:', err);
    throw err;
  }
};

export const generateTopicContent = async (topic: string): Promise<string | null> => {
  try {
    const data = await postJson('/api/gemini/content', { topic });
    return typeof data.text === 'string' ? data.text : null;
  } catch (e) {
    console.error('generateTopicContent errored:', e);
    return null;
  }
};

export const generateImageForTopic = async (topic: string): Promise<string | null> => {
  try {
    const data = await postJson('/api/gemini/image', { topic });
    // Expecting { imageBase64: 'data:image/png;base64,...' }
    return typeof data.imageBase64 === 'string' ? data.imageBase64 : null;
  } catch (e) {
    console.error('generateImageForTopic errored:', e);
    return null;
  }
};