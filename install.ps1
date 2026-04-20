# install.ps1 -- Install the Claude Code SDLC framework into a target project (Windows)
#
# Usage:
#   .\install.ps1 -Target <target-directory>
#   .\install.ps1 -Target .
#   .\install.ps1                              # defaults to current directory
#
# What it does:
#   1. Copies .claude/sdlc/ (hooks + rules) to target
#   2. Copies .claude/skills/ to target
#   3. Merges hooks into target's .claude/settings.json (non-destructive)
#   4. Creates .claude/PROJECT-RULES.md placeholder and standards/ directory if missing
#   5. Prints installation summary
#
# Prerequisites: Node.js 18+
#
# MIT License

param(
    [string]$Target = "."
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Target = (Resolve-Path $Target).Path

Write-Host "==========================================="
Write-Host "  Claude Code SDLC Framework Installer"
Write-Host "==========================================="
Write-Host ""
Write-Host "Target: $Target"
Write-Host ""

# --- Preflight checks ---

$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "[ERROR] Node.js is required but not found." -ForegroundColor Red
    Write-Host "        Install from https://nodejs.org/ or use nvm/fnm."
    exit 1
}

if (-not (Test-Path (Join-Path $Target ".git"))) {
    Write-Host "[WARN]  Target is not a git repository. The framework works best in a git repo." -ForegroundColor Yellow
    Write-Host ""
}

# --- Copy framework files ---

Write-Host "[1/4] Copying framework files..."

$hooksDir = Join-Path $Target ".claude\sdlc\hooks"
$rulesDir = Join-Path $Target ".claude\sdlc\rules"

New-Item -ItemType Directory -Force -Path $hooksDir | Out-Null
New-Item -ItemType Directory -Force -Path $rulesDir | Out-Null

Copy-Item (Join-Path $ScriptDir ".claude\sdlc\hooks\sdlc-hook.js") (Join-Path $hooksDir "sdlc-hook.js") -Force
Write-Host "      .claude\sdlc\hooks\sdlc-hook.js"

Copy-Item (Join-Path $ScriptDir ".claude\sdlc\rules\RULES.md") (Join-Path $rulesDir "RULES.md") -Force
Copy-Item (Join-Path $ScriptDir ".claude\sdlc\rules\AGENT-RULES.md") (Join-Path $rulesDir "AGENT-RULES.md") -Force
Write-Host "      .claude\sdlc\rules\RULES.md"
Write-Host "      .claude\sdlc\rules\AGENT-RULES.md"

# --- Copy skills ---

Write-Host "[2/4] Copying skills..."

$sourceSkills = Join-Path $ScriptDir ".claude\skills"
if (Test-Path $sourceSkills) {
    $targetSkills = Join-Path $Target ".claude\skills"
    New-Item -ItemType Directory -Force -Path $targetSkills | Out-Null

    Get-ChildItem -Directory $sourceSkills | ForEach-Object {
        $skillTarget = Join-Path $targetSkills $_.Name
        New-Item -ItemType Directory -Force -Path $skillTarget | Out-Null
        Copy-Item (Join-Path $_.FullName "*") $skillTarget -Recurse -Force
        Write-Host "      .claude\skills\$($_.Name)\"
    }
} else {
    Write-Host "      (no skills directory found in framework -- skipping)"
}

# --- Merge settings.json ---

Write-Host "[3/4] Configuring settings.json..."

$templatePath = Join-Path $ScriptDir ".claude\settings.json"
$targetSettings = Join-Path $Target ".claude\settings.json"

