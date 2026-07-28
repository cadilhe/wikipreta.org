# Guia de Configuração: Notificações no Telegram via n8n e Supabase

Este guia documenta o passo a passo para implementar a notificação automática para o administrador no Telegram sempre que um novo verbete for criado na Wikipreta.org.

---

## Por que a Opção 1 (Supabase Webhooks + n8n) é a recomendada?

1. **Desacoplamento e Robustez**:
   * O código da API Express fica limpo e focado na lógica de negócios, sem necessidade de carregar bibliotecas ou lidar com a API do Telegram, controle de retries ou chaves adicionais de webhook.
2. **Garantia de Disparo (Trigger no Banco)**:
   * Como o gatilho é disparado diretamente na tabela `topics` do Supabase via trigger de banco (`INSERT`), a notificação funcionará **independente de como o verbete foi inserido**: seja via dashboard de edição do app, scripts em lote no Node.js, inserção manual pelo SQL Editor ou upload de CSV no console do Supabase.
3. **Facilidade de Integração com o Instagram (Próximo Passo do Roadmap)**:
   * O item 13 do seu roadmap é criar posts no Instagram para novos verbetes. 
   * Integrar a API do Instagram Graph diretamente no código do Express é complexo, exigindo gerenciamento de tokens OAuth2 de longa duração, hospedagem de imagens temporárias e formatação de mídia.
   * No **n8n**, você pode simplesmente puxar uma linha (link) após o envio no Telegram e adicionar um nó do Instagram (ou HTTP Request com credenciais salvas) para criar o post automaticamente, usando a mesma carga de dados do webhook.
4. **Painel de Monitoramento Gratuito**:
   * O n8n mantém um histórico visual de execuções. Se a API do Telegram falhar temporariamente ou o bot for desconfigurado, você verá o erro exato no painel do n8n e poderá reexecutar o fluxo manualmente após corrigir o problema, sem perder nenhuma notificação.

---

## Passo 1: Criar o Bot do Telegram e Obter as Credenciais

Para enviar mensagens para o Telegram, você precisa de um Bot e do ID do seu chat/canal.

1. **Criar o Bot**:
   * Abra o Telegram e procure por `@BotFather`.
   * Envie o comando `/newbot`.
   * Siga as instruções para dar um nome e um username ao bot.
   * Ao finalizar, você receberá o **HTTP API Token** (formato: `1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ`). Guarde-o.
2. **Obter seu Chat ID (Admin)**:
   * Para enviar a mensagem diretamente para você (ou para um grupo de admins):
     * **Chat Privado**: Envie uma mensagem inicial para o seu bot recém-criado (clique em "Começar" ou `/start`). Em seguida, busque pelo bot `@userinfobot` no Telegram e envie qualquer mensagem para descobrir o seu **ID numérico** (ex: `987654321`).
     * **Grupo/Canal**: Adicione o bot ao grupo/canal como administrador. Use o bot `@GetIdsBot` dentro do grupo para pegar o ID do grupo (normalmente começa com `-`, ex: `-1001234567890`).

---

## Passo 2: Executar o n8n na VPS da Hostinger

Caso você ainda não tenha o n8n rodando na sua VPS, a forma mais rápida e limpa é utilizando **Docker**:

1. Acesse sua VPS via SSH.
2. Rode o comando a seguir para inicializar o n8n com volume persistente para salvar seus fluxos e credenciais:

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  -e GENERIC_TIMEZONE="America/Bahia" \
  n8nio/n8n:latest
```

3. Acesse o painel pelo navegador em `http://IP_DA_SUA_VPS:5678`.
4. Crie sua conta de administrador no primeiro acesso.
*(Dica: Se quiser configurar SSL/HTTPS com domínio próprio na Hostinger, você pode configurar um proxy reverso com Nginx + Certbot ou usar o Cloudflare Tunnel).*

---

## Passo 3: Criar o Workflow no n8n

1. Clique em **Add Workflow** (Novo Fluxo).
2. Adicione o nó **Webhook** como gatilho (Trigger):
   * **Method**: `POST`
   * **Path**: `new-topic` (ou o nome que preferir)
   * **Authentication**: `None` (ou adicione Header Auth se quiser proteger o endpoint).
   * Copie o **Production URL** (ex: `https://n8n.seudominio.com/webhook/new-topic`). *Nota: Durante a fase de testes na criação do fluxo, use o "Test URL" clicando em "Listen for test event" para capturar a estrutura dos dados.*
3. Adicione o nó **Telegram** conectado ao Webhook:
   * **Resource**: `Message`
   * **Operation**: `Send`
   * **Credential for Telegram API**: Crie uma nova credencial e cole o **Access Token** obtido no BotFather.
   * **Chat ID**: Insira o ID do seu chat ou grupo admin.
   * **Text**: Monte a mensagem usando expressões dinâmicas dos dados recebidos do Supabase:
     ```text
     🏿✨ *Novo Verbete na Wikipreta!*

     *Título*: {{ $json.body.record.title }}
     *Origem*: {{ $json.body.record.source }}
     
     *Resumo*:
     {{ $json.body.record.content.substring(0, 200) }}...

     🔗 [Visualizar Verbete](https://wikipreta.org/verbete/{{ $json.body.record.slug }})
     ```
   * **Add Parameter** -> **Parse Mode**: Defina como `Markdown` ou `MarkdownV2` para aplicar a formatação.
4. Salve o fluxo e ative-o (**Active** toggle no canto superior direito).

---

## Passo 4: Configurar o Webhook no Supabase

Agora vamos instruir o Supabase a notificar o n8n toda vez que um registro for inserido.

1. Acesse o **Painel do Supabase** do seu projeto.
2. No menu lateral, acesse **Database** -> **Webhooks** (ou procure por "Database Webhooks" em Integrações/Configurações).
3. Clique em **Enable Webhooks** (se for a primeira vez utilizando no projeto).
4. Clique em **Create Webhook**:
   * **Name**: `notify_new_topic`
   * **Table**: Selecione a tabela `topics`
   * **Events**: Marque apenas **Insert**
   * **Webhook URL**: Cole a **Production Webhook URL** gerada pelo n8n (ex: `https://n8n.seudominio.com/webhook/new-topic`).
   * **HTTP Method**: `POST`
   * **HTTP Headers**: `Content-Type: application/json`
5. Salve as alterações.

---

## Preparado para o Amanhã: Integração com Instagram

Quando você for implementar o fluxo do Instagram, você só precisará abrir o mesmo Workflow no n8n e adicionar um nó após o Telegram:

```
[Webhook Supabase] ──> [Telegram Message] ──> [Instagram Graph API (Post)]
```

* O nó do Instagram poderá usar a chave `{{ $json.body.record.image_url }}` enviada pelo Supabase como a imagem do post, e a legenda poderá ser montada utilizando o título e o conteúdo formatados com as hashtags padrão definidas por você.
