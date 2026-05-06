import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../prisma/dev.db');

const db = new Database(dbPath, { readonly: true });

const slug = 'zumbi-dos-palmares';
const row = db.prepare('SELECT * FROM topics WHERE slug = ?').get(slug);
if (!row) {
  console.log('No topic found for slug:', slug);
  process.exit(0);
}

// Parse JSON columns
try {
  row.highlights = JSON.parse(row.highlights || '[]');
  row.relatedTopics = JSON.parse(row.relatedTopics || '[]');
} catch (e) {
  // leave raw if parse fails
}

console.log(JSON.stringify(row, null, 2));
