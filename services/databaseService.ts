/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const API_URL = '/api';
const WIKIPRETA_HISTORY_KEY = 'wikipreta_history';

/**
 * Normalizes a topic string to a URL-safe slug.
 */
const toSlug = (text: string): string => {
  const articles = ['a', 'e', 'da', 'do', 'na', 'no'];
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose accents
    .replace(/ç/g, 'c')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .split(/[\s_]+/)
    .filter(word => word.length > 0 && !articles.includes(word))
    .join('-')
    .replace(/-+/g, '-')       // Multiple hyphens to one
    .replace(/^-+|-+$/g, '');  // Trim hyphens
};

/**
 * Fetches topic data from the server (Supabase).
 * @param topic The topic title or slug.
 * @returns The topic object or null if not found.
 */
export const getTopicContent = async (topic: string): Promise<any | null> => {
  try {
    const slug = toSlug(topic);
    const response = await fetch(`${API_URL}/topics/${slug}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch topic from server');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching topic from server:', error);
    return null;
  }
};

/**
 * Saves topic content to the server (Supabase).
 */
export const saveTopicContent = async (topic: string, content: string, editorEmail?: string, imageUrl?: string): Promise<void> => {
  try {
    const slug = toSlug(topic);
    
    // Try to update first
    let response = await fetch(`${API_URL}/topics/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content,
        editor_email: editorEmail || 'anonymous',
        imageUrl
      }),
    });

    // If it doesn't exist, create it
    if (response.status === 404) {
      response = await fetch(`${API_URL}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: topic,
          content,
          source: 'user',
          imageUrl
        }),
      });
    }

    if (!response.ok) {
      throw new Error('Failed to save topic to server');
    }
  } catch (error) {
    console.error('Error saving topic to server:', error);
    throw error;
  }
};

/**
 * Retrieves the topic history from localStorage.
 * @returns The history array.
 */
export const getHistory = (): string[] => {
  try {
    const historyString = localStorage.getItem(WIKIPRETA_HISTORY_KEY);
    return historyString ? JSON.parse(historyString) : [];
  } catch (error) {
    console.error('Error reading history from localStorage:', error);
    return [];
  }
};

/**
 * Adds a topic to the history, moving it to the top if it already exists.
 * @param topic The topic to add.
 * @returns The updated history array.
 */
export const addToHistory = (topic: string): string[] => {
  const normalizedTopic = topic.trim();
  if (!normalizedTopic) return getHistory();

  let history = getHistory();
  // Remove topic if it already exists to avoid duplicates and move it to the front
  history = history.filter(item => item.toLowerCase() !== normalizedTopic.toLowerCase());
  
  // Add the new topic to the beginning of the array
  history.unshift(normalizedTopic);

  try {
    localStorage.setItem(WIKIPRETA_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving history to localStorage:', error);
  }
  return history;
};

/**
 * Clears the topic history from localStorage.
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(WIKIPRETA_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history from localStorage:', error);
  }
};