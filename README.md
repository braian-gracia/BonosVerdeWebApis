# BonosVerde - Plataforma de Bonos Intangibles

Sistema de venta de bonos intangibles (Oxigeno, Fauna, Carbono24 e Hidrogeno Verde) con arquitectura de microservicios, frontend React, Keycloak (OIDC/OAuth2), MySQL y despliegue con Docker Compose o Kubernetes.

---

## Tabla de contenidos

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Inicio rapido con Docker Compose](#inicio-rapido-con-docker-compose)
4. [Usuarios de prueba](#usuarios-de-prueba)
5. [Seguridad con Keycloak](#seguridad-con-keycloak)
6. [Despliegue en Kubernetes](#despliegue-en-kubernetes)
7. [Desarrollo local sin Docker](#desarrollo-local-sin-docker)
8. [Variables de entorno](#variables-de-entorno)
9. [Base de datos](#base-de-datos)
10. [Uso de curl](#uso-de-curl)
11. [Uso de Postman](#uso-de-postman)
12. [Endpoints principales](#endpoints-principales)
13. [Comandos utiles](#comandos-utiles)
14. [CI/CD con GitHub Actions](#cicd-con-github-actions)
15. [Notas](#notas)

---

## Arquitectura

```text
proyecto/
├── frontend/                    # React + Vite + Tailwind (Nginx en Docker)
├── microservices/
│   ├── auth-service/            # Autenticacion, perfil y panel admin (3001)
│   ├── bonds-service/           # Catalogo, compra, QR y redencion (3002)
│   ├── payment-service/         # Pagos simulados PayPal/ePayco (3003)
│   └── referral-service/        # Referidos y comisiones CURV (3004)
├── database/
│   ├── schema.sql               # Schema MySQL
│   └── seed.sql                 # Usuarios de prueba
├── keycloak/
│   └── realm-bonosverde.json    # Realm, clientes y usuarios de Keycloak
├── k8s/                         # Manifiestos de Kubernetes + scripts
├── postman/                     # Coleccion y environment REST
├── scripts/                     # Scripts curl y despliegue CI
├── docs/curl.md                 # Ejemplos detallados de curl
├── docs/ci-cd.md                # Guia del pipeline GitHub Actions
├── .github/workflows/ci-cd.yml  # Pipeline: verify + build-push + deploy-local
├── docker-compose.yml
└── .env.example
```

### Componentes y puertos

| Servicio | Docker Compose | Kubernetes | Descripcion |
| --- | --- | --- | --- |
| Frontend | `http://localhost:8080` | `http://bonosverde.local` | SPA React servida por Nginx |
| Auth API | `http://localhost:3001` | `/api/auth`, `/api/admin` | Autenticacion y administracion |
| Bonds API | `http://localhost:3002` | `/api/bonds` | Catalogo, compra, QR y redencion |
| Payments API | `http://localhost:3003` | `/api/payments` | Pagos simulados |
| Referrals API | `http://localhost:3004` | `/api/referrals` | Referidos y comisiones |
| MySQL | `localhost:3307` | `mysql:3306` (ClusterIP) | Base de datos compartida |
| Keycloak | `http://localhost:8085` | `/realms`, `/resources` (Ingress) | Identidad OIDC/OAuth2 |

En Kubernetes, todos los servicios se comunican por nombre DNS dentro del namespace `bonosverde` (`mysql`, `auth-service`, `bonds-service`, `payment-service`, `referral-service`, `keycloak`).

---

## Requisitos

- Docker Desktop **iniciado** (con Docker Compose). Tener el CLI `docker` instalado no basta: el motor debe estar corriendo.
- Node.js 18+ y npm (solo para desarrollo local sin Docker).
- MySQL 8 (solo para desarrollo local sin Docker).
- `kubectl` (solo para Kubernetes).
- Cluster local: Docker Desktop con Kubernetes habilitado, kind o minikube.

---

## Inicio rapido con Docker Compose

```bash
# Opcional: personalizar variables
cp .env.example .env

# Construir y levantar todo
docker compose up --build -d

# Ver estado y logs
docker compose ps
docker compose logs -f

# Detener
docker compose down

# Detener y borrar la base de datos (se re-ejecutan los seeds al volver a subir)
docker compose down -v
```

En Windows tambien puedes usar `docker-up.bat` y `docker-down.bat`.

### Si Docker no responde: `failed to connect to the docker API`

El error:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

significa que **Docker Desktop no esta corriendo** o que su motor Linux no inicio. No significa que `docker-compose.yml` este mal.

En PowerShell, inicia Docker Desktop:

```powershell
Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
```

Espera uno o dos minutos hasta que `docker info` muestre tambien la seccion `Server`:

```powershell
docker info
docker context ls
```

El contexto activo debe ser `desktop-linux`.

Si Docker Desktop ya estaba abierto pero el error persiste:

1. Clic derecho en el icono de Docker → **Switch to Linux containers**. El proyecto usa imagenes Linux.
2. Reinicia WSL y vuelve a abrir Docker Desktop:

```powershell
wsl --shutdown
Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
```

3. Verifica que WSL2 este activo:

```powershell
wsl -l -v
```

La distro `docker-desktop` debe aparecer con `VERSION 2`. El aviso `WSL1 no es compatible con la configuracion actual` es informativo; no es la causa del error cuando la distro ya es WSL2.

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:8080 |
| Auth API | http://localhost:3001 |
| Bonds API | http://localhost:3002 |
| Payments API | http://localhost:3003 |
| Referrals API | http://localhost:3004 |
| Keycloak (admin) | http://localhost:8085 |
| MySQL | localhost:3307 |

---

## Usuarios de prueba

| Email | Contrasena | Rol |
| --- | --- | --- |
| admin@bonosverde.com | admin123 | ADMIN |
| inversor@bonosverde.com | inversor123 | INVESTOR |
| premium@bonosverde.com | inversor123 | PREMIUM |

Los usuarios existen tanto en MySQL (`database/seed.sql`) como en Keycloak (`keycloak/realm-bonosverde.json`).

---

## Seguridad con Keycloak

- Keycloak es la fuente de identidad del sistema. El realm es `bonosverde` y el audience de las APIs es `bonosverde-api`.
- El frontend usa el cliente publico `bonosverde-web` con Authorization Code + PKCE.
- Los microservicios validan el access token RS256 contra JWKS, el issuer y el audience `bonosverde-api`.
- `POST /api/auth/login` y `POST /api/auth/refresh` se mantienen por compatibilidad y usan el cliente confidencial `bonosverde-cli` contra Keycloak.
- El access token debe enviarse como `Authorization: Bearer <token>`.
- El frontend renueva la sesion con `keycloak-js` antes de que expire el token.
- Los endpoints `/api/admin/*` requieren rol `ADMIN`; el cambio de rol y la eliminacion de usuarios se sincronizan con Keycloak.
- El registro crea el usuario en Keycloak y en la base local. El auth-service usa el cliente de servicio `bonosverde-admin` para el Admin API.
- Helmet agrega cabeceras de seguridad y el login/registro tienen rate limiting.

### Clientes y usuarios de Keycloak

| Cliente | Tipo | Uso |
| --- | --- | --- |
| `bonosverde-web` | Publico, PKCE | Login del frontend |
| `bonosverde-cli` | Confidencial, direct grant | Compatibilidad `/api/auth/login` y `/api/auth/refresh` |
| `bonosverde-admin` | Confidencial, service account | Admin API de Keycloak |

Consola de administracion en Docker Compose: http://localhost:8085 con `admin` / `admin`.

---

## Despliegue en Kubernetes

El despliegue completo (MySQL + Keycloak + 4 microservicios + frontend) se define en `k8s/` y se orquesta con `k8s/deploy.ps1`.

### 1. Requisitos y preparacion

- Docker Desktop con Kubernetes habilitado, o kind/minikube.
- `kubectl` configurado contra el cluster.
- Controlador `nginx-ingress` instalado.

```powershell
# Verificar cluster
kubectl cluster-info
kubectl get nodes
kubectl config current-context
```

### 2. Instalar nginx-ingress

Docker Desktop:

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/cloud/deploy.yaml
```

kind:

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
```

minikube:

```powershell
minikube addons enable ingress
```

Esperar a que el controlador quede listo:

```powershell
kubectl wait --namespace ingress-nginx --for=condition=Ready pod `
  --selector=app.kubernetes.io/component=controller --timeout=180s
```

### 3. Archivo hosts

Agrega el host `bonosverde.local` apuntando al cluster. En Windows edita `C:\Windows\System32\drivers\etc\hosts` como administrador:

```text
127.0.0.1 bonosverde.local
```

En PowerShell como administrador:

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 bonosverde.local"
```

- Docker Desktop: `127.0.0.1` funciona.
- minikube: usa `minikube ip` (o ejecuta `minikube tunnel`).
- kind: usa `127.0.0.1` si el cluster se creo con mapeo de puertos 80/443.

### 4. Desplegar

Antes de desplegar, si tienes el stack de Docker Compose levantado, detenlo para evitar entornos duplicados:

```powershell
docker compose down
```

Desde la raiz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File k8s\deploy.ps1
```

El script:

1. Construye las imagenes `bonosverde/*:latest`.
2. Las carga al cluster si detecta kind o minikube (Docker Desktop comparte el daemon).
3. Aplica namespace, ConfigMaps y crea el Secret `bonosverde-secrets` (toma valores de `.env` si existe).
4. Despliega MySQL y espera a que este listo.
5. Crea el ConfigMap del realm de Keycloak desde `keycloak/realm-bonosverde.json`.
6. Despliega Keycloak, espera el rollout y ejecuta el Job `keycloak-realm-setup` para asignar permisos al service account.
7. Despliega microservicios y frontend, esperando cada rollout.
8. Aplica el Ingress.

Para no reconstruir imagenes:

```powershell
powershell -ExecutionPolicy Bypass -File k8s\deploy.ps1 -SkipBuild
```

### 5. Verificar

```powershell
kubectl get pods,svc,ingress -n bonosverde
kubectl logs -n bonosverde deployment/keycloak --tail=50
kubectl logs -n bonosverde deployment/auth-service --tail=50
kubectl logs -n bonosverde job/keycloak-realm-setup
```

Estado esperado: todos los pods `Running 1/1`, el Job de Keycloak en `Complete` y el Ingress con `ADDRESS` asignado.

Prueba de API a traves del Ingress:

```powershell
curl.exe http://bonosverde.local/api/auth/health
curl.exe http://bonosverde.local/api/bonds/health
curl.exe http://bonosverde.local/api/payments/health
curl.exe http://bonosverde.local/api/referrals/health
curl.exe http://bonosverde.local/realms/bonosverde/.well-known/openid-configuration
```

La ultima llamada debe devolver **JSON** con `"issuer": "http://bonosverde.local/realms/bonosverde"`. Si devuelve HTML del frontend, Keycloak no esta enrutado (ver [problemas conocidos](#7-problemas-conocidos-y-soluciones)).

### 6. Acceder

- Aplicacion: http://bonosverde.local
- Keycloak (consola de administracion):

```powershell
kubectl port-forward svc/keycloak 8085:8080 -n bonosverde
```

Luego abre http://localhost:8085 con `admin` / `admin`.

### 7. Problemas conocidos y soluciones

#### `/realms` devuelve el HTML del frontend en vez de JSON

Causa: el Ingress se aplico cuando el Service `keycloak` no existia y la regla de `/realms` quedo sin backend valido. Solucion:

```powershell
# Confirmar que Keycloak y su Service existen
kubectl get deploy,svc -n bonosverde -l app=keycloak

# Reaplicar el Ingress
kubectl apply -f k8s/40-ingress.yaml

# Verificar
curl.exe -s -o NUL -w "%{http_code} %{content_type}`n" `
  http://bonosverde.local/realms/bonosverde/.well-known/openid-configuration
```

`deploy.ps1` aplica el Ingress al final, por lo que un despliegue completo evita este problema.

#### Keycloak no arranca: `couldn't find key KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD`

Causa: el Secret `bonosverde-secrets` viene de un despliegue anterior y no tiene las claves de Keycloak. Verifica las claves existentes:

```powershell
$s = kubectl get secret bonosverde-secrets -n bonosverde -o json | ConvertFrom-Json
$s.data.PSObject.Properties.Name
```

Debe contener:

- `KEYCLOAK_ADMIN_CLIENT_SECRET`
- `KEYCLOAK_CLI_CLIENT_SECRET`
- `KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD`

Solucion recomendada: volver a ejecutar `deploy.ps1` (recrea el Secret con todas las claves). Alternativa puntual:

```powershell
@'
{
  "stringData": {
    "KEYCLOAK_ADMIN_CLIENT_SECRET": "bonosverde-admin-secret-2026",
    "KEYCLOAK_CLI_CLIENT_SECRET": "bonosverde-cli-secret-2026",
    "KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD": "admin"
  }
}
'@ | Set-Content -Path "$env:TEMP\keycloak-secret-patch.json" -Encoding utf8

kubectl patch secret bonosverde-secrets -n bonosverde `
  --type merge --patch-file "$env:TEMP\keycloak-secret-patch.json"

kubectl rollout restart deployment/keycloak -n bonosverde
kubectl rollout status deployment/keycloak -n bonosverde --timeout=300s
```

#### El frontend no refleja una imagen nueva

Causa: los manifiestos usan `image: bonosverde/frontend:latest` con `imagePullPolicy: IfNotPresent`. Si reconstruyes con la misma etiqueta, el nodo puede conservar la imagen anterior. Soluciones:

```powershell
# Opcion A: forzar un rollout (funciona si el nodo comparte la imagen nueva)
kubectl rollout restart deployment/frontend -n bonosverde

# Opcion B (mas fiable): usar una etiqueta nueva
docker build -t bonosverde/frontend:20261112 frontend
kubectl set image deployment/frontend frontend=bonosverde/frontend:20261112 -n bonosverde
kubectl rollout status deployment/frontend -n bonosverde --timeout=180s
```

Verifica que el contenedor tenga la configuracion esperada:

```powershell
kubectl exec -n bonosverde deployment/frontend -- `
  grep -n "realms\|resources" /etc/nginx/conf.d/default.conf
```

#### Pods reinician una vez al arrancar el cluster

Es normal tras reiniciar Docker Desktop: CoreDNS y los Services pueden tardar unos segundos. Si los pods quedan `Running 1/1` y los probes responden, no requiere accion.

#### Reiniciar la base de datos

Los scripts `01-schema.sql` y `02-seed.sql` solo se ejecutan cuando el volumen de MySQL esta vacio. Para reinicializar:

```powershell
kubectl delete pvc data-mysql-0 -n bonosverde
kubectl delete pod mysql-0 -n bonosverde
kubectl rollout status statefulset/mysql -n bonosverde --timeout=300s
```

#### Verificacion de login end-to-end

```powershell
$body = '{"email":"admin@bonosverde.com","password":"admin123"}'
$login = Invoke-RestMethod -Method POST -Uri "http://bonosverde.local/api/auth/login" `
  -ContentType "application/json" -Body $body
$token = $login.data.token
Invoke-RestMethod -Method GET -Uri "http://bonosverde.local/api/auth/profile" `
  -Headers @{ Authorization = "Bearer $token" }
```

Debe devolver el perfil con `email = admin@bonosverde.com` y `role = ADMIN`.

### 8. Teardown

```powershell
powershell -ExecutionPolicy Bypass -File k8s\teardown.ps1
```

Esto elimina el namespace `bonosverde` (incluido el PVC con los datos) y las imagenes locales `bonosverde/*`. Usa `-KeepImages` para conservar las imagenes.

### Estructura de `k8s/`

```text
k8s/
├── 00-namespace.yaml       # Namespace bonosverde
├── 01-config.yaml          # ConfigMap de app + scripts SQL de inicializacion
├── 02-secret.example.yaml  # Plantilla de Secret (referencia)
├── 10-mysql.yaml           # Service + StatefulSet + PVC
├── 15-keycloak.yaml        # Keycloak + Service + Job de permisos
├── 20-auth-service.yaml    # Deployment + Service (3001)
├── 21-bonds-service.yaml   # Deployment + Service (3002)
├── 22-payment-service.yaml # Deployment + Service (3003)
├── 23-referral-service.yaml# Deployment + Service (3004)
├── 30-frontend.yaml        # Deployment + Service (80)
├── 40-ingress.yaml         # Ingress nginx (host bonosverde.local)
├── deploy.ps1
└── teardown.ps1
```

---

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

En Windows puedes usar `install-all.bat` para instalar dependencias y `start-all.bat` para arrancar los procesos.

---

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

`docker-compose.yml` y `k8s/deploy.ps1` toman los valores desde `.env` o usan valores por defecto de desarrollo.

Variables adicionales por servicio:

- `payment-service`: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `EPAYCO_PUBLIC_KEY`, `EPAYCO_PRIVATE_KEY`, `EPAYCO_CUST_ID`.
- `frontend`: `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`.

---

## Base de datos

- **users**: usuarios, rol, codigo CURV y total invertido.
- **bonds**: bonos emitidos, codigo unico, QR y estado.
- **transactions**: pagos y estado de la transaccion.
- **referrals**: referidor, referido, tasa y comision acumulada.
- **verification_codes**: codigos de verificacion/2FA.

Los cuatro microservicios comparten el mismo schema MySQL y usan los mismos enums de Prisma.

---

## Uso de curl

Guia completa: [`docs/curl.md`](docs/curl.md).

```bash
# Modo usuario: login, perfil, catalogo, compra, mis bonos y referidos
bash scripts/curl-user.sh

# Modo administrador: stats, busquedas, cambio de rol y DELETE
bash scripts/curl-admin.sh
```

Windows CMD:

```bat
scripts\curl-user.bat
scripts\curl-admin.bat
```

Ejemplo minimo:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bonosverde.com","password":"admin123"}' |
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")

curl -s http://localhost:3001/api/admin/users?search=inversor \
  -H "Authorization: Bearer $TOKEN"
```

---

## Uso de Postman

1. Importar `postman/BonosVerde.postman_collection.json`.
2. Importar `postman/BonosVerde.postman_environment.json`.
3. Seleccionar el environment **BonosVerde - Docker** (o ajustar la `baseUrl` a `http://bonosverde.local` para Kubernetes).
4. Ejecutar primero **Auth -> Login usuario** y **Auth -> Login administrador**.
5. Los scripts de Postman guardan automaticamente `token`, `adminToken`, `refreshToken`, `bondId`, `transactionId` y `tempUserId`.

La coleccion incluye:

- Auth: registro, login usuario/admin, refresh, perfil y cambio de contrasena.
- Bonos: catalogo, busqueda, compra, mis bonos, QR y redencion.
- Pagos: simulacion y consulta de estado.
- Referidos: codigo CURV, estadisticas, aplicacion de codigo y comisiones.
- Admin: estadisticas, busquedas, cambio de rol, registro temporal y `DELETE`.

---

## Endpoints principales

| Metodo | Endpoint | Rol | Descripcion |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Publico | Registro |
| POST | `/api/auth/login` | Publico | Login |
| POST | `/api/auth/refresh` | Publico | Renovar token de Keycloak |
| GET | `/api/auth/profile` | Usuario | Perfil |
| PUT | `/api/auth/profile` | Usuario | Actualizar perfil |
| PUT | `/api/auth/change-password` | Usuario | Cambiar contrasena |
| GET | `/api/bonds/catalog?search=` | Publico | Catalogo y busqueda |
| POST | `/api/bonds/purchase` | Usuario | Comprar bono |
| GET | `/api/bonds/my-bonds?status=` | Usuario | Mis bonos |
| GET | `/api/bonds/:id` | Usuario | Detalle |
| GET | `/api/bonds/:id/qr` | Usuario | QR |
| POST | `/api/bonds/:id/redeem` | Usuario | Redimir |
| POST | `/api/payments/simulate` | Usuario | Pago simulado |
| GET | `/api/payments/:id/status` | Usuario | Estado del pago |
| GET | `/api/referrals/my-code` | Usuario | Codigo CURV |
| GET | `/api/referrals/stats` | Usuario | Estadisticas |
| POST | `/api/referrals/apply` | Usuario | Aplicar codigo |
| GET | `/api/referrals/commissions` | Usuario | Comisiones |
| GET | `/api/admin/stats` | Admin | Estadisticas |
| GET | `/api/admin/users?search=&role=` | Admin | Usuarios |
| PUT | `/api/admin/users/:id/role` | Admin | Cambiar rol |
| DELETE | `/api/admin/users/:id` | Admin | Eliminar usuario |
| GET | `/api/admin/bonds?search=&status=` | Admin | Bonos |
| GET | `/api/admin/transactions?search=&status=` | Admin | Transacciones |
| GET | `/api/admin/referrals?search=` | Admin | Referidos |

Todos los servicios exponen un health check en `/api/<servicio>/health`.

---

## Comandos utiles

### Docker Compose

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f auth-service
docker compose down
docker compose down -v
```

### Kubernetes

```powershell
# Estado general
kubectl get pods,svc,ingress -n bonosverde

# Logs
kubectl logs -n bonosverde deployment/auth-service --tail=100
kubectl logs -n bonosverde deployment/keycloak --tail=100

# Reiniciar un deployment
kubectl rollout restart deployment/frontend -n bonosverde
kubectl rollout status deployment/frontend -n bonosverde --timeout=180s

# Consola de Keycloak
kubectl port-forward svc/keycloak 8085:8080 -n bonosverde

# Eliminar todo
powershell -ExecutionPolicy Bypass -File k8s\teardown.ps1
```

### Build

```bash
# Backend
cd microservices/auth-service && npm run build
cd microservices/bonds-service && npm run build
cd microservices/payment-service && npm run build
cd microservices/referral-service && npm run build

# Frontend
cd frontend && npm run build

# Regenerar Prisma despues de cambiar un schema
cd microservices/auth-service && npx prisma generate
```

---

## CI/CD con GitHub Actions

El pipeline esta en [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) y la guia completa en [`docs/ci-cd.md`](docs/ci-cd.md).

Cada push a `main` ejecuta:

1. **verify**: `npm ci`, `npm run build` y `npm test --if-present` de los 4 microservicios y el frontend.
2. **build-push**: construye las 5 imagenes y las publica en GHCR como `ghcr.io/<owner>/bonosverde-<servicio>:sha-<commit>` (y `latest`).
3. **deploy-local**: en un runner Windows propio con etiqueta `docker-desktop`, actualiza los Deployments de Kubernetes con esa imagen y espera el rollout.

No se reinstala MySQL ni Keycloak: solo se cambian las imagenes de `auth-service`, `bonds-service`, `payment-service`, `referral-service` y `frontend` en el namespace `bonosverde`.

Requisitos previos: permisos `packages: write` en GitHub, un runner `self-hosted, Windows, X64, docker-desktop` con Docker Desktop y `kubectl`, y haber ejecutado `k8s\deploy.ps1` al menos una vez.

---

## Notas

- `docker compose down -v` elimina el volumen de MySQL; los scripts de `database/` se ejecutan solo al crear un volumen nuevo.
- Si cambias el schema de Prisma, actualiza tambien `database/schema.sql` y el ConfigMap `bonosverde-db-init` de `k8s/01-config.yaml`.
- No publiques los archivos `.env` con secretos reales; usa `.env.example` como plantilla.
- Keycloak usa un issuer fijo (`KC_HOSTNAME`). En Docker Compose es `http://localhost:8080/realms/bonosverde`; en Kubernetes es `http://bonosverde.local/realms/bonosverde`.
- El issuer lo fija `KC_HOSTNAME`, no el puerto por el que accedas. En Docker Compose siempre es `http://localhost:8080/realms/bonosverde`, aunque consultes Keycloak directamente en `http://localhost:8085`. El JWKS local puede usar `http://localhost:8085/realms/bonosverde/protocol/openid-connect/certs`.
- El contenedor `keycloak-init` (Compose) y el Job `keycloak-realm-setup` (Kubernetes) asignan al service account `bonosverde-admin` los roles `manage-users`, `view-users`, `query-users` y `view-realm` de `realm-management`.
- La base H2 de Keycloak en Docker Compose vive dentro del contenedor. Si recreas el contenedor, el realm se vuelve a importar desde `keycloak/realm-bonosverde.json`.
- En Kubernetes, el PVC `keycloak-data` conserva la base H2 entre reinicios de pod. Para forzar una reimportacion limpia del realm, elimina el PVC y el deployment de Keycloak y vuelve a aplicar `k8s/15-keycloak.yaml`.
- Nginx resuelve `keycloak` al iniciar. Si recreas solo el contenedor de Keycloak en Compose, ejecuta `docker compose restart frontend`. En Kubernetes no aplica porque el Service tiene IP estable.
- Las imagenes `bonosverde/*:latest` con `imagePullPolicy: IfNotPresent` pueden quedar desactualizadas en el nodo. Para actualizar de forma fiable, publica una etiqueta nueva o fuerza el rollout (ver [problemas conocidos](#7-problemas-conocidos-y-soluciones)).
