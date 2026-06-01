/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This module now proxies requests to a backend API instead of calling Gemini directly
// from the browser. This prevents embedding secret API keys in the client bundle
// and keeps the architecture secure. The backend endpoints expected are:
// POST /api/gemini/content  -> { topic }
// POST /api/gemini/image    -> { topic }

import { supabase } from './supabase';

/**
 * Request helper to call our backend API with authentication.
 */
const postJson = async (url: string, body: any) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json' 
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!resp.ok) {
      let errorMessage = `Erro do servidor (${resp.status})`;
      try {
        const clonedResp = resp.clone();
        const errJson = await clonedResp.json();
        if (errJson && typeof errJson.error === 'string') {
          if (errJson.error === 'typo' && typeof errJson.suggestedTopic === 'string' && typeof errJson.suggestedSlug === 'string') {
            errorMessage = `typo:${errJson.suggestedTopic}:${errJson.suggestedSlug}`;
          } else {
            errorMessage = errJson.error;
          }
        }
      } catch (e) {
        try {
          const text = await resp.text();
          if (text) errorMessage = text;
        } catch (e2) {}
      }
      throw new Error(errorMessage);
    }
    return resp.json();
  } catch (err) {
    console.error('Request failed:', err);
    throw err;
  }
};

export const generateTopicContent = async (topic: string): Promise<string> => {
  const data = await postJson('/api/gemini/content', { topic });
  if (data && typeof data.text === 'string') {
    return data.text;
  }
  throw new Error('Resposta inválida do servidor');
};

export const generateImageForTopic = async (topic: string): Promise<string | null> => {
  try {
    const data = await postJson('/api/gemini/image', { topic });
    // Support both new Supabase URL and old base64 format
    return data.imageUrl || data.imageBase64 || null;
  } catch (e) {
    console.error('generateImageForTopic errored:', e);
    return null;
  }
};