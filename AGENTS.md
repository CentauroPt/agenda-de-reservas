# Instruções para agentes e colaboradores

## Sincronização obrigatória após cada tarefa

Depois de **cada tarefa** concluída neste repositório:

1. `git add -A`
2. commit com mensagem curta e descritiva, em português e no imperativo
   (ex.: `Corrige validação do formulário`, `Adiciona exportação CSV`);
3. `git push origin main`.

Atalho (faz os três passos e valida o branch):

```powershell
pwsh tools/sync.ps1 -Message "Descrição da tarefa"
```

Sem `-Message`, usa a mensagem por omissão `Atualiza projeto`.

## Regras

- Nunca usar `git push --force` em `main`.
- `index.html` na raiz é a **única fonte de verdade** da aplicação; não criar cópias divergentes
  noutras pastas.
- Não sincronizar código que não abre: validar o JavaScript antes do commit (o `tools/sync.ps1`
  verifica a sintaxe do bloco `<script>` de `index.html` com `node --check`, quando o Node existe).
- O deploy no Vercel é automático a cada push para `main`; branches e pull requests geram previews.
- Os dados de demonstração vivem no `localStorage` do navegador — não entram no repositório.
