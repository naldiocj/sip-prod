#!/usr/bin/env bash
set -euo pipefail

schema_file="packages/database/prisma/schema.prisma"

if [[ ! -f "$schema_file" ]]; then
  echo "FALHA: schema Prisma não encontrado: $schema_file" >&2
  exit 1
fi

models=$(awk '/^model / { print $2 }' "$schema_file")
while IFS= read -r model; do
  [[ -z "$model" ]] && continue
  if ! awk -v model="$model" '
    $0 == "model " model " {" { inside=1; next }
    inside && /^model / { exit found ? 0 : 1 }
    inside && /@@map\("[a-z][a-z0-9_]*"\)/ { found=1 }
    inside && /^}/ { exit found ? 0 : 1 }
    END { if (inside) exit found ? 0 : 1 }
  ' "$schema_file"; then
    echo "FALHA: modelo $model não tem @@map snake_case" >&2
    exit 1
  fi
done <<< "$models"

if grep -oE '@@map\("[^"]+"\)' "$schema_file" | grep -vE '@@map\("[a-z][a-z0-9_]*"\)' >/dev/null; then
  echo "FALHA: existe uma tabela fora de snake_case" >&2
  exit 1
fi

if grep -oE '@map\("[^"]+"\)' "$schema_file" | grep -vE '@map\("[a-z][a-z0-9_]*"\)' >/dev/null; then
  echo "FALHA: existe uma coluna fora de snake_case" >&2
  exit 1
fi

if grep -E '^  @@(index|unique)' "$schema_file" | grep -vE 'map: "(idx|uq)_[a-z][a-z0-9_]*"' >/dev/null; then
  echo "FALHA: índice ou constraint sem nome normalizado" >&2
  exit 1
fi

if grep -E '^  @@id' "$schema_file" | grep -vE 'map: "pk_[a-z][a-z0-9_]*"' >/dev/null; then
  echo "FALHA: chave primária composta sem nome pk_ normalizado" >&2
  exit 1
fi

if grep -E '@id\(' "$schema_file" | grep -vE 'map: "pk_[a-z][a-z0-9_]*"' >/dev/null; then
  echo "FALHA: chave primária sem nome pk_ normalizado" >&2
  exit 1
fi

if grep -E '@@index\(' "$schema_file" | grep -vE 'map: "idx_[a-z][a-z0-9_]*"' >/dev/null; then
  echo "FALHA: índice sem nome idx_ normalizado" >&2
  exit 1
fi

echo "OK: nomenclatura Prisma/PostgreSQL normalizada"
