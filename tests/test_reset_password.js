// Test suite for reset password flows using Supabase
import { supabase } from '../api/supabase.js';

async function main() {
  console.log('🚀 Iniciando teste do fluxo de redefinição de senha...');
  try {
    // 1. Testar o disparo do e-mail de recuperação
    console.log('--- Teste A: Disparar solicitação de recuperação de senha ---');
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      'kambene@gmail.com',
      { redirectTo: 'http://localhost:3000/reset-password' }
    );
    
    if (resetError) {
      console.warn('Aviso: erro ao disparar reset (pode ser limite de envio do Supabase):', resetError.message);
    } else {
      console.log('PASS: Disparo de redefinição executado com sucesso!');
    }

    // 2. Testar a atualização de senha (updateUser) após login
    console.log('\n--- Teste B: Logar e atualizar senha do usuário ---');
    
    // Garantir que a senha está definida
    console.log('Redefinindo senha administrativa via admin...');
    const { error: adminUpdateErr } = await supabase.auth.admin.updateUserById(
      'e9735192-ae8c-47a2-b1ac-74ea1a566cf0',
      { password: 'temporary_test_password_123' }
    );
    if (adminUpdateErr) throw adminUpdateErr;

    // Logar para simular a sessão ativa do usuário
    console.log('Efetuando login para criar sessão...');
    const { data: sessionData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: 'kambene@gmail.com',
      password: 'temporary_test_password_123'
    });
    if (loginErr) throw loginErr;

    // Criar um novo cliente Supabase com a sessão/token do usuário para testar RLS/User Update
    const userClient = sessionData.session;
    console.log('Sessão estabelecida!');

    // Atualizar a senha usando o client autenticado (assim como o componente ResetPasswordPage faria)
    // Para simular isso, usamos o cliente supabase configurado com o token do usuário
    const authSupabase = supabase; // O cliente global já compartilha a sessão ativa após signInWithPassword
    console.log('Atualizando senha via supabase.auth.updateUser...');
    const { error: userUpdateErr } = await authSupabase.auth.updateUser({
      password: 'new_recovered_password_456'
    });
    if (userUpdateErr) throw userUpdateErr;
    console.log('PASS: Senha atualizada com sucesso pelo próprio usuário autenticado!');

    // 3. Validar se o login funciona apenas com a nova senha
    console.log('\n--- Teste C: Validar login com a nova senha ---');
    
    console.log('Tentando logar com a senha antiga (deve falhar)...');
    const { error: oldLoginErr } = await supabase.auth.signInWithPassword({
      email: 'kambene@gmail.com',
      password: 'temporary_test_password_123'
    });
    if (!oldLoginErr) {
      throw new Error('Falha no teste C: login com a senha antiga deveria ter sido rejeitado!');
    }
    console.log('Confirmado: login com senha antiga falhou como esperado.');

    console.log('Tentando logar com a nova senha redefinida...');
    const { data: newLoginData, error: newLoginErr } = await supabase.auth.signInWithPassword({
      email: 'kambene@gmail.com',
      password: 'new_recovered_password_456'
    });
    if (newLoginErr) throw newLoginErr;
    console.log('PASS: Login efetuado com sucesso usando a nova senha!');

    // Restaurar a senha original para manter o ambiente estável para o usuário
    console.log('\nRestaurando senha original do kambene para "adminpassword123"...');
    const { error: restoreErr } = await supabase.auth.admin.updateUserById(
      'e9735192-ae8c-47a2-b1ac-74ea1a566cf0',
      { password: 'adminpassword123' }
    );
    if (restoreErr) throw restoreErr;
    console.log('Senha administrativa restaurada.');

    console.log('\n======================================');
    console.log('TODOS OS TESTES DE RECOVERY PASSARAM! 🎉');
    console.log('======================================');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();
