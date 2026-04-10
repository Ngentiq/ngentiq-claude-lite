#!/usr/bin/env bash
# install.sh -- Install the Claude Code SDLC framework into a target project
#
# Usage:
#   bash install.sh <target-directory>
#   bash install.sh .
#
# What it does:
#   1. Copies .claude/sdlc/ (hooks + rules) to target
#   2. Copies .claude/skills/ to target
#   3. Merges hooks into target's .claude/settings.json (non-destructive)
#   4. Creates .claude/PROJECT-RULES.md placeholder if missing
#   5. Prints installation summary
#
# Prerequisites: Node.js 18+, jq (for settings merge)
#
# MIT License

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Argument parsing ---

TARGET="${1:-.}"
TARGET="$(cd "$TARGET" && pwd)"

echo "==========================================="
echo "  Claude Code SDLC Framework Installer"
echo "==========================================="
echo ""
echo "Target: ${TARGET}"
echo ""

# --- Preflight checks ---

if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js is required but not found."
  echo "        Install from https://nodejs.org/ or use nvm/fnm."
  exit 1
fi

if [ ! -d "${TARGET}/.git" ]; then
  echo "[WARN]  Target is not a git repository. The framework works best in a git repo."
  echo ""
fi

# --- Copy framework files ---

echo "[1/4] Copying framework files..."

# Create target directories
mkdir -p "${TARGET}/.claude/sdlc/hooks"
mkdir -p "${TARGET}/.claude/sdlc/rules"

# Copy hooks
cp "${SCRIPT_DIR}/.claude/sdlc/hooks/sdlc-hook.js" "${TARGET}/.claude/sdlc/hooks/sdlc-hook.js"
echo "      .claude/sdlc/hooks/sdlc-hook.js"

# Copy rules
cp "${SCRIPT_DIR}/.claude/sdlc/rules/RULES.md" "${TARGET}/.claude/sdlc/rules/RULES.md"
cp "${SCRIPT_DIR}/.claude/sdlc/rules/AGENT-RULES.md" "${TARGET}/.claude/sdlc/rules/AGENT-RULES.md"
echo "      .claude/sdlc/rules/RULES.md"
echo "      .claude/sdlc/rules/AGENT-RULES.md"

# --- Copy skills ---

echo "[2/4] Copying skills..."

if [ -d "${SCRIPT_DIR}/.claude/skills" ]; then
  mkdir -p "${TARGET}/.claude/skills"
  # Copy each skill directory
  for skill_dir in "${SCRIPT_DIR}/.claude/skills"/*/; do
    if [ -d "$skill_dir" ]; then
      skill_name="$(basename "$skill_dir")"
      mkdir -p "${TARGET}/.claude/skills/${skill_name}"
      cp -r "${skill_dir}"* "${TARGET}/.claude/skills/${skill_name}/"
      echo "      .claude/skills/${skill_name}/"
    fi
  done
else
  echo "      (no skills directory found in framework -- skipping)"
fi

# --- Merge settings.json ---

echo "[3/4] Configuring settings.json..."

TEMPLATE="${SCRIPT_DIR}/.claude/settings.json"
TARGET_SETTINGS="${TARGET}/.claude/settings.json"

if [ ! -f "$TARGET_SETTINGS" ]; then
  # No existing settings -- copy template directly
  cp "$TEMPLATE" "$TARGET_SETTINGS"
  echo "      Created .claude/settings.json (from template)"
elif command -v jq &>/dev/null; then
  # Existing settings -- merge hooks non-destructively using jq
  # Strategy: add our hook entries to existing arrays, preserving everything else
  TEMP_FILE="${TARGET_SETTINGS}.tmp"

  jq --slurpfile template "$TEMPLATE" '
    # Merge permissions.allow (union)
    .permissions.allow = ((.permissions.allow // []) + ($template[0].permissions.allow // []) | unique) |
    # Merge permissions.deny (union)
    .permissions.deny = ((.permissions.deny // []) + ($template[0].permissions.deny // []) | unique) |
    # Add UserPromptSubmit hooks if not already present
    .hooks.UserPromptSubmit = (
      if (.hooks.UserPromptSubmit // [] | map(.hooks[]?.command) | any(contains("sdlc-hook.js")))
      then .hooks.UserPromptSubmit
      else (.hooks.UserPromptSubmit // []) + ($template[0].hooks.UserPromptSubmit // [])
      end
    ) |
    # Add SubagentStart hooks if not already present
    .hooks.SubagentStart = (
      if (.hooks.SubagentStart // [] | map(.hooks[]?.command) | any(contains("sdlc-hook.js")))
      then .hooks.SubagentStart
      else (.hooks.SubagentStart // []) + ($template[0].hooks.SubagentStart // [])
      end
    )
  ' "$TARGET_SETTINGS" > "$TEMP_FILE"

  mv "$TEMP_FILE" "$TARGET_SETTINGS"
  echo "      Merged hooks into existing .claude/settings.json"
else
  echo "[WARN]  jq not found. Cannot merge settings.json automatically."
  echo "        Your existing .claude/settings.json was preserved."
  echo "        Please manually add the hook entries from:"
  echo "        ${TEMPLATE}"
  echo ""
fi

# --- Create PROJECT-RULES.md placeholder ---

echo "[4/4] Setting up project customization..."

PROJECT_RULES="${TARGET}/.claude/PROJECT-RULES.md"
if [ ! -f "$PROJECT_RULES" ]; then
  cat > "$PROJECT_RULES" << 'RULES_EOF'
# Project Rules

<!-- Add project-specific rules here. These are injected after the framework
     rules on every prompt. Use this file for conventions, constraints, and
     preferences specific to your project.

     Examples:
     - Always use snake_case for database column names
     - All API responses must include a request_id field
     - Tests must not make external network calls
-->
RULES_EOF
  echo "      Created .claude/PROJECT-RULES.md (customize with your project rules)"
else
  echo "      .claude/PROJECT-RULES.md already exists (preserved)"
fi

# --- Summary ---

echo ""
echo "==========================================="
echo "  Installation Complete"
echo "==========================================="
echo ""
echo "Installed:"
echo "  - Hook:  .claude/sdlc/hooks/sdlc-hook.js"
echo "  - Rules: .claude/sdlc/rules/RULES.md"
echo "  -        .claude/sdlc/rules/AGENT-RULES.md"
echo "  - Config: .claude/settings.json"
echo ""
echo "Customization:"
echo "  - .claude/PROJECT-RULES.md  (add project-specific rules)"
echo "  - .claude/sdlc/rules/       (edit framework rules directly)"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code to pick up the new hooks"
echo "  2. Run /setup to detect your project and generate CLAUDE.md"
echo ""
