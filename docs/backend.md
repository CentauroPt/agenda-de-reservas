# Backend de reservas e sincronização

Este diretório contém as funções serverless (Vercel) que dão suporte a reservas partilhadas e à
sincronização com o Google Calendar. **O frontend ainda não está ligado a elas** — a aplicação
publicada continua a usar `localStorage`. A ligação é a fase seguinte (ver o fim).

## Guia rápido de configuração (Vercel + Google)

Ordem recomendada — cada passo tem um teste no fim.

### 1. Vercel ligado ao GitHub

O projeto importa o repositório `CentauroPt/agenda-de-reservas` (branch `main`). Cada push reconstrói
sozinho. Anota o domínio em **Project → Domains** (ex.: `agenda-de-reservas.vercel.app`).

Teste: abrir `https://<domínio>/api/bookings` → deve responder `{"bookings":[]}`.

### 2. Base de dados (para partilhar reservas)

**Storage → Create Database → Upstash Redis** (plano gratuito) → **Connect** ao projeto.
A integração cria `KV_REST_API_URL` e `KV_REST_API_TOKEN` (se criar nomes `UPSTASH_REDIS_REST_*`,
copia os valores para variáveis com os nomes `KV_*`, que são os que o código usa).

Sem esta base de dados, as reservas não persistem no servidor (as funções continuam a responder, mas
cada invocação parte de uma lista vazia).

### 3. `ADMIN_TOKEN`

Em **Settings → Environment Variables**, cria `ADMIN_TOKEN` com um valor longo e secreto, por exemplo:

```
c4a6c5c3d2915be4efbbf39a91893fc3340e816c8dda3fbf
```

Guarda-o: é o que se cola no painel da app (cartão do servidor).

### 4. Conta de serviço Google

1. `console.cloud.google.com` → **New project** (ex.: `agenda-creactivity`).
2. **APIs & Services → Library** → ativa **Google Calendar API**.
3. **IAM & Admin → Service accounts → Create service account** (nome `agenda-sync`) → **Done**.
4. Nessa conta: **Keys → Add key → Create new key → JSON** → descarrega o ficheiro.
5. Email da conta (algo como `agenda-sync@agenda-creactivity.iam.gserviceaccount.com`).
6. Em `calendar.google.com` → **Definições** do calendário da campanha → **Partilhar com pessoas
   específicas** → adiciona esse email com **“Fazer alterações em eventos”**.

### 5. Variáveis no Vercel

| Nome | Valor |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | conteúdo do JSON **numa só linha** |
| `GOOGLE_CALENDAR_ID` | email/ID do calendário (ex.: `portugal@creactivitybus.com`) |
| `ADMIN_TOKEN` | o valor do passo 3 |

Para transformar o JSON numa linha (PowerShell, na pasta onde está a chave):

```powershell
Get-Content .\chave.json -Raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 5
```

Copia a saída inteira para o valor da variável. Nunca colar a chave em chats ou issues.

Depois de guardar as variáveis: **Deployments → Redeploy**.

### 6. Testar

```powershell
# público (sem dados pessoais)
curl https://<domínio>/api/bookings

# com token (lista completa)
curl -H "x-admin-token: <ADMIN_TOKEN>" https://<domínio>/api/bookings

# sincronização
curl -X POST -H "x-admin-token: <ADMIN_TOKEN>" https://<domínio>/api/sync
```

### 7. Ligar a app

Painel → **Google Calendar** → cartão **🌐 Servidor de reservas**: colar `https://<domínio>` e o
`ADMIN_TOKEN` → **Guardar** → **Testar ligação**.

## Endpoints

| Método | Rota | Autenticação | Efeito |
|---|---|---|---|
| `GET` | `/api/bookings` | `x-admin-token` ou `Authorization: Bearer` | Lista todas as reservas |
| `POST` | `/api/bookings` | pública | Cria reserva; devolve `id` e `cancelToken`; `409` se o horário já estiver ocupado |
| `DELETE` | `/api/bookings?token=…` | token da reserva | Cancela e liberta o horário |
| `GET`/`POST` | `/api/sync` | `x-admin-token` ou `Authorization: Bearer` | Sincroniza nos dois sentidos |

## Variáveis de ambiente

| Nome | Obrigatória | Descrição |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | sim (para sincronizar) | Conteúdo completo do JSON da conta de serviço |
| `GOOGLE_CALENDAR_ID` | não | ID do calendário da campanha (por omissão `primary`) |
| `ADMIN_TOKEN` | sim | Segredo que protege listagem e sincronização |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | recomendada | Base de dados (Vercel KV / Upstash). Sem elas usa um ficheiro local, apenas para desenvolvimento |

## Configurar o Google (uma vez)

1. Em `console.cloud.google.com`, cria um projeto e ativa a **Google Calendar API**.
2. **IAM → Service accounts → Create**: cria a conta (ex.: `agenda-sync`) e gera uma **chave JSON**.
3. Abre o calendário da campanha em `calendar.google.com` → **Definições → Partilhar com pessoas
   específicas** → adiciona o email da conta de serviço (`agenda-sync@….iam.gserviceaccount.com`) com
   a permissão **“Fazer alterações em eventos”**.
4. Copia o JSON para `GOOGLE_SERVICE_ACCOUNT_JSON` (numa linha) e o ID do calendário para
   `GOOGLE_CALENDAR_ID`.

## Como funciona a sincronização

`/api/sync` corre duas passagens:

1. **App → Google:** reservas sem `googleEventId` são criadas como eventos (com
   `extendedProperties.private.agendaBooking = 1`).
2. **Google → App:** para cada reserva com evento, lê o evento; se mudou de dia/hora, atualiza a
   reserva; se foi apagado no Google, a reserva é removida e o horário fica livre.

Assim, mexer no calendário Google reflete-se na app e vice-versa.

## Agendar a sincronização

- **Vercel Pro:** acrescenta em `vercel.json`:

  ```json
  { "crons": [{ "path": "/api/sync", "schedule": "*/10 * * * *" }] }
  ```

  O cron da Vercel não envia cabeçalhos personalizados; usa `Authorization: Bearer <ADMIN_TOKEN>` e
  define `ADMIN_TOKEN` também no projeto.

- **Plano Hobby / alternativa:** usa um serviço de cron externo (ex.: cron-job.org) a chamar
  `POST https://<projeto>.vercel.app/api/sync` com o cabeçalho `x-admin-token: <ADMIN_TOKEN>`.

## Testes locais

```powershell
node tests/backend-sync.test.js
node tests/backend-bookings.test.js
```

Os testes usam um cliente Google simulado e um armazenamento temporário — não precisam de
credenciais nem de rede.

## Frontend ligado (fase 2)

Na página **Google Calendar** existe o cartão **🌐 Servidor de reservas**:

- **Endereço do servidor** (ex.: `https://agenda.vercel.app`);
- **Token de administração** (`ADMIN_TOKEN`), usado para listar com detalhes e sincronizar;
- **Testar ligação** e **Sincronizar agora**.

Comportamento:

| Com servidor | Sem servidor |
|---|---|
| reservas vêm de `GET /api/bookings` | reservas do `localStorage` |
| reservar faz `POST /api/bookings` (409 → “horário já reservado”) | guarda localmente |
| cancelar faz `DELETE /api/bookings?id=` ou `?token=` | apaga localmente |
| admin vê escola/contactos (token) | admin vê o que tem localmente |

`GET /api/bookings` sem token devolve apenas localidade/data/horas (sem dados pessoais); com token
devolve tudo. Testado ponta a ponta com um servidor local simulado (`tests/mock-server.js`).
