#!/usr/bin/env bash
# Securely store your Anthropic API key in .env (input is hidden, never echoed).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env
printf "Paste your ANTHROPIC_API_KEY (input hidden) and press Enter: "
read -rs KEY
echo
if [ -z "$KEY" ]; then echo "No key entered; nothing changed."; exit 1; fi
grep -v '^ANTHROPIC_API_KEY=' .env > .env.tmp || true
printf 'ANTHROPIC_API_KEY="%s"\n' "$KEY" >> .env.tmp
mv .env.tmp .env
chmod 600 .env
echo "Saved to .env. You can close this tab."
