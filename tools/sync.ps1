<#
.SYNOPSIS
    Sincroniza o projeto com o repositório: valida a sintaxe, faz commit e push para main.

.EXAMPLE
    pwsh tools/sync.ps1 -Message "Corrige validação do formulário"

.EXAMPLE
    pwsh tools/sync.ps1
#>
[CmdletBinding()]
param(
    [string]$Message = 'Atualiza projeto'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$env:GIT_SSH_COMMAND = 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new'

function Assert-Syntax {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host 'Node não encontrado; a saltar verificação de sintaxe.' -ForegroundColor Yellow
        return
    }

    $html = Get-Content -Raw -LiteralPath (Join-Path $repo 'index.html')
    $match = [regex]::Match($html, '(?s)<script>\s*(\(function \(\).*?\)\(\);)\s*</script>')
    if (-not $match.Success) {
        throw 'Não encontrei o bloco de script da aplicação em index.html.'
    }

    $temp = Join-Path ([System.IO.Path]::GetTempPath()) 'agenda-sync-check.js'
    Set-Content -LiteralPath $temp -Value $match.Groups[1].Value -Encoding utf8
    try {
        & $node.Source --check $temp
        if ($LASTEXITCODE -ne 0) { throw 'Verificação de sintaxe do JavaScript falhou.' }
        Write-Host 'Sintaxe do JavaScript: OK' -ForegroundColor Green
    }
    finally {
        Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    }
}

Push-Location $repo
try {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne 'main') {
        throw "Está no branch '$branch'. A sincronização automática só é feita em 'main'."
    }

    Assert-Syntax

    $changes = @(git status --porcelain)
    if ($changes.Count -eq 0) {
        Write-Host 'Sem alterações locais para commit.' -ForegroundColor Yellow
        git fetch origin main --quiet
        $ahead = [int](git rev-list --count 'origin/main..HEAD')
        if ($ahead -gt 0) {
            git push origin main
            Write-Host "Enviados $ahead commit(s) pendentes." -ForegroundColor Green
        }
        else {
            Write-Host 'Repositório já sincronizado.' -ForegroundColor Green
        }
        return
    }

    git add -A
    git commit -m $Message | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'O commit falhou.' }

    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'O push falhou.' }

    $hash = (git rev-parse --short HEAD).Trim()
    Write-Host "Sincronizado: $hash -> origin/main ($($changes.Count) ficheiro(s))" -ForegroundColor Green
}
finally {
    Pop-Location
}
