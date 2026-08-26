<#
Scaffolds the Claude Code <-> DeepSeek/Antigravity cross-agent handoff convention
into a project: creates AGENT_LOG.md if missing, and adds a short pointer to it
in both CLAUDE.md (Claude Code's native instructions file) and AGENTS.md
(Antigravity's native directory-walked instructions file - confirmed 2026-08-06
via strings in language_server.exe: it walks up from cwd to repo root loading
GEMINI.md/AGENTS.md). Both files get the pointer since each agent only reads
its own natively - there is no single file both read automatically.

Convention itself is documented in the global ~/.claude/CLAUDE.md.

Usage:
  new-agent-project.ps1                 # scaffolds the current directory
  new-agent-project.ps1 C:\path\to\proj # scaffolds the given directory
#>
param(
    [string]$Path = (Get-Location).Path
)

if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}
$Path = (Resolve-Path $Path).Path

$agentLogPath = Join-Path $Path 'AGENT_LOG.md'

if (-not (Test-Path $agentLogPath)) {
    $agentLogContent = @'
# Agent Log — Cross-Agent Handoff (Claude Code <-> DeepSeek/Antigravity)

Append-only. Never regenerated or overwritten by any script - this file is
exclusively for dialogue between the two agents working on this project.
See ~/.claude/CLAUDE.md (global) for the full convention.

Format: `## <date> — FROM: <agent> — FOR: <agent|both>`, then
`STATUS: open | resolved`, then content.

---
'@
    Set-Content -Path $agentLogPath -Value $agentLogContent -NoNewline
    Write-Host "Created $agentLogPath"
} else {
    Write-Host "AGENT_LOG.md already exists, left untouched."
}

$pointerNote = @'

---

## Cross-Agent Handoff

This project uses AGENT_LOG.md for asynchronous handoff notes between Claude
Code and DeepSeek/Antigravity. Read it before starting work; append entries,
never edit past ones. Full convention: ~/.claude/CLAUDE.md (global).
'@

function Add-HandoffPointer {
    param(
        [string]$FilePath,
        [string]$DefaultHeader
    )
    $name = Split-Path $FilePath -Leaf
    if (-not (Test-Path $FilePath)) {
        Set-Content -Path $FilePath -Value ($DefaultHeader + $pointerNote) -NoNewline
        Write-Host "Created $FilePath with handoff pointer."
    } else {
        $existing = Get-Content -Path $FilePath -Raw
        if ($existing -notmatch 'AGENT_LOG\.md') {
            Add-Content -Path $FilePath -Value $pointerNote
            Write-Host "Appended handoff pointer to existing $FilePath."
        } else {
            Write-Host "$name already references AGENT_LOG.md, left untouched."
        }
    }
}

Add-HandoffPointer -FilePath (Join-Path $Path 'CLAUDE.md') `
    -DefaultHeader "# CLAUDE.md`n`nThis file provides guidance to Claude Code (claude.ai/code) when working with code in this repository."

Add-HandoffPointer -FilePath (Join-Path $Path 'AGENTS.md') `
    -DefaultHeader "# AGENTS.md`n`nThis file provides guidance to Antigravity when working with code in this repository."
