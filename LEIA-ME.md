# ByteForce · Lyra — Guia completo

Site React/Vite (roxo) + backend no Vercel + banco no Supabase.
A Lyra roda no motor **ByteCore** (o site nunca revela provedores externos).
Contas com **usuário + senha**, perguntas contadas **no banco**, e **Pro mensal** (cada pagamento = +30 dias) confirmado pelo **Mercado Pago via webhook**.

---

## ⚠️ ANTES DE TUDO: sua chave do Groq vazou
Você colou a chave no chat. Considere-a comprometida.
1. Vá em https://console.groq.com/keys → apague a chave antiga → gere uma NOVA.
2. A nova você usa só nas variáveis de ambiente do Vercel (passo 4). Nunca cola em chat/código.

---

## Como tudo se conecta
- **Supabase** = banco + contas. Guarda usuários, perguntas e pagamentos.
- **Vercel** = hospeda o site e roda o backend (`api/`), onde ficam as chaves secretas.
- **Mercado Pago** = cobra os R$3 e, quando aprova, chama o `/api/webhook`, que soma +30 dias de Pro no banco.

Por que o limite é à prova de trapaça: a contagem de perguntas vive no Supabase, não no navegador. Limpar cache não zera nada.

**Modelo do plano:** cada pagamento de R$3 dá **+30 dias** de acesso ilimitado (campo `pro_until` no banco). Se a pessoa pagar de novo antes de expirar, soma mais 30 dias; se deixar expirar, volta ao limite grátis até pagar de novo. É pagamento manual (ex.: Pix), sem cobrança automática no cartão.

---

## PASSO 1 — Criar o Supabase (grátis)
1. Crie conta em https://supabase.com → **New project**. Anote a senha do banco.
2. Menu **SQL Editor** → **New query** → cole TODO o conteúdo de `supabase-schema.sql` → **Run**.
3. Menu **Authentication → Providers → Email**: mantenha "Email" ligado e **DESLIGUE "Confirm email"** (assim ninguém precisa confirmar nada — era o que você queria).
4. Menu **Project Settings → API**. Copie:
   - **Project URL** → vai em `VITE_SUPABASE_URL` e `SUPABASE_URL`
   - **anon public** key → vai em `VITE_SUPABASE_ANON_KEY`
   - **service_role** key (secreta!) → vai em `SUPABASE_SERVICE_KEY`

## PASSO 2 — Subir o código
Suba esta pasta inteira para um repositório no GitHub (botão "Upload files" serve).

## PASSO 3 — Publicar no Vercel
1. Em vercel.com → **Add New → Project** → conecte o repositório. Ele detecta o Vite sozinho.

## PASSO 4 — Variáveis de ambiente (no Vercel)
Em **Settings → Environment Variables**, adicione todas:

| Nome | Onde pegar |
|------|-----------|
| `VITE_SUPABASE_URL` | Supabase → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → anon public |
| `VITE_MP_PUBLIC_KEY` | Mercado Pago → credenciais → **Public Key** |
| `GROQ_API_KEY` | sua chave NOVA do Groq |
| `MP_ACCESS_TOKEN` | Mercado Pago → credenciais |
| `SUPABASE_URL` | igual ao Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → API → service_role (secreta) |
| `SITE_URL` | o endereço do site, ex: `https://byteforce-lyra.vercel.app` |

Depois clique em **Deploy** (ou Redeploy se já tinha subido).

## PASSO 5 — Webhook do Mercado Pago
1. Em https://www.mercadopago.com.br/developers → sua aplicação → **Webhooks / Notificações**.
2. Aponte para: `https://SEU-SITE.vercel.app/api/webhook`
3. Marque o evento **Pagamentos**.
> O código já manda `notification_url` no checkout, mas cadastrar no painel garante que funciona sempre.

---

## Testar
- **Local:** `npm install` e `npm run dev`. Login funciona; chat/pagamento só de verdade após o deploy (as chaves ficam no Vercel).
- **Pagamento sem cobrar:** use as credenciais e cartões de **Teste** do Mercado Pago.

