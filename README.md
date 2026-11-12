# BonosVerde - Plataforma de Bonos Intangibles

Sistema de venta de bonos intangibles (Oxigeno, Fauna, Carbono24 e Hidrogeno Verde) con arquitectura de microservicios, frontend React, Keycloak (OIDC/OAuth2) y despliegue con Docker.

## Arquitectura

```text
proyecto/
├── frontend/                    # React + Vite + Tailwind (Nginx en Docker)
├── microservices/
│   ├── auth-service/            # Autenticación, perfil y panel admin (3001)
│   ├── bonds-service/           # Catálogo, compra, QR y redención (3002)
│   ├── payment-service/         # Pagos simulados PayPal/ePayco (3003)
│   └── referral-service/        # Referidos y comisiones CURV (3004)
├── database/
│   ├── schema.sql               # Schema MySQL
│   └── seed.sql                 # Usuarios de prueba
├── postman/                     # Colección y environment REST
├── scripts/                     # Scripts curl para usuario y admin
├── docs/curl.md                 # Ejemplos detallados de curl
├── docker-compose.yml
└── .env.example
```

## Requisitos cumplidos

1. **Docker**: `docker-compose.yml` + un `Dockerfile` en cada microservicio y en el frontend.
2. **curl**: scripts y documentación para consultas en modo usuario y administrador.
3. **Postman**: colección con operaciones `POST`, `GET`, `PUT` y `DELETE`.
4. **Seguridad**: Keycloak OIDC/OAuth2 (Authorization Code + PKCE), validación RS256 por JWKS, roles, Helmet, rate limiting, CORS y validación con Zod.

## Inicio rápido con Docker

Requisitos: Docker Desktop con Docker Compose.

```bash
# Opcional: personalizar variables
cp .env.example .env

# Construir y levantar todo
docker compose up --build -d

# Ver estado y logs
docker compose ps
docker compose logs -f
```

En Windows también puedes ejecutar `docker-up.bat` y `docker-down.bat`.

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:8080 |
| Auth API | http://localhost:3001 |
| Bonds API | http://localhost:3002 |
| Payments API | http://localhost:3003 |
| Referrals API | http://localhost:3004 |
| MySQL | localhost:3306 |
| Keycloak | http://localhost:8085 (admin) / http://localhost:8080/realms/bonosverde (OIDC) |

Para detener el sistema:

```bash
docker compose down
```

Para borrar también la base de datos y volver a ejecutar los seeds:

```bash
docker compose down -v
docker compose up --build -d
```

## Usuarios de prueba

| Email | Contraseña | Rol |
| --- | --- | --- |
| admin@bonosverde.com | admin123 | ADMIN |
| inversor@bonosverde.com | inversor123 | INVESTOR |
| premium@bonosverde.com | inversor123 | PREMIUM |

## Seguridad con Keycloak (OIDC/OAuth2)

- Keycloak es la fuente de identidad del sistema. El realm es `bonosverde` y el audience de las APIs es `bonosverde-api`.
- El frontend usa el cliente público `bonosverde-web` con Authorization Code + PKCE.
- Los microservicios validan el access token RS256 contra JWKS, el issuer y el audience `bonosverde-api`.
- `POST /api/auth/login` y `POST /api/auth/refresh` se mantienen por compatibilidad y usan el cliente confidencial `bonosverde-cli` contra Keycloak.
- El access token debe enviarse como `Authorization: Bearer <token>`.
- El frontend renueva la sesión con `keycloak-js` antes de que expire el token.
- Los endpoints `/api/admin/*` requieren rol `ADMIN`; el cambio de rol y la eliminación de usuarios se sincronizan con Keycloak.
- El registro crea el usuario en Keycloak y en la base local. El auth-service usa el cliente de servicio `bonosverde-admin` para el Admin API.
- Helmet agrega cabeceras de seguridad y el login/registro tienen rate limiting.

### Clientes y usuarios de Keycloak

| Cliente | Tipo | Uso |
| --- | --- | --- |
| `bonosverde-web` | Público, PKCE | Login del frontend |
| `bonosverde-cli` | Confidencial, direct grant | Compatibilidad `/api/auth/login` y `/api/auth/refresh` |
| `bonosverde-admin` | Confidencial, service account | Admin API de Keycloak |

