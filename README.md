# Zelcon

Plataforma de zeladoria condominial. Síndicos e administradoras organizam chamados em um painel Kanban; moradores acessam o portal do condomínio pelo QR Code e por um código compartilhado.

## Desenvolvimento local

Requisitos: Node.js 20+ e um projeto Supabase.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Banco de dados

- Instalação nova: execute `supabase/schema.sql` no SQL Editor do Supabase.
- Banco já existente: execute as migrações pendentes e, para ativar as notificações, execute `supabase/pwa_push_notifications.sql`.

A migração remove o acesso anônimo direto às tabelas, transforma códigos de acesso existentes em hashes bcrypt e adiciona limitação persistente de tentativas. Como o código deixa de ser recuperável, o gestor deve definir um novo código se não lembrar do atual.

O bucket `chamados` precisa aceitar JPEG, PNG e WebP de até 2 MB. O upload de moradores passa exclusivamente pela API autenticada do portal.

Em **Authentication > URL Configuration** no Supabase, mantenha `https://zelcon.vercel.app` como Site URL e adicione `https://zelcon.vercel.app/redefinir-senha` às Redirect URLs para a recuperação de senha.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha todos os valores. Em produção, cadastre os mesmos nomes nas configurações do projeto na Vercel.

`PORTAL_SESSION_SECRET` deve ser um segredo longo e diferente das demais chaves. `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` nunca podem usar o prefixo `NEXT_PUBLIC_`.

Para Web Push, execute `npx web-push generate-vapid-keys` uma única vez. Cadastre a chave pública em `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, a privada em `VAPID_PRIVATE_KEY` e um e-mail válido em `VAPID_SUBJECT`. A chave privada nunca deve ser exposta no navegador.

No Asaas, configure o webhook para:

- URL: `https://SEU-DOMINIO/api/asaas/webhook`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_SECRET`
- Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED` e os eventos de chargeback necessários.

O plano só é ativado depois de um evento de pagamento confirmado/recebido.

## Verificação

```bash
npm run lint
npm test
npm run build
npm audit
```

## Publicação

O repositório pode permanecer conectado à Vercel. Depois de aplicar a migração e cadastrar as variáveis, faça o push para a branch configurada como produção. Não publique a aplicação antes de executar a migração do banco.
