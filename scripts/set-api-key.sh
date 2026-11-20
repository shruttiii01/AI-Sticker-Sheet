#!/usr/bin/env bash
# Securely store an API key in .env (input is hidden, never echoed).
#   ./scripts/set-api-key.sh                  -> ANTHROPIC_API_KEY (Claude, platform.claude.com)
#   ./scripts/set-api-key.sh GEMINI_API_KEY   -> Gemini key (aistudio.google.com)
set -euo pipefail
cd "$(dirname "$0")/.."
VAR="${1:-ANTHROPIC_API_KEY}"
case "$VAR" in
  ANTHROPIC_API_KEY | GEMINI_API_KEY) ;;
  *) echo "Unknown key name: $VAR"; exit 1 ;;
esac
[ -f .env ] || cp .env.example .env
printf "Paste your %s (input hidden) and press Enter: " "$VAR"
read -rs KEY
echo
# Strip whitespace/newlines, and keep only the first copy if the key was pasted twice.
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then echo "No key entered; nothing changed."; exit 1; fi
PREFIX="${KEY:0:8}"
REST="${KEY:8}"
if [[ "$REST" == *"$PREFIX"* ]]; then
  KEY="$PREFIX${REST%%"$PREFIX"*}"
  echo "(Looked like the key was pasted more than once; kept the first copy.)"
fi
grep -v "^${VAR}=" .env > .env.tmp || true
printf '%s="%s"\n' "$VAR" "$KEY" >> .env.tmp
mv .env.tmp .env
chmod 600 .env
echo "Saved $VAR to .env. You can close this tab."