Consola de administración: http://localhost:8085 con `admin` / `admin`.

## Uso de curl

Guía completa: [`docs/curl.md`](docs/curl.md).

```bash
# Modo usuario: login, perfil, catálogo, compra, mis bonos y referidos
bash scripts/curl-user.sh

# Modo administrador: stats, búsquedas, cambio de rol y DELETE
bash scripts/curl-admin.sh
```

Windows CMD:

```bat
scripts\curl-user.bat
scripts\curl-admin.bat
```

Ejemplo mínimo:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bonosverde.com","password":"admin123"}' |
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")

curl -s http://localhost:3001/api/admin/users?search=inversor \
  -H "Authorization: Bearer $TOKEN"
```

## Uso de Postman

1. Importar `postman/BonosVerde.postman_collection.json`.
2. Importar `postman/BonosVerde.postman_environment.json`.
3. Seleccionar el environment **BonosVerde - Docker**.
4. Ejecutar primero **Auth → Login usuario** y **Auth → Login administrador**.
5. Los scripts de Postman guardan automáticamente `token`, `adminToken`, `refreshToken`, `bondId`, `transactionId` y `tempUserId`.

La colección incluye:

- Auth: registro, login usuario/admin, refresh, perfil y cambio de contraseña.
- Bonos: catálogo, búsqueda, compra, mis bonos, QR y redención.
- Pagos: simulación y consulta de estado.
- Referidos: código CURV, estadísticas, aplicación de código y comisiones.
- Admin: estadísticas, búsquedas, cambio de rol, registro temporal y `DELETE`.

## Endpoints principales

| Método | Endpoint | Rol | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Público | Registro |
| POST | `/api/auth/login` | Público | Login |
| POST | `/api/auth/refresh` | Público | Renovar token de Keycloak |
| GET | `/api/auth/profile` | Usuario | Perfil |
| PUT | `/api/auth/profile` | Usuario | Actualizar perfil |
| PUT | `/api/auth/change-password` | Usuario | Cambiar contraseña |
| GET | `/api/bonds/catalog?search=` | Público | Catálogo y búsqueda |
| POST | `/api/bonds/purchase` | Usuario | Comprar bono |
| GET | `/api/bonds/my-bonds?status=` | Usuario | Mis bonos |
| GET | `/api/bonds/:id` | Usuario | Detalle |
| GET | `/api/bonds/:id/qr` | Usuario | QR |
| POST | `/api/bonds/:id/redeem` | Usuario | Redimir |
| POST | `/api/payments/simulate` | Usuario | Pago simulado |
| GET | `/api/payments/:id/status` | Usuario | Estado del pago |
| GET | `/api/referrals/my-code` | Usuario | Código CURV |
| GET | `/api/referrals/stats` | Usuario | Estadísticas |
| POST | `/api/referrals/apply` | Usuario | Aplicar código |
| GET | `/api/referrals/commissions` | Usuario | Comisiones |
| GET | `/api/admin/stats` | Admin | Estadísticas |
| GET | `/api/admin/users?search=&role=` | Admin | Usuarios |
| PUT | `/api/admin/users/:id/role` | Admin | Cambiar rol |
| DELETE | `/api/admin/users/:id` | Admin | Eliminar usuario |
| GET | `/api/admin/bonds?search=&status=` | Admin | Bonos |
| GET | `/api/admin/transactions?search=&status=` | Admin | Transacciones |
| GET | `/api/admin/referrals?search=` | Admin | Referidos |

## Desarrollo local sin Docker

Requisitos: Node.js 18+, MySQL 8, Keycloak 26 y npm.

La forma mas sencilla de levantar Keycloak en desarrollo es con Docker Compose:

```bash
docker compose up -d keycloak keycloak-init
```

Keycloak queda en http://localhost:8085 y el issuer OIDC en `http://localhost:8080/realms/bonosverde`.

