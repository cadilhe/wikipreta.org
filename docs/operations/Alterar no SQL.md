Para realizar essa alteração em massa no seu banco de dados, você pode usar o comando `REPLACE` no SQL Editor do Supabase.

Aqui está o script SQL para atualizar as URLs da tabela `topics`:

```sql
UPDATE public.topics
SET image_url = REPLACE(image_url, '/wikipreta_assets/', '/wikipreta_assets/people/')
WHERE image_url LIKE 'https://kanimambo.net/wikipreta_assets/%'
  AND image_url NOT LIKE 'https://kanimambo.net/wikipreta_assets/people/%';
```

### O que este comando faz:
1.  **`REPLACE(...)`**: Procura pela parte da URL que você quer mudar e insere o `/people/` no meio.
2.  **`WHERE image_url LIKE ...`**: Garante que apenas as imagens que começam com o endereço do seu site sejam alteradas.
3.  **`AND image_url NOT LIKE ...`**: É uma segurança para evitar que, se você rodar o comando duas vezes, ele acabe criando caminhos duplicados como `/people/people/`.

**Dica:** Se você quiser testar antes de aplicar a mudança real, pode rodar este comando de "visualização" primeiro:

```sql
SELECT title, image_url as url_antiga, 
       REPLACE(image_url, '/wikipreta_assets/', '/wikipreta_assets/people/') as url_nova
FROM public.topics
WHERE image_url LIKE 'https://kanimambo.net/wikipreta_assets/%';
```

Isso mostrará como as URLs ficarão antes de você efetivar a mudança com o `UPDATE`.