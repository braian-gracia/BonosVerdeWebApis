# Despliegue de BonosVerde en Kubernetes

Manifiestos para desplegar el stack completo (MySQL + Keycloak + 4 microservicios + frontend) en un cluster local de Kubernetes usando `nginx-ingress`.

## Requisitos

- Docker + un cluster local: Docker Desktop (Kubernetes habilitado), kind o minikube.
- `kubectl` configurado contra el cluster.
- Controlador `nginx-ingress` instalado.

### Instalar nginx-ingress

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

Espera a que el controlador quede listo:

```powershell
kubectl wait --namespace ingress-nginx --for=condition=Ready pod --selector=app.kubernetes.io/component=controller --timeout=180s
```

## Archivo hosts

Agrega el host `bonosverde.local` apuntando al cluster. En Windows edita `C:\Windows\System32\drivers\etc\hosts` como administrador y añade:

```text
127.0.0.1 bonosverde.local
```

- Docker Desktop: `127.0.0.1` funciona.
- minikube: usa `minikube ip` en lugar de `127.0.0.1` (o ejecuta `minikube tunnel`).
- kind: usa `127.0.0.1` si el cluster se creó con los mapeos de puertos 80/443.

En PowerShell como administrador:

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 bonosverde.local"
```

## Desplegar

Desde la raíz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File k8s\deploy.ps1
```

El script:

1. Construye las imágenes `bonosverde/*:latest`.
2. Las carga al cluster si detecta kind o minikube.
3. Aplica namespace, ConfigMaps y crea el Secret (toma valores de `.env` si existe).
4. Despliega MySQL y espera a que esté listo.
5. Crea el ConfigMap del realm de Keycloak desde `keycloak/realm-bonosverde.json`.
6. Despliega Keycloak, espera el rollout y ejecuta el Job `keycloak-realm-setup` para asignar permisos al service account.
7. Despliega microservicios y frontend, esperando cada rollout.
8. Aplica el Ingress.

Para no reconstruir imágenes:

```powershell
powershell -ExecutionPolicy Bypass -File k8s\deploy.ps1 -SkipBuild
```

## Verificar

```powershell
kubectl get pods,svc,ingress -n bonosverde
kubectl logs -n bonosverde deployment/auth-service
kubectl logs -n bonosverde job/keycloak-realm-setup
```

Keycloak se expone a traves del Ingress en `http://bonosverde.local/realms/bonosverde`. Para abrir la consola de administracion en local:

```powershell
kubectl port-forward svc/keycloak 8085:8080 -n bonosverde
```

Luego abre http://localhost:8085 con `admin` / `admin`.

Prueba la aplicación en `http://bonosverde.local` con:

| Email | Contraseña | Rol |
| --- | --- | --- |
| admin@bonosverde.com | admin123 | ADMIN |
| inversor@bonosverde.com | inversor123 | INVESTOR |
| premium@bonosverde.com | inversor123 | PREMIUM |

Prueba de API directa:

```powershell
curl.exe http://bonosverde.local/api/auth/health
curl.exe http://bonosverde.local/api/bonds/health
curl.exe http://bonosverde.local/api/payments/health
curl.exe http://bonosverde.local/api/referrals/health
```

## Reiniciar la base de datos

Los scripts `01-schema.sql` y `02-seed.sql` solo se ejecutan cuando el volumen de MySQL está vacío. Para reinicializar:

```powershell
kubectl delete pvc data-mysql-0 -n bonosverde
kubectl delete pod mysql-0 -n bonosverde
kubectl rollout status statefulset/mysql -n bonosverde --timeout=300s
```

## Eliminar todo

```powershell
powershell -ExecutionPolicy Bypass -File k8s\teardown.ps1
```

Esto elimina el namespace `bonosverde` (incluido el PVC con los datos) y las imágenes locales `bonosverde/*`. Usa `-KeepImages` para conservar las imágenes.

## Estructura

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

## Notas

- Los nombres de los `Service` (`mysql`, `auth-service`, `bonds-service`, `payment-service`, `referral-service`) coinciden con los usados por `frontend/nginx.conf` y `DATABASE_URL`.
- El Secret se genera desde `.env` (si existe) o con los valores de desarrollo de `docker-compose.yml`. No se commitea ningún secreto real.
- Las réplicas por defecto son 2 para servicios sin estado y 1 para MySQL. Ajusta `replicas` si tu equipo tiene pocos recursos.
- Para cambiar el host, edita `host:` en `40-ingress.yaml`, `CORS_ORIGIN` y `KEYCLOAK_ISSUER` en `01-config.yaml`, `KC_HOSTNAME` en `15-keycloak.yaml` y tu archivo hosts.
- El Job `keycloak-realm-setup` es idempotente y asigna los roles del service account `bonosverde-admin` (`manage-users`, `view-users`, `query-users`, `view-realm`). `deploy.ps1` lo elimina antes de reaplicarlo para que vuelva a ejecutarse.
- El issuer de Keycloak en Kubernetes es `http://bonosverde.local/realms/bonosverde`; debe coincidir con `KEYCLOAK_ISSUER` en el ConfigMap.
