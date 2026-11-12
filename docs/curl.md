# Uso de `curl` en modo usuario y administrador

Todos los ejemplos usan los puertos publicados por `docker-compose.yml`.

| Servicio | URL |
| --- | --- |
| Auth | `http://localhost:3001` |
| Bonds | `http://localhost:3002` |
| Payments | `http://localhost:3003` |
| Referrals | `http://localhost:3004` |
| Keycloak (OIDC) | `http://localhost:8080/realms/bonosverde` |

Los ejemplos de login siguen funcionando porque `auth-service` actua como proxy de Keycloak usando el cliente `bonosverde-cli`. El token devuelto es un access token de Keycloak y debe enviarse igual como `Authorization: Bearer <token>`.

## Scripts listos para ejecutar

En Git Bash / WSL / Linux / macOS:

```bash
bash scripts/curl-user.sh
bash scripts/curl-admin.sh
```

Los scripts permiten cambiar las URLs y credenciales con variables de entorno:

```bash
AUTH_URL=http://localhost:3001 \
USER_EMAIL=inversor@bonosverde.com \
USER_PASSWORD=inversor123 \
bash scripts/curl-user.sh
```

## Modo usuario (Bash)

```bash
AUTH_URL=http://localhost:3001

LOGIN=$(curl -s -X POST "$AUTH_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"inversor@bonosverde.com","password":"inversor123"}')

TOKEN=$(printf '%s' "$LOGIN" | node -e "
let raw='';
process.stdin.on('data', (chunk) => raw += chunk);
process.stdin.on('end', () => console.log(JSON.parse(raw).data.token));
")

# GET: perfil
curl -s "$AUTH_URL/api/auth/profile" \
  -H "Authorization: Bearer $TOKEN"

# GET: búsqueda en el catálogo
curl -s "http://localhost:3002/api/bonds/catalog?search=oxigeno"

# POST: compra de bono
curl -s -X POST "http://localhost:3002/api/bonds/purchase" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bondType":"OXYGEN","paymentMethod":"SIMULATED"}'

# GET: mis bonos
curl -s "http://localhost:3002/api/bonds/my-bonds?status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"

# GET: referidos
curl -s "http://localhost:3004/api/referrals/stats" \
  -H "Authorization: Bearer $TOKEN"
```

## Modo administrador (Bash)

```bash
AUTH_URL=http://localhost:3001

LOGIN=$(curl -s -X POST "$AUTH_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bonosverde.com","password":"admin123"}')

TOKEN=$(printf '%s' "$LOGIN" | node -e "
let raw='';
process.stdin.on('data', (chunk) => raw += chunk);
process.stdin.on('end', () => console.log(JSON.parse(raw).data.token));
")

# GET: estadísticas
curl -s "$AUTH_URL/api/admin/stats" \
  -H "Authorization: Bearer $TOKEN"

# GET: búsqueda de usuarios
curl -s "$AUTH_URL/api/admin/users?search=inversor" \
  -H "Authorization: Bearer $TOKEN"

# GET: búsqueda de bonos
curl -s "$AUTH_URL/api/admin/bonds?search=&status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"

# GET: búsqueda de transacciones
curl -s "$AUTH_URL/api/admin/transactions?status=COMPLETED" \
  -H "Authorization: Bearer $TOKEN"

# PUT: cambiar rol del usuario con id 2
curl -s -X PUT "$AUTH_URL/api/admin/users/2/role" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role":"PREMIUM"}'

# DELETE: eliminar un usuario no administrador con id 3
curl -s -X DELETE "$AUTH_URL/api/admin/users/3" \
  -H "Authorization: Bearer $TOKEN"
```

> No uses el `DELETE` sobre los usuarios seed si vas a seguir probando el sistema.
> El script `scripts/curl-admin.sh` crea un usuario temporal y lo elimina al final.

## Modo usuario y administrador (PowerShell)

```powershell
$login = curl.exe -s -X POST "http://localhost:3001/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"inversor@bonosverde.com","password":"inversor123"}' |
  ConvertFrom-Json

$token = $login.data.token

curl.exe -s "http://localhost:3001/api/auth/profile" `
  -H "Authorization: Bearer $token"

curl.exe -s "http://localhost:3002/api/bonds/catalog?search=fauna"
```

```powershell
$login = curl.exe -s -X POST "http://localhost:3001/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@bonosverde.com","password":"admin123"}' |
  ConvertFrom-Json

$adminToken = $login.data.token

curl.exe -s "http://localhost:3001/api/admin/stats" `
  -H "Authorization: Bearer $adminToken"

curl.exe -s "http://localhost:3001/api/admin/users?search=inversor" `
  -H "Authorization: Bearer $adminToken"
```

## Token directo de Keycloak (opcional)

Para obtener un token sin pasar por `auth-service`:

```bash
curl -s -X POST "http://localhost:8080/realms/bonosverde/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=bonosverde-cli" \
  -d "client_secret=bonosverde-cli-secret-2026" \
  -d "username=inversor@bonosverde.com" \
  -d "password=inversor123" \
  -d "scope=openid profile email"
```

El token resultante incluye `aud: bonosverde-api` y `realm_access.roles`.

## Renovación del token

El access token de Keycloak expira segun la configuracion del realm. Para renovarlo:

```bash
curl -s -X POST "http://localhost:3001/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"PEGA_AQUI_EL_REFRESH_TOKEN"}'
```
