# Instruções para agentes e colaboradores

## Sincronização obrigatória após cada tarefa

Depois de **cada tarefa** concluída neste repositório:

1. `git add -A`
2. commit com mensagem curta e descritiva, em português e no imperativo
   (ex.: `Corrige validação do formulário`, `Adiciona exportação CSV`);
3. `git push origin main`.

Atalho (faz os três passos e valida o branch):

```powershell
# Windows PowerShell (incluído no Windows), a partir da raiz do repositório
powershell -NoProfile -ExecutionPolicy Bypass -File tools/sync.ps1 -Message "Descrição da tarefa"

# PowerShell 7+, se estiver instalado
pwsh tools/sync.ps1 -Message "Descrição da tarefa"
```

Sem `-Message`, usa a mensagem por omissão `Atualiza projeto`.

## Skill: alterações só a pedido

Regra do utilizador, com prioridade sobre qualquer iniciativa própria.

- **Fazer exatamente o que foi pedido** e nada mais: sem melhorias, renomeações, "limpezas" ou
  correções não solicitadas.
- **Nunca remover, desfazer ou substituir** algo que já existe (textos, botões, cores, imagens,
  funcionalidades, ficheiros) sem pedido explícito.
- Se para cumprir o pedido for preciso tocar em algo fora do âmbito, **perguntar primeiro** e esperar
  resposta antes de alterar.
- Em caso de dúvida sobre o alcance do pedido, **perguntar** em vez de assumir.
- Quando o pedido implicar mudar comportamento existente, faz-se **apenas** essa alteração.
- No fim de cada tarefa, dizer explicitamente **o que mudou** e **o que não foi tocado**.

## Regras

- **Depois de cada alteração**, indicar sempre dois links ao utilizador: a pré-visualização local
  (`http://127.0.0.1:8080`, com auto-reload) e o site publicado no GitHub Pages
  (`https://centauropt.github.io/agenda-de-reservas/`), para revisão imediata.
- Nunca usar `git push --force` em `main`.
- `index.html` na raiz é a **única fonte de verdade** da aplicação; não criar cópias divergentes
  noutras pastas.
- Não sincronizar código que não abre: validar o JavaScript antes do commit (o `tools/sync.ps1`
  verifica a sintaxe do bloco `<script>` de `index.html` com `node --check`, quando o Node existe).
- O deploy é automático a cada push para `main`: GitHub Pages (principal) e Vercel (quando ligado).
  Branches e pull requests no Vercel geram previews.
- Os dados de demonstração vivem no `localStorage` do navegador — não entram no repositório.
