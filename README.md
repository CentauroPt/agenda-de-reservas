# Agenda de Reservas — Campanha Educativa PT

Aplicação web de página única (sem build e sem instalação) para gerir as reservas dos ateliers
**Creactivity** da Fundação "la Caixa": calendário semanal por campanha, formulário de reserva para
grupos escolares e painel de administração com horários, durações, localidades e exportação de reservas.

![Calendário semanal](docs/captura-calendario.png)

## Funcionalidades

**Vista pública**
- Calendário semanal (segunda a sexta) gerado a partir das horas de início e da duração de cada sessão.
- Sessões coloridas por estado: disponível, reservada, passada e fora do período da campanha.
- Navegação por semanas, botão "Hoje" e salto automático para a semana da campanha ao mudar de localidade.
- Aviso de sessões sobrepostas e de sessões que terminam no dia seguinte.
- Formulário de reserva com validação de nome, escola, e-mail, telemóvel português (9 dígitos),
  número de alunos (1–25), ano frequentado e programa da Fundação "la Caixa".

**Painel de administração**
- Gestão das horas de sessão da manhã e da tarde, com duração base por período (30–180 minutos).
- Campanhas (localidades) com data de início e de fim; o calendário bloqueia datas fora do intervalo.
- Reservas registadas: listagem, contagem de alunos, cancelamento individual e **exportação CSV**
  (separador `;` e BOM, pronta para Excel).
- Replicação de horários por intervalo de datas (simulação local) e reinício dos dados.

## Como usar

Basta abrir `index.html` no navegador. Para servir por HTTP (recomendado para testar em telemóvel):

```bash
python -m http.server 8000
# http://localhost:8000
```

Não há dependências para instalar. O único recurso externo é o Tailwind CSS via CDN
(`cdn.tailwindcss.com`), pelo que é necessária ligação à internet na primeira carga.

### Publicar no Vercel

O projeto é um site estático puro (sem build, sem dependências), por isso o deploy é direto:

1. Em [vercel.com/new](https://vercel.com/new), importar o repositório `CentauroPt/agenda-de-reservas`.
2. Configuração do projeto:
   - **Framework Preset:** `Other`
   - **Build Command:** vazio
   - **Output Directory:** vazio (raiz)
   - **Install Command:** vazio
3. Deploy. O `index.html` da raiz passa a ser servido em `https://<projeto>.vercel.app`.

O ficheiro `vercel.json` já define `cleanUrls`, `trailingSlash: false` e cabeçalhos de segurança
(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`), além de cache de 1 dia para as
imagens em `docs/`. Não são necessárias variáveis de ambiente.

Alternativa por linha de comandos (depois de `vercel login`):

```bash
npx vercel --prod
```

Cada `git push` para `main` gera automaticamente um novo deployment; os restantes branches e pull
requests geram *preview deployments*.

> Nota: em produção os dados das reservas continuam no `localStorage` de cada visitante. No domínio
> Vercel isso é aceitável para demonstração, mas para uso real é preciso backend (ver limitações).

### Publicar no GitHub Pages (alternativa)

`Settings → Pages → Deploy from a branch → main / (root)`. O `index.html` da raiz é servido
diretamente, sem precisar do `vercel.json`.

## Estrutura

```
index.html   # aplicação completa (HTML + CSS + JavaScript)
vercel.json  # configuração de deploy estático no Vercel
docs/        # capturas de ecrã usadas na documentação
```

## Dados e persistência

Os dados ficam no navegador, em `localStorage`, sob a chave `campanha_pt_v3`:

```json
{
  "locations": [
    { "id": "loc-...", "name": "71.Torres Vedras", "startDate": "2026-10-26", "endDate": "2026-11-23" }
  ],
  "selectedLocation": 0,
  "morningDuration": 94,
  "morningSessions": ["09:00", "10:49", "12:38"],
  "afternoonDuration": 60,
  "afternoonSessions": ["14:30", "15:45"],
  "bookings": {
    "loc-...|2026-10-27|09:00": {
      "locationId": "loc-...",
      "date": "2026-10-27",
      "sessionStart": "09:00",
      "sessionEnd": "10:34",
      "duration": 94,
      "schoolName": "EB 1 de Torres Vedras",
      "students": 22,
      "firstName": "Marta",
      "lastName": "Ferreira",
      "email": "marta.ferreira@eb1-torres.pt",
      "phone": "919876543",
      "companionName": "João Ferreira",
      "companionPhone": "917654321",
      "grade": "3º Ano",
      "laCaixa": "Sim",
      "laCaixaDetails": "Programa EduCaixa",
      "createdAt": "2026-10-24T16:10:00.000Z"
    }
  }
}
```

As chaves de reserva passaram a usar o `id` da campanha (e não o nome), para que renomear uma
localidade não perca reservas. Dados de versões anteriores, guardados por nome, são migrados
automaticamente na primeira abertura.

## Limitações conhecidas

- **Sem backend:** cada navegador tem os seus próprios dados. Não há sincronização entre dispositivos
  nem reservas concorrentes de várias pessoas — para uso real em produção é necessário servidor e base
  de dados.
- **Sem integração real com o Google Calendar:** o botão "Simular Alteração Google Calendar" apenas
  demonstra o comportamento; não existe chamada à API.
- Tailwind CSS é carregado por CDN, pelo que sem internet a página fica sem estilos.

## Próximos passos sugeridos

1. API + base de dados (reservas, campanhas, horários) com autenticação para o painel de administração.
2. Sincronização bidirecional com Google Calendar (OAuth na conta da organização).
3. Notificações por e-mail ao responsável do grupo e à organização.
4. Relatórios de ocupação por campanha e exportação para Excel.

## Fluxo de trabalho

Cada tarefa termina com commit e push para `main`, pelo que o deploy no Vercel acompanha
automaticamente. O atalho valida a sintaxe do JavaScript de `index.html` antes de publicar:

```powershell
pwsh tools/sync.ps1 -Message "Corrige validação do formulário"
```

As regras completas estão em [AGENTS.md](AGENTS.md).
