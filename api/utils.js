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
    'aidética', 'aidético', 'aleijada', 'aleijado', 'anã', 'analfabeta', 'analfabeto', 'anão', 'anus', 'apenada', 'apenado', 'arrombado', 'babaca', 'baba-ovo', 'babaovo', 'bacura', 'bagos', 'baitola', 'barraco', 'bêbado', 'bêbedo', 'bebum', 'besta', 'bicha', 'bisca', 'bixa', 'boazuda', 'boçal', 'boceta', 'boco', 'boiola', 'bokete', 'bolagato', 'bolcat', 'bolsonaro', 'boquete', 'bosseta', 'bosta', 'bostana', 'branquelo', 'brecha', 'brexa', 'brioco', 'bronha', 'buca', 'buceta', 'bugre', 'bunduda', 'burra', 'burro', 'busseta', 'caceta', 'cacete', 'cachorra', 'cachorro', 'cadela', 'caga', 'cagado', 'cagao', 'cagão', 'cagona', 'caipira', 'canalha', 'canceroso', 'caralho', 'casseta', 'cassete', 'ceguinho', 'checheca', 'chereca', 'chibumba', 'chibumbo', 'chifruda', 'chifrudo', 'chochota', 'chota', 'chupada', 'chupado', 'clitoris', 'clitóris', 'cocaina', 'cocaína', 'coco', 'cocô', 'corna', 'cornagem', 'cornão', 'cornisse', 'corno', 'cornuda', 'cornudo', 'corrupta', 'corrupto', 'coxo', 'cretina', 'cretino', 'cu ', 'cú', 'culhao', 'culhão', 'curalho', 'cuzao', 'cuzão', 'cuzuda', 'cuzudo', 'debil', 'débil', 'debiloide', 'debilóide', 'deficiente', 'defunto', 'demonio', 'demônio', 'denegrir', 'denigrir', 'detento', 'difunto', 'doida', 'doido', 'egua', 'égua', 'elemento', 'encostado', 'esclerosado', 'escrota', 'escroto', 'esporrada', 'esporrado', 'esporro', 'estupida', 'estúpida', 'estupidez', 'estupido', 'estúpido', 'facista', 'fanatico', 'fanático', 'fedida', 'fedido', 'fedor', 'fedorenta', 'feia', 'feio', 'feiosa', 'feioso', 'feioza', 'feiozo', 'felacao', 'felação', 'fenda', 'foda', 'fodao', 'fodão', 'fode', 'fodi', 'fodida', 'fodido', 'fornica', 'fornição', 'fudeção', 'fudendo', 'fudida', 'fudido', 'furada', 'furado', 'furão', 'furnica', 'furnicar', 'furo', 'furona', 'gai', 'gaiata', 'gaiato', 'gay', 'gilete', 'goianada', 'gonorrea', 'gonorreia', 'gonorréia', 'gosmenta', 'gosmento', 'grelinho', 'grelo', 'gringo', 'homo-sexual', 'homosexual', 'homosexualismo', 'homossexual', 'homossexualismo', 'idiota', 'idiotice', 'imbecil', 'inculto', 'iscrota', 'iscroto', 'japa', 'judiar', 'ladra', 'ladrao', 'ladrão', 'ladroeira', 'ladrona', 'lalau', 'lazarento', 'leprosa', 'leproso', 'lesbica', 'lésbica', 'louco', 'macaca', 'macaco', 'machona', 'macumbeiro', 'malandro', 'maluco', 'maneta', 'marginal', 'masturba', 'meleca', 'meliante', 'merda', 'mija', 'mijada', 'mijado', 'mijo', 'minorias', 'mocrea', 'mocreia', 'mocréia', 'moleca', 'moleque', 'mondronga', 'mondrongo', 'mongol', 'mongoloide', 'mongolóide', 'naba', 'nadega', 'nádega', 'nazista', 'nhaca', 'nojeira', 'nojenta', 'nojento', 'nojo', 'olhota', 'otaria', 'otária', 'otario', 'otário', 'paca', 'palhaco', 'palhaço', 'paspalha', 'paspalhao', 'paspalho', 'pau', 'peão', 'peia', 'peido', 'pemba', 'penis', 'pênis', 'pentelha', 'pentelho', 'perereca', 'perneta', 'peru', 'pica', 'picao', 'picão', 'pilantra', 'pinel', 'pintão', 'pinto', 'pintudo', 'piranha', 'piroca', 'piroco', 'piru', 'pivete', 'porra', 'prega', 'prequito', 'preso', 'priquito', 'prostibulo', 'prostituta', 'prostituto', 'punheta', 'punhetao', 'punhetão', 'pus', 'pustula', 'puta', 'puto', 'puxa-saco', 'puxasaco', 'rabao', 'rabão', 'rabo', 'rabuda', 'rabudao', 'rabudão', 'rabudo', 'rabudona', 'racha', 'rachada', 'rachadao', 'rachadinha', 'rachadinho', 'rachado', 'ramela', 'remela', 'retardada', 'retardado', 'ridícula', 'roceiro', 'rola', 'rolinha', 'rosca', 'sacana', 'safada', 'safado', 'sapatao', 'sapatão', 'sifilis', 'sífilis', 'siririca', 'tarada', 'tarado', 'testuda', 'tesuda', 'tesudo', 'tezao', 'tezuda', 'tezudo', 'traveco', 'trocha', 'trolha', 'troucha', 'trouxa', 'troxa', 'tuberculoso', 'tupiniquim', 'turco', 'vaca', 'vadia', 'vagabunda', 'vagabundo', 'vagal', 'vagina', 'veada', 'veadao', 'veado', 'viada', 'viadagem', 'viadao', 'viadão', 'viado', 'víado', 'xana', 'xaninha', 'xavasca', 'xerereca', 'xexeca', 'xibiu', 'xibumba', 'xiíta', 'xochota', 'xota', 'xoxota', 'vtnc', 'fdp', 'filho da puta', 'fodasse', 'fodeu', 'cuzaum', 'cuzudaum', 'cuzudaumputinha', 'vadiazinha', 'putanquinha', 'putaum', 'putinha',
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
