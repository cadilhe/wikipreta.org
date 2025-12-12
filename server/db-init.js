import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../prisma/dev.db');
const schemaPath = path.join(__dirname, '../prisma/schema.sql');

// Initialize database connection
export const db = new Database(dbPath);

// Enable foreign keys (SQLite disabled by default)
db.pragma('foreign_keys = ON');

// Initialize schema if database is new
export function initializeDatabase() {
  try {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    // Execute schema SQL to create tables
    db.exec(schema);
    console.log('✅ Database initialized successfully at:', dbPath);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Initialize database when run as main script
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export default db;
