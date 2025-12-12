/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const WIKIPRETA_DB_KEY = 'wikipreta_db';
const WIKIPRETA_HISTORY_KEY = 'wikipreta_history';

/**
 * Normalizes a topic string to be used as a key.
 * @param topic The topic to normalize.
 * @returns The normalized topic key.
 */
const normalizeKey = (topic: string): string => topic.trim().toLowerCase();

/**
 * Retrieves the entire topic database from localStorage.
 * @returns A record of topics and their content.
 */
const getDb = (): Record<string, string> => {
  try {
    const dbString = localStorage.getItem(WIKIPRETA_DB_KEY);
    return dbString ? JSON.parse(dbString) : {};
  } catch (error) {
    console.error('Error reading database from localStorage:', error);
    return {};
  }
};

/**
 * Saves the entire topic database to localStorage.
 * @param db The database object to save.
 */
const saveDb = (db: Record<string, string>): void => {
  try {
    localStorage.setItem(WIKIPRETA_DB_KEY, JSON.stringify(db));
  } catch (error)
 {
    console.error('Error saving database to localStorage:', error);
  }
};

/**
 * Fetches topic content from the localStorage.
 * @param topic The topic to fetch.
 * @returns The content or null if not found.
 */
export const getTopicContent = async (topic: string): Promise<string | null> => {
  const db = getDb();
  const key = normalizeKey(topic);
  return db[key] || null;
};

/**
 * Saves topic content to the localStorage.
 * @param topic The topic title.
 * @param content The topic content.
 */
export const saveTopicContent = async (topic: string, content: string): Promise<void> => {
  const db = getDb();
  const key = normalizeKey(topic);
  db[key] = content;
  saveDb(db);
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