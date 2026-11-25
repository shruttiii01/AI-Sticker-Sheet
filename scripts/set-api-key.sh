#!/usr/bin/env bash
# Securely store GEMINI_API_KEY in .env (input is hidden, never echoed).
# Get a key at https://aistudio.google.com/apikey
set -euo pipefail
cd "$(dirname "$0")/.."
VAR="GEMINI_API_KEY"
[ -f .env ] || cp .env.example .env
printf "Paste your %s (input hidden) and press Enter: " "$VAR"
read -rs KEY
echo
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then echo "No key entered; nothing changed."; exit 1; fi
grep -v "^${VAR}=" .env > .env.tmp || true
printf '%s="%s"\n' "$VAR" "$KEY" >> .env.tmp
mv .env.tmp .env
chmod 600 .env
echo "Saved $VAR to .env. Restart the server."
