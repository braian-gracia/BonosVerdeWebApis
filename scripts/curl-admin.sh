#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/curl-common.sh"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@bonosverde.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

echo "BonosVerde - modo administrador"
echo "Admin: ${ADMIN_EMAIL}"

TOKEN=$(login "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}")
AUTH_HEADER="Authorization: Bearer ${TOKEN}"

request "Estadísticas generales" GET "${AUTH_URL}/api/admin/stats" -H "${AUTH_HEADER}"
request "Búsqueda de usuarios (inversor)" GET "${AUTH_URL}/api/admin/users?search=inversor" -H "${AUTH_HEADER}"
request "Búsqueda de bonos activos" GET "${AUTH_URL}/api/admin/bonds?search=&status=ACTIVE" -H "${AUTH_HEADER}"
request "Búsqueda de transacciones completadas" GET "${AUTH_URL}/api/admin/transactions?status=COMPLETED" -H "${AUTH_HEADER}"
request "Referidos" GET "${AUTH_URL}/api/admin/referrals" -H "${AUTH_HEADER}"

TEMP_EMAIL="curl-demo-$(date +%s)@bonosverde.com"
request "Registro de usuario temporal (POST)" POST "${AUTH_URL}/api/auth/register" \
  -d "{\"email\":\"${TEMP_EMAIL}\",\"name\":\"Usuario Curl Demo\",\"password\":\"demo12345\"}"

USERS_RESPONSE=$(curl -sS "${AUTH_URL}/api/admin/users?search=${TEMP_EMAIL}" -H "${AUTH_HEADER}")
TEMP_USER_ID=$(printf '%s' "${USERS_RESPONSE}" | extract_json '.data[0].id')

request "Cambio de rol del usuario temporal (PUT)" PUT "${AUTH_URL}/api/admin/users/${TEMP_USER_ID}/role" \
  -H "${AUTH_HEADER}" \
  -d '{"role":"PREMIUM"}'

request "Eliminación del usuario temporal (DELETE)" DELETE "${AUTH_URL}/api/admin/users/${TEMP_USER_ID}" \
  -H "${AUTH_HEADER}"

echo
echo "Modo administrador finalizado."