## Ver os registros
No Supabase → **Table Editor**:
- `profiles` — usuários e a data `pro_until` (até quando o Pro vale)
- `questions` — todas as perguntas feitas à Lyra
- `payments` — pagamentos confirmados

---

## Estrutura
```
byteforce-lyra/
├── api/
│   ├── chat.js       ← Lyra (ByteCore) + conta perguntas no banco
│   ├── checkout.js   ← cria o pagamento (guarda quem pagou)
│   ├── webhook.js    ← Mercado Pago confirma e libera o Pro
│   └── status.js     ← devolve nº de perguntas + se é Pro
├── src/
│   ├── App.jsx       ← site + login/cadastro
│   ├── supabase.js   ← conexão com o banco
│   └── main.jsx
├── supabase-schema.sql  ← cole no SQL Editor do Supabase
├── index.html · package.json · vite.config.js · vercel.json · .env.example
```

## Trocar o nome do motor
"ByteCore" aparece em `src/App.jsx` (site) e `api/chat.js` (prompt da Lyra). Troque nos dois.


## PASSO 6 — Checkout embutido (Pix + Cartão)
O site agora tem o pagamento **dentro do próprio site** (não redireciona mais). Para funcionar:
1. No Mercado Pago → suas credenciais, copie a **Public Key** (começa com `APP_USR-...`) e coloque em `VITE_MP_PUBLIC_KEY` no Vercel.
2. O **Access Token** (secreto) continua em `MP_ACCESS_TOKEN`.
3. Pix já costuma vir ativo. Para **cartão**, sua conta Mercado Pago precisa estar habilitada a receber por cartão (validação feita no painel do MP, não no código).
4. Quando a pessoa paga com Pix, aparece o QR code na hora; o site fica checando e libera o Pro sozinho quando o pagamento cai.

Formas de pagamento para o cliente: **Pix (QR code)** e **cartão de crédito**. O cliente NÃO precisa ter conta no Mercado Pago — só você precisa, para receber.

---

## ATUALIZAÇÃO v2 — Chat estilo ChatGPT + Busca na web

### 1) Rode o SQL novo no Supabase
Abra o **SQL Editor** do Supabase, cole todo o conteúdo de **`supabase-schema-v2.sql`** e clique em **Run**.
Isso cria as tabelas `conversations` e `messages` (o histórico de conversas).

### 2) Crie a chave da busca (Tavily)
1. Entre em https://tavily.com e crie uma conta (tem plano grátis).
2. Copie sua **API Key**.
3. No Vercel → **Settings → Environment Variables**, adicione:

| Key | Value |
|-----|-------|
| `TAVILY_API_KEY` | sua chave do Tavily |

4. **Redeploy**.

> Se não configurar o Tavily, o chat continua funcionando normalmente — só não faz busca na web.

### O que mudou
- **Saturno roxo** — a Lyra agora é um Saturno com anel, em todo o site.
- **Memória** — ela lembra de você entre conversas (cidade, gostos, projetos).
- **Previsão do tempo** — pergunte o clima de qualquer cidade (usa Open-Meteo, grátis, sem chave).
- **Sem linhas separadoras** — ela nunca mais usa `---` ou `___`.
- **Ícones SVG** em todos os botões.
- **Chat em tela cheia** com barra lateral de conversas (igual ChatGPT).
- **Histórico salvo** — as conversas ficam guardadas e podem ser reabertas ou apagadas.
- **Streaming** — a resposta aparece palavra por palavra.
- **Markdown** — negrito, listas, títulos e blocos de código com botão de copiar.
- **Busca na web** — a Lyra decide sozinha quando precisa buscar e mostra as fontes.

