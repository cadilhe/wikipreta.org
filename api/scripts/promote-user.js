import { supabase } from '../supabase.js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega o arquivo .env.local da raiz do projeto
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const emailArg = process.argv[2];

if (!emailArg) {
  console.error('❌ Por favor, informe o e-mail do usuário. Exemplo:\nnode api/scripts/promote-user.js usuario@email.com');
  process.exit(1);
}

async function promote() {
  console.log(`🔍 Buscando usuário com e-mail: ${emailArg}...`);
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email.toLowerCase() === emailArg.toLowerCase());

    if (!user) {
      console.error(`❌ Usuário com o e-mail '${emailArg}' não foi encontrado no Supabase.`);
      process.exit(1);
    }

    console.log(`👤 Usuário encontrado: ID = ${user.id}`);
    console.log('🚀 Promovendo papel para admin...');

    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'admin' }
    });

    if (updateError) throw updateError;

    console.log(`✅ Usuário ${data.user.email} promovido a 'admin' com sucesso!`);
    console.log('ℹ️ Metadados atualizados:', data.user.user_metadata);
  } catch (e) {
    console.error('❌ Erro ao promover usuário:', e.message);
  }
}

promote();
