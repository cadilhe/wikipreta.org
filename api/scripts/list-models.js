import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function list() {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await genAI.models.list();
    console.log("=== RESPOSTA BRUTA DA API ===");
    console.log(JSON.stringify(response, null, 2));
  } catch (e) {
    console.error("Erro ao listar modelos:", e);
  }
}

list();
