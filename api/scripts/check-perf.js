import { supabase } from '../supabase.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkPerformance() {
  console.log("🔍 Checking Database Performance Metrics...");

  // 1. Row count
  const { count, error: countError } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("❌ Error counting rows:", countError.message);
  } else {
    console.log(`📊 Total rows in knowledge_base: ${count}`);
  }

  // 2. Try to check index (this might fail if the user doesn't have permission to query pg_indexes)
  try {
    const { data: indexes, error: indexError } = await supabase.rpc('get_indexes_info');
    if (indexError) {
       // If RPC fails, try a direct query if possible or just assume we need to check
       console.log("ℹ️ RPC 'get_indexes_info' not found. We should check for index manually in SQL Editor.");
    } else {
       console.log("📂 Indexes found:", indexes);
    }
  } catch (e) {
    console.log("ℹ️ Could not check indexes via API.");
  }

  // 3. Test query time
  const start = Date.now();
  const { data, error: queryError } = await supabase.rpc('match_knowledge', {
    query_embedding: new Array(768).fill(0), // Dummy vector
    match_threshold: 0.5,
    match_count: 1,
  });
  const duration = Date.now() - start;

  if (queryError) {
    console.error("❌ Vector search failed:", queryError.message);
  } else {
    console.log(`⏱️ Vector search (dummy) took: ${duration}ms`);
  }
}

checkPerformance();
