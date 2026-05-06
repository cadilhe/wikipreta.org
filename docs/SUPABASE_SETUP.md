# Guia de Configuração Supabase - WikiPreta

Este documento descreve os passos realizados para migrar o WikiPreta do SQLite para o Supabase, garantindo persistência de dados e imagens na nuvem.

## 1. Configuração do Projeto no Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Vá em **Project Settings > API** e copie a `URL` e a `anon key`.
3. Cole estes valores no seu arquivo `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 2. Estrutura do Banco de Dados (SQL Editor)
Execute o script abaixo no **SQL Editor** do Supabase para criar as tabelas e políticas de segurança (RLS):

```sql
-- Tabela de Verbetes (Topics)
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    highlights JSONB DEFAULT '[]',
    related_topics JSONB DEFAULT '[]',
    image_url TEXT,
    source TEXT DEFAULT 'gemini',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Revisões (Histórico de Edições)
CREATE TABLE IF NOT EXISTS public.revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    editor_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Segurança de Linha)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Verbetes são públicos" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Apenas editores criam verbetes" ON public.topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Apenas editores atualizam verbetes" ON public.topics FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Histórico é público" ON public.revisions FOR SELECT USING (true);
CREATE POLICY "Apenas editores criam revisões" ON public.revisions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Gatilho para atualizar a data de modificação
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
```

## 3. Configuração de Armazenamento (Storage)
1. No painel do Supabase, vá em **Storage**.
2. Clique em **New Bucket**.
3. Nome: `verbetes-images`.
4. Marque a opção **Public**.
5. Clique em **Create bucket**.

## 4. Dependências do Projeto
Foram removidas as dependências locais (`better-sqlite3`, `bcrypt`, `jsonwebtoken`) e adicionado o cliente oficial:
- `pnpm add @supabase/supabase-js`

## 5. Próximos Passos (Refatoração de Código)
- [ ] Criar cliente Supabase no servidor (`server/supabase.js`).
- [ ] Substituir consultas SQL no `server/index.js`.
- [ ] Alterar lógica de upload de imagem de `fs.write` para `storage.upload`.
- [ ] Atualizar `AuthContext.tsx` no frontend.
