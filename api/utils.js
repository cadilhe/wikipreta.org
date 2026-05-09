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

/**
 * Checks if a topic contains banned words (insults, code keywords, offensive terms)
 * @param {string} text 
 * @returns {boolean}
 */
export const isBanned = (text) => {
  if (!text) return false;

  // You can expand this list as needed
  const bannedTerms = [
    // Programming / Scripting (to prevent non-encyclopedic tech queries)
    'class ', 'function ', 'const ', 'let ', 'var ', 'document.', 'window.', 'eval(', 'alert(', '<script', 'console.log',
    'async ', 'await ', 'import ', 'export ', 'require(', 'module.exports', 'localStorage', 'sessionStorage',
    'fetch(', 'XMLHttpRequest', 'Promise', '__proto__', 'prototype', 'addEventListener', 'onclick=', 'onerror=', 'onload=',
    // HTML / CSS Tags & Attributes
    '<div>', '<span>', '<body>', '<html>', '<iframe>', '<canvas>', '<svg', 'style=', 'background-image',
    'display:', 'position:', 'padding:', 'margin:', 'important!',
    // General Languages (Java, Python, C#, etc)
    'public ', 'private ', 'protected ', 'static ', 'namespace ', 'interface ', 'typeof ', 'instanceof ',
    'void ', 'nullptr', 'undefined', 'def ', 'elif ', 'print(', 'cout <<', 'printf(',
    // System Commands / Shell
    'sudo ', 'rm -rf', 'chmod ', 'chown ', 'ls -l', 'cat /etc', 'ping ', 'curl ', 'wget ', 'ssh ', 'apt-get',
    // SQL Injection patterns
    'select *', 'drop table', 'delete from', 'update set', 'insert into', 'truncate table', 'union select', 'pg_sleep',
    // Common insults/slurs (Portuguese) - Add more according to your moderation policy
    'porra', 'caralho', 'puta', 'vtnc', 'fdp', 'imbecil', 'idiota', 'cu ', 'buceta', 'merda', 'arrombado', 'vagabundo', 'filho da puta', 'foder', 'fodasse', 'fodeu', 'cuzão', 'cuzaum', 'cuzuda', 'cuzudaum', 'cuzudaumputinha', 'viado', 'vadia', 'vadiazinha', 'vadiazinha', 'vadiazinha', 'putanquinha', 'putaum', 'putaum', 'putaum', 'putinha', 'putinha',
    // Offensive terms/Slurs (Generic)
    'fuck', 'shit', 'asshole'
  ];

  const normalized = text.toLowerCase().trim();

  // Check for exact matches or containing words
  return bannedTerms.some(term => {
    // If the term ends with a space, it checks for word boundaries (simple version)
    if (term.endsWith(' ')) {
      return normalized === term.trim() || normalized.startsWith(term) || normalized.includes(` ${term}`);
    }
    return normalized.includes(term);
  });
};
