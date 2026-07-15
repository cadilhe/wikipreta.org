/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { supabase } from './supabase';

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
export const saveTopicContent = async (
  topic: string, 
  content: string, 
  editorEmail?: string, 
  imageUrl?: string,
  newTitle?: string
): Promise<any> => {
  try {
    const slug = toSlug(topic);
    
    // Obter sessao ativa para injetar JWT
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json' 
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Try to update first
    let response = await fetch(`${API_URL}/topics/${slug}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ 
        title: newTitle || topic,
        content,
        editor_email: editorEmail || 'anonymous',
        imageUrl
      }),
    });

    // If it doesn't exist, create it
    if (response.status === 404) {
      response = await fetch(`${API_URL}/topics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          title: newTitle || topic,
          content,
          source: 'user',
          imageUrl
        }),
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save topic to server');
    }

    return await response.json();
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

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string;
}

/**
 * Helper to perform authenticated requests to the backend API.
 */
const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }
  return response;
};

/**
 * Lists all users for administration purposes.
 */
export const listUsers = async (): Promise<AdminUser[]> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/users`);
    return await response.json();
  } catch (error) {
    console.error('Error listing admin users:', error);
    throw error;
  }
};

/**
 * Updates a user's role.
 */
export const updateUserRole = async (userId: string, role: string): Promise<AdminUser> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Toggles a user's ban/disabled status.
 */
export const toggleUserBan = async (userId: string, ban: boolean): Promise<AdminUser> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ ban }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error toggling user ban:', error);
    throw error;
  }
};

export interface AdminImage {
  name: string;
  url: string;
  size: number;
  created_at: string;
}

/**
 * Lists all admin images from the Supabase bucket.
 */
export const listAdminImages = async (): Promise<AdminImage[]> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/images`);
    return await response.json();
  } catch (error) {
    console.error('Error listing admin images:', error);
    throw error;
  }
};

/**
 * Deletes an admin image from the bucket.
 */
export const deleteAdminImage = async (name: string): Promise<void> => {
  try {
    await authenticatedFetch(`${API_URL}/admin/images/${name}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting admin image:', error);
    throw error;
  }
};

/**
 * Search topics by query string for mapping images.
 */
export const searchTopicsForAssociation = async (search: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}/topics?limit=50&search=${encodeURIComponent(search)}`);
    if (!response.ok) throw new Error('Failed to fetch topics');
    const data = await response.json();
    return data.topics || [];
  } catch (error) {
    console.error('Error searching topics for image association:', error);
    throw error;
  }
};

/**
 * Associates an image URL with a topic by its slug.
 */
export const associateImageToTopic = async (slug: string, imageUrl: string): Promise<void> => {
  try {
    await authenticatedFetch(`${API_URL}/topics/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ imageUrl }),
    });
  } catch (error) {
    console.error('Error associating image to topic:', error);
    throw error;
  }
};

export interface BannedTerm {
  id: string;
  term: string;
  created_at: string;
}

/**
 * Lists all banned terms for moderation.
 */
export const listBannedTerms = async (): Promise<BannedTerm[]> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/banned-terms`);
    return await response.json();
  } catch (error) {
    console.error('Error listing banned terms:', error);
    throw error;
  }
};

/**
 * Bans a new term.
 */
export const addBannedTerm = async (term: string): Promise<BannedTerm> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/banned-terms`, {
      method: 'POST',
      body: JSON.stringify({ term }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error adding banned term:', error);
    throw error;
  }
};

/**
 * Deletes/unbans a term by ID.
 */
export const deleteBannedTerm = async (id: string): Promise<void> => {
  try {
    await authenticatedFetch(`${API_URL}/admin/banned-terms/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting banned term:', error);
    throw error;
  }
};

/**
 * Imports banned terms in bulk.
 */
export const importBannedTermsBulk = async (terms: string[]): Promise<{ count: number; message: string }> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/admin/banned-terms/bulk`, {
      method: 'POST',
      body: JSON.stringify({ terms }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error importing bulk banned terms:', error);
    throw error;
  }
};

/**
 * Deletes/unbans banned terms in bulk.
 */
export const deleteBannedTermsBulk = async (ids: string[]): Promise<void> => {
  try {
    await authenticatedFetch(`${API_URL}/admin/banned-terms/delete-bulk`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  } catch (error) {
    console.error('Error deleting bulk banned terms:', error);
    throw error;
  }
};

/**
 * Fetches recently updated topics (updated in the last 30 days).
 */
export const getRecentlyUpdatedTopics = async (limit: number = 30): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}/topics?dateFilter=30d&sortBy=updated_at&order=desc&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch recently updated topics');
    const data = await response.json();
    return data.topics || [];
  } catch (error) {
    console.error('Error getting recently updated topics:', error);
    return [];
  }
};

/**
 * Fetches most accessed topics sorted by view count.
 */
export const getMostAccessedTopics = async (limit: number = 5): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}/topics?sortBy=views&order=desc&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch most accessed topics');
    const data = await response.json();
    return data.topics || [];
  } catch (error) {
    console.error('Error getting most accessed topics:', error);
    return [];
  }
};

export interface NewsArticle {
  id: string;
  title: string;
  source_name: string;
  link: string;
  pub_date: string;
  creator?: string;
  description?: string;
  ingested_to_kb: boolean;
  created_at: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Fetches news from the backend database (caches/lazy-syncs feeds).
 */
export const getNews = async (page: number = 1, limit: number = 10, source?: string): Promise<NewsResponse> => {
  try {
    let url = `${API_URL}/news?page=${page}&limit=${limit}`;
    if (source && source !== 'All' && source !== 'Todos') {
      url += `&source=${encodeURIComponent(source)}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch news feed');
    return await response.json();
  } catch (error) {
    console.error('Error in getNews:', error);
    return {
      articles: [],
      pagination: { page, limit, total: 0, pages: 0 }
    };
  }
};

/**
 * Forces a manual sync of the RSS feeds (requires authentication, admin/editor).
 */
export const syncNews = async (): Promise<{ count: number; message: string }> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/news/sync`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    console.error('Error in syncNews:', error);
    throw error;
  }
};

/**
 * Forces ingestion of uningested news articles into the RAG knowledge_base (requires authentication, admin/editor).
 */
export const ingestNewsToKB = async (): Promise<{ message: string }> => {
  try {
    const response = await authenticatedFetch(`${API_URL}/news/ingest`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    console.error('Error in ingestNewsToKB:', error);
    throw error;
  }
};