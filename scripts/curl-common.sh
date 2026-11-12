#!/usr/bin/env bash

set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:3001}"
BONDS_URL="${BONDS_URL:-http://localhost:3002}"
PAYMENTS_URL="${PAYMENTS_URL:-http://localhost:3003}"
REFERRALS_URL="${REFERRALS_URL:-http://localhost:3004}"

extract_json() {
  local expression="$1"

  node -e "
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw);
    const value = data${expression};
    if (value === undefined || value === null) {
      process.exit(1);
    }
    console.log(typeof value === 'object' ? JSON.stringify(value) : value);
  } catch (error) {
    process.exit(1);
  }
});
"
}

request() {
  local title="$1"
  local method="$2"
  local url="$3"
  shift 3

  echo
  echo "### ${title}"
  curl -sS -X "${method}" "${url}" \
    -H "Content-Type: application/json" \
    -w '\n[HTTP %{http_code}]\n' \
    "$@"
}

login() {
  local email="$1"
  local password="$2"
  local response

  response=$(curl -sS -X POST "${AUTH_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")

  printf '%s' "${response}" | extract_json '.data.token'
}
