/**
 * Utility to convert a title/topic to a URL-safe slug
 * @param {string} text
 * @returns {string}
 */
export const slugify = (text) => {
  const articles = ['a', 'e', 'da', 'do', 'na', 'no'];
  
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    // Manual fixes for specific chars that NFD might not handle perfectly
    .replace(/ç/g, 'c')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[\u0300-\u036f]/g, '') // Remove accent markers
    .replace(/[^\w\s-]/g, '') // Remove other special chars
    .split(/[\s_]+/)
    .filter(word => word.length > 0 && !articles.includes(word))
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
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