if (-not (Test-Path $targetSettings)) {
    # No existing settings -- copy template directly
    Copy-Item $templatePath $targetSettings -Force
    Write-Host "      Created .claude\settings.json (from template)"
} else {
    # Existing settings -- merge hooks using PowerShell JSON manipulation
    $existing = Get-Content $targetSettings -Raw | ConvertFrom-Json
    $template = Get-Content $templatePath -Raw | ConvertFrom-Json

    # Ensure permissions structure exists
    if (-not $existing.PSObject.Properties['permissions']) {
        $existing | Add-Member -NotePropertyName 'permissions' -NotePropertyValue ([PSCustomObject]@{})
    }
    if (-not $existing.permissions.PSObject.Properties['allow']) {
        $existing.permissions | Add-Member -NotePropertyName 'allow' -NotePropertyValue @()
    }
    if (-not $existing.permissions.PSObject.Properties['deny']) {
        $existing.permissions | Add-Member -NotePropertyName 'deny' -NotePropertyValue @()
    }

    # Merge permissions (union)
    $mergedAllow = @($existing.permissions.allow) + @($template.permissions.allow) | Select-Object -Unique
    $existing.permissions.allow = $mergedAllow

    $mergedDeny = @($existing.permissions.deny) + @($template.permissions.deny) | Select-Object -Unique
    $existing.permissions.deny = $mergedDeny

    # Ensure hooks structure exists
    if (-not $existing.PSObject.Properties['hooks']) {
        $existing | Add-Member -NotePropertyName 'hooks' -NotePropertyValue ([PSCustomObject]@{})
    }

    # Merge UserPromptSubmit hooks
    $hookTypes = @('UserPromptSubmit', 'SubagentStart')
    foreach ($hookType in $hookTypes) {
        if (-not $existing.hooks.PSObject.Properties[$hookType]) {
            $existing.hooks | Add-Member -NotePropertyName $hookType -NotePropertyValue @()
        }

        # Check if sdlc-hook.js is already registered
        $alreadyRegistered = $false
        foreach ($entry in $existing.hooks.$hookType) {
            foreach ($hook in $entry.hooks) {
                if ($hook.command -and $hook.command.Contains("sdlc-hook.js")) {
                    $alreadyRegistered = $true
                    break
                }
            }
            if ($alreadyRegistered) { break }
        }

        if (-not $alreadyRegistered) {
            $existing.hooks.$hookType = @($existing.hooks.$hookType) + @($template.hooks.$hookType)
        }
    }

    $json = $existing | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($targetSettings, $json)
    Write-Host "      Merged hooks into existing .claude\settings.json"
}

# --- Create PROJECT-RULES.md placeholder ---

Write-Host "[4/4] Setting up project customization..."

$projectRules = Join-Path $Target ".claude\PROJECT-RULES.md"
if (-not (Test-Path $projectRules)) {
    $rulesContent = @"
# Project Rules

<!-- Add project-specific rules here. These are injected after the framework
     rules on every prompt. Use this file for conventions, constraints, and
     preferences specific to your project.

     Examples:
     - Always use snake_case for database column names
     - All API responses must include a request_id field
     - Tests must not make external network calls
-->
"@
    [System.IO.File]::WriteAllText($projectRules, $rulesContent)
    Write-Host "      Created .claude\PROJECT-RULES.md (customize with your project rules)"
} else {
    Write-Host "      .claude\PROJECT-RULES.md already exists (preserved)"
}

# Create standards directory
$standardsDir = Join-Path $Target "standards"
if (-not (Test-Path $standardsDir)) {
    New-Item -ItemType Directory -Force -Path $standardsDir | Out-Null
    Write-Host "      Created standards/ directory"
}

# --- Summary ---

Write-Host ""
Write-Host "==========================================="
Write-Host "  Installation Complete"
Write-Host "==========================================="
Write-Host ""
Write-Host "Installed:"
Write-Host "  - Hook:   .claude\sdlc\hooks\sdlc-hook.js"
Write-Host "  - Rules:  .claude\sdlc\rules\RULES.md"
Write-Host "  -         .claude\sdlc\rules\AGENT-RULES.md"
Write-Host "  - Config: .claude\settings.json"
Write-Host ""
Write-Host "Customization:"
Write-Host "  - .claude\PROJECT-RULES.md  (add project-specific rules)"
Write-Host "  - standards\                (project coding/architecture standards)"
Write-Host "  - .claude\sdlc\rules\       (edit framework rules directly)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart Claude Code to pick up the new hooks"
Write-Host "  2. Run /setup to detect your project and generate CLAUDE.md"
Write-Host ""
