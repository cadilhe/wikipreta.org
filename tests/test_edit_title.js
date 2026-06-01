// Test suite for edit title API validation and execution
import { supabase } from '../api/supabase.js';

const port = process.env.PORT || 4000;
const baseUrl = `http://127.0.0.1:${port}/api/topics`;

async function main() {
  console.log('🚀 Iniciando teste de edição de título...');
  try {
    // 1. Atualizar a senha do usuário kambene@gmail.com para podermos logar e obter token
    console.log('Atualizando senha de kambene@gmail.com para teste...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      'e9735192-ae8c-47a2-b1ac-74ea1a566cf0', // ID do kambene@gmail.com
      { password: 'testpassword123' }
    );
    if (updateError) throw updateError;

    // 2. Fazer login e obter o access_token
    console.log('Logando em kambene@gmail.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'kambene@gmail.com',
      password: 'testpassword123'
    });
    if (authError) throw authError;

    const token = authData.session.access_token;
    console.log('Token obtido com sucesso!');

    // 3. Garantir limpeza de termos de teste anteriores (e suas revisões)
    console.log('Limpando verbetes de teste antigos...');
    const { data: oldTopics } = await supabase.from('topics').select('id').in('slug', ['test-edit-original', 'test-edit-edited']);
    if (oldTopics && oldTopics.length > 0) {
      const ids = oldTopics.map(t => t.id);
      await supabase.from('revisions').delete().in('topic_id', ids);
    }
    await supabase.from('topics').delete().in('slug', ['test-edit-original', 'test-edit-edited']);

    // 4. Criar o verbete inicial via banco
    console.log('Criando verbete de teste original...');
    const { error: insertError } = await supabase.from('topics').insert([{
      title: 'Test Edit Original',
      slug: 'test-edit-original',
      content: 'Conteúdo original do verbete de teste.',
      source: 'user'
    }]);
    if (insertError) throw insertError;

    // 5. Testar PUT: Atualizar o título e o conteúdo com sucesso
    console.log('\n--- Teste A: Atualizar título e conteúdo com sucesso ---');
    const resA = await fetch(`${baseUrl}/test-edit-original`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Test Edit Edited',
        content: 'Conteúdo modificado com sucesso.',
        editor_email: 'kambene@gmail.com'
      })
    });
    console.log('Status:', resA.status);
    const dataA = await resA.json();
    console.log('Response:', dataA);

    if (resA.status !== 200) {
      throw new Error(`Falha no teste A: status esperado 200, obtido ${resA.status}`);
    }
    if (dataA.title !== 'Test Edit Edited' || dataA.slug !== 'test-edit-edited') {
      throw new Error('Falha no teste A: título ou slug não foram atualizados corretamente no retorno');
    }

    // 6. Testar PUT: Tentar usar um título banido
    console.log('\n--- Teste B: Tentar alterar para título banido ---');
    const resB = await fetch(`${baseUrl}/test-edit-edited`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'babaca', // termo estaticamente banido
        content: 'Tentativa de alteração com termo banido.'
      })
    });
    console.log('Status:', resB.status);
    const dataB = await resB.json();
    console.log('Response:', dataB);

    if (resB.status !== 403) {
      throw new Error(`Falha no teste B: status esperado 403, obtido ${resB.status}`);
    }

    // 7. Testar PUT: Tentar alterar para título que já existe (conflito de slug)
    console.log('\n--- Teste C: Tentar alterar para título já existente ---');
    const resC = await fetch(`${baseUrl}/test-edit-edited`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Zumbi dos Palmares', // já existe
        content: 'Tentativa de colisão de slug.'
      })
    });
    console.log('Status:', resC.status);
    const dataC = await resC.json();
    console.log('Response:', dataC);

    if (resC.status !== 409) {
      throw new Error(`Falha no teste C: status esperado 409, obtido ${resC.status}`);
    }

    // Limpeza
    console.log('\nLimpando verbetes de teste...');
    const { data: cleanTopics } = await supabase.from('topics').select('id').in('slug', ['test-edit-original', 'test-edit-edited']);
    if (cleanTopics && cleanTopics.length > 0) {
      const ids = cleanTopics.map(t => t.id);
      await supabase.from('revisions').delete().in('topic_id', ids);
    }
    await supabase.from('topics').delete().in('slug', ['test-edit-original', 'test-edit-edited']);

    console.log('\n======================================');
    console.log('TODOS OS TESTES DE EDIÇÃO DE TÍTULO PASSARAM! 🎉');
    console.log('======================================');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();
