import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function check() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // No SDK oficial, usamos listModels()
    const result = await genAI.listModels();
    console.log("=== SEUS MODELOS DISPONÍVEIS ===");
    for (const model of result.models) {
      if (model.supportedGenerationMethods.includes('embedContent')) {
        console.log(`✅ DISPONÍVEL PARA EMBEDDING: ${model.name}`);
      }
    }
    if (!result.models.some(m => m.supportedGenerationMethods.includes('embedContent'))) {
      console.log("❌ Nenhum modelo de embedding encontrado para sua chave.");
    }
  } catch (e) {
    console.error("Erro ao listar modelos:", e.message);
  }
}

check();