### Variáveis finais no Vercel
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
GROQ_API_KEY
TAVILY_API_KEY      ← nova
MP_ACCESS_TOKEN
SITE_URL
```

---

## ATUALIZAÇÃO v3 — PAINEL ADMINISTRATIVO

### 1) Rode o SQL novo
No **SQL Editor** do Supabase, cole todo o conteúdo de **`supabase-schema-v3.sql`** e clique em **Run**.

### 2) Torne-se administrador
Ainda no SQL Editor, rode (trocando `SEU_USUARIO` pelo seu nome de usuário):

```sql
update public.profiles set is_admin = true where username = 'SEU_USUARIO';
```

Pronto. Ao entrar no site, vai aparecer o botão **Admin** na barra de cima.

### O que o painel faz
- **Visão geral** — usuários, assinantes, faturamento, gráfico dos últimos 30 dias
- **Usuários** — buscar, ver detalhes, **dar Pro grátis** (7 dias a vitalício), **banir**, **tornar admin**, **deletar**, notas internas
- **Conversas** — ver as conversas de qualquer usuário (todo acesso fica registrado nos logs)
- **Denúncias** — Kanban com 4 colunas, **arraste os cards** entre elas
- **Sinalizadas** — perguntas suspeitas detectadas automaticamente
- **Pagamentos** — histórico completo
- **Logs** — auditoria de tudo o que os admins fizeram

### IMPORTANTE — LGPD
O painel permite ler conversas de usuários. Para estar dentro da lei, **coloque nos seus Termos de Uso** que administradores podem acessar conversas para fins de moderação e segurança. Todos os acessos ficam registrados na aba Logs.

---

## ATUALIZAÇÃO v4 — Notas, Agenda, Tema claro e Checkout no chat

### 1) Rode o SQL novo
No **SQL Editor** do Supabase, cole **`supabase-schema-v4.sql`** e clique em **Run**.
Cria as tabelas `notes` (notas) e `events` (agenda).

### O que mudou

**Tema claro/escuro**
Botão de sol/lua na barra de cima (e dentro do chat e do painel). O padrão é o escuro roxo.
A escolha fica salva no navegador da pessoa.

**Notas e Agenda**
No chat, a barra lateral agora tem três abas: **Chat · Notas · Agenda**.
- **Notas**: crie, edite, escolha a cor, fixe as importantes.
- **Agenda**: compromissos agrupados por dia, com opção de marcar como concluído.

**A Lyra cria e lê por você**
Peça na conversa e ela faz:
- *"Anota que preciso comprar pão"* → cria uma nota
- *"Me lembra de pagar o boleto sexta às 10h"* → cria o compromisso
- *"O que eu tenho anotado?"* → ela consulta e responde

O que ela criar aparece marcado com o selo **Lyra**.

**Checkout dentro do chat**
Quem quiser assinar clica direto no chat — abre o pagamento numa aba nova e a conversa continua intacta.

**Painel admin ao vivo**
Os dados agora **atualizam sozinhos a cada 10 segundos**. Tem um botão "Ao vivo" na barra lateral pra pausar se quiser.
O admin também vê as **notas e a agenda** de qualquer usuário (aba "Notas e agenda" no perfil).

---

## ATUALIZAÇÃO v5 — Pix direto no site (sem sair)

O pagamento agora acontece **dentro do site e do chat**. A pessoa não vai mais para o Mercado Pago.

**Como funciona**
1. Clica em assinar → informa o email (para o comprovante)
2. O **QR code aparece na hora**, junto com a chave copia-e-cola
3. Paga pelo app do banco
4. O Pro libera **sozinho** — a tela detecta o pagamento em segundos

**Se der "Unauthorized use of live credentials"**
Esse é o Checkout Transparente, que exige que sua conta esteja apta a receber Pix.
Confira no Mercado Pago:
1. **Chave Pix cadastrada** no app (Seu Perfil → Suas chaves Pix)
2. **Credenciais de produção ativadas** (Configurações → Credenciais → "Ativar credenciais de produção")

Se persistir, dá para voltar ao Checkout Pro — é só avisar.
