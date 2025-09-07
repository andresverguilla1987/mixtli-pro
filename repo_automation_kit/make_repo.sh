#!/usr/bin/env bash
set -euo pipefail
# Requisitos: gh CLI autenticado (gh auth login), git, unzip
# Uso: ./make_repo.sh <github_user_or_org> <repo_name> <path_to_superbundle_zip>
USER_ORG="${1:-}"
REPO="${2:-}"
ZIP="${3:-}"
if [[ -z "$USER_ORG" || -z "$REPO" || -z "$ZIP" ]]; then
  echo "Uso: $0 <user|org> <repo> <superbundle.zip>"
  exit 1
fi
if ! command -v gh >/dev/null; then echo "Instala GitHub CLI (gh)"; exit 1; fi
if ! command -v git >/dev/null; then echo "Instala git"; exit 1; fi
if ! command -v unzip >/dev/null; then echo "Instala unzip"; exit 1; fi

WORKDIR="$(pwd)/${REPO}-work"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
unzip -q "$ZIP" -d "$WORKDIR"
cd "$WORKDIR"/mixtli_v8_2

git init
git checkout -b main
git add .
git commit -m "chore: initial commit – Mixtli V8.2 SuperBundle"

# Crea repo remoto y push main
gh repo create "${USER_ORG}/${REPO}" --private --source . --remote origin --push

# Crea rama de bootstrap con un pequeño delta para PR
git checkout -b infra/bootstrap
echo "$(date -u +%FT%TZ) – bootstrap created" > .repo_bootstrap_marker
git add .repo_bootstrap_marker
git commit -m "chore: bootstrap marker + ready-to-merge PR"
git push -u origin infra/bootstrap

# Abre PR
cp -f ../../PR_BODY.md ./PR_BODY.md
gh pr create --base main --head infra/bootstrap --title "Bootstrap: Mixtli V8.2 SuperBundle" --body-file ./PR_BODY.md

echo "✅ Repo creado: https://github.com/${USER_ORG}/${REPO}"
echo "✅ PR abierto contra main desde infra/bootstrap"
