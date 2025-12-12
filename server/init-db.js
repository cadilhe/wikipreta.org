import { initializeDatabase } from './db-init.js';

(async () => {
  try {
    await initializeDatabase();
    console.log('init-db: done');
  } catch (err) {
    console.error('init-db failed', err);
    process.exit(1);
  }
})();