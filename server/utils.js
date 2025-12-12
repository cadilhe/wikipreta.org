/**
 * Utility to convert a title/topic to a URL-safe slug
 * @param {string} text
 * @returns {string}
 */
export const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

/**
 * Generate a unique filename for an image
 * @param {string} slug
 * @param {string} timestamp optional
 * @returns {string} e.g., "kanimambo-1702079423456.png"
 */
export const generateImageFilename = (slug, timestamp = Date.now()) => {
  return `${slug}-${timestamp}.png`;
};
