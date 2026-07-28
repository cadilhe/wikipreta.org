# 🔐 Como Alterar a Senha do Administrador no Supabase

Este guia rápido explica como redefinir ou alterar manualmente a senha da conta de administrador do Wikipreta.org diretamente através do console do Supabase.

---

## 🛠️ Método 1: Pela Interface Web do Supabase (Recomendado)

O dashboard do Supabase possui uma ferramenta gráfica para gerenciar usuários e alterar senhas de forma simplificada:

1. Acesse o console do seu projeto em [supabase.com](https://supabase.com).
2. No menu lateral esquerdo, clique em **Authentication** (ícone do cadeado/usuário).
3. Na aba **Users**, localize a conta de administrador (ex: `admin@cockpit.local` ou o e-mail que você utiliza).
4. No canto direito da linha desse usuário, clique no botão de opções (**`...`**).
5. Selecione a opção **Change Password**.
6. Digite a nova senha desejada e clique em **Save**.

*Pronto! A nova senha já estará ativa para fazer login imediatamente no painel de administração.*

---

## 💻 Método 2: Via SQL Editor (Atualização Direta no Banco)

Caso você prefira executar um comando SQL direto na tabela interna de autenticação do Supabase, você pode usar a extensão de criptografia nativa `pgcrypto` para gerar o hash bcrypt:

1. No menu lateral esquerdo do Supabase, acesse o **SQL Editor**.
2. Clique em **New Query** para criar uma aba de comando vazia.
3. Cole e execute o comando abaixo, substituindo os valores do e-mail e da senha temporária:

```sql
-- Atualiza a senha encriptada usando bcrypt (sal de 10 rodadas)
UPDATE auth.users
SET encrypted_password = crypt('SUA_NOVA_SENHA_AQUI', gen_salt('bf', 10))
WHERE email = 'admin@cockpit.local';
```

4. Clique em **Run** para aplicar a alteração.

> [!WARNING]
> Tenha certeza de que o filtro `WHERE email = ...` está apontando exatamente para o e-mail do administrador, para evitar alterar as credenciais de outros usuários do sistema acidentalmente.
