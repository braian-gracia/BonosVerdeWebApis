#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/curl-common.sh"

USER_EMAIL="${USER_EMAIL:-inversor@bonosverde.com}"
USER_PASSWORD="${USER_PASSWORD:-inversor123}"

echo "BonosVerde - modo usuario"
echo "Usuario: ${USER_EMAIL}"

TOKEN=$(login "${USER_EMAIL}" "${USER_PASSWORD}")
AUTH_HEADER="Authorization: Bearer ${TOKEN}"

request "Perfil del usuario" GET "${AUTH_URL}/api/auth/profile" -H "${AUTH_HEADER}"
request "Búsqueda en catálogo (oxigeno)" GET "${BONDS_URL}/api/bonds/catalog?search=oxigeno"
request "Compra simulada de bono" POST "${BONDS_URL}/api/bonds/purchase" \
  -H "${AUTH_HEADER}" \
  -d '{"bondType":"OXYGEN","paymentMethod":"SIMULATED"}'
request "Mis bonos" GET "${BONDS_URL}/api/bonds/my-bonds" -H "${AUTH_HEADER}"
request "Mis bonos activos" GET "${BONDS_URL}/api/bonds/my-bonds?status=ACTIVE" -H "${AUTH_HEADER}"
request "Pago simulado" POST "${PAYMENTS_URL}/api/payments/simulate" \
  -H "${AUTH_HEADER}" \
  -d '{"bondType":"FAUNA","paymentMethod":"SIMULATED"}'
request "Mi código CURV" GET "${REFERRALS_URL}/api/referrals/my-code" -H "${AUTH_HEADER}"
request "Estadísticas de referidos" GET "${REFERRALS_URL}/api/referrals/stats" -H "${AUTH_HEADER}"
request "Comisiones" GET "${REFERRALS_URL}/api/referrals/commissions" -H "${AUTH_HEADER}"

echo
echo "Modo usuario finalizado."