```bash
# 1. Crear e importar la base de datos
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bonos_db;"
mysql -u root -p bonos_db < database/schema.sql
mysql -u root -p bonos_db < database/seed.sql

# 2. Instalar dependencias y generar Prisma
cd microservices/auth-service && npm install && npx prisma generate && cd ../..
cd microservices/bonds-service && npm install && npx prisma generate && cd ../..
cd microservices/payment-service && npm install && npx prisma generate && cd ../..
cd microservices/referral-service && npm install && npx prisma generate && cd ../..
cd frontend && npm install && cd ..

# 3. Configurar .env de cada microservicio (usar .env.example)
# 4. Iniciar cada servicio en una terminal
cd microservices/auth-service && npm run dev
cd microservices/bonds-service && npm run dev
cd microservices/payment-service && npm run dev
cd microservices/referral-service && npm run dev
cd frontend && npm run dev
```

El frontend de desarrollo queda en http://localhost:5173 y usa el proxy de Vite hacia los puertos 3001-3004.

## Variables de entorno

Cada microservicio incluye `.env.example`. Las principales variables son:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/bonos_db"
KEYCLOAK_JWKS_URI="http://localhost:8080/realms/bonosverde/protocol/openid-connect/certs"
KEYCLOAK_ISSUER="http://localhost:8080/realms/bonosverde"
KEYCLOAK_AUDIENCE="bonosverde-api"
KEYCLOAK_REALM="bonosverde"
KEYCLOAK_ADMIN_URL="http://localhost:8080"
KEYCLOAK_ADMIN_CLIENT_ID="bonosverde-admin"
KEYCLOAK_ADMIN_CLIENT_SECRET="bonosverde-admin-secret-2026"
KEYCLOAK_CLI_CLIENT_ID="bonosverde-cli"
KEYCLOAK_CLI_CLIENT_SECRET="bonosverde-cli-secret-2026"
PORT=3001
CORS_ORIGIN="http://localhost:5173,http://localhost:8080"
```

`docker-compose.yml` toma los valores desde `.env` o usa valores por defecto de desarrollo.

## Base de datos

- **users**: usuarios, rol, código CURV y total invertido.
- **bonds**: bonos emitidos, código único, QR y estado.
- **transactions**: pagos y estado de la transacción.
- **referrals**: referidor, referido, tasa y comisión acumulada.
- **verification_codes**: códigos de verificación/2FA.

Los cuatro microservicios comparten el mismo schema MySQL y usan los mismos enums de Prisma.

## Comandos útiles

```bash
# Compilar backend
cd microservices/auth-service && npm run build
cd microservices/bonds-service && npm run build
cd microservices/payment-service && npm run build
cd microservices/referral-service && npm run build

# Compilar frontend
cd frontend && npm run build

# Regenerar Prisma después de cambiar un schema
cd microservices/auth-service && npx prisma generate
```

## Notas

- `docker compose down -v` elimina el volumen de MySQL; los scripts de `database/` se ejecutan solo al crear un volumen nuevo.
- Si cambias el schema de Prisma, actualiza también `database/schema.sql` para que Docker y el desarrollo local usen la misma estructura.
- No publiques los archivos `.env` con secretos reales; usa `.env.example` como plantilla.
- Keycloak usa un issuer fijo (`KC_HOSTNAME`). En Docker Compose es `http://localhost:8080/realms/bonosverde`; en Kubernetes es `http://bonosverde.local/realms/bonosverde`.
- El issuer lo fija `KC_HOSTNAME`, no el puerto por el que accedas. En Docker Compose siempre es `http://localhost:8080/realms/bonosverde`, aunque consultes Keycloak directamente en `http://localhost:8085`. El JWKS local puede usar `http://localhost:8085/realms/bonosverde/protocol/openid-connect/certs`.
- El contenedor `keycloak-init` asigna al service account `bonosverde-admin` los roles `manage-users`, `view-users`, `query-users` y `view-realm` de `realm-management`.
- La base H2 de Keycloak en Docker Compose vive dentro del contenedor. Si recreas el contenedor, el realm se vuelve a importar desde `keycloak/realm-bonosverde.json`.
- Nginx resuelve `keycloak` al iniciar. Si recreas solo el contenedor de Keycloak, ejecuta `docker compose restart frontend` para que tome la nueva IP. En Kubernetes no aplica porque el Service tiene IP estable.
