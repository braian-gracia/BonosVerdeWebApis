# CI/CD con GitHub Actions, Docker y Kubernetes

El pipeline automatico esta definido en [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).

## Flujo automatizado

Cada `push` a `main` (y cada ejecucion manual) dispara tres trabajos en orden:

| Trabajo | Runner | Que hace |
| --- | --- | --- |
| `verify` | `ubuntu-latest` | `npm ci` + `npm run build` + `npm test --if-present` de los 4 microservicios y el frontend. |
| `build-push` | `ubuntu-latest` | Construye 5 imagenes Docker y las publica en GHCR con dos tags: `sha-<commit>` y `latest`. |
| `deploy-local` | `self-hosted, Windows, X64, docker-desktop` | Actualiza los 5 Deployments en Kubernetes con el tag `sha-<commit>` y espera el rollout. |

Resultado esperado: al cambiar el repositorio remoto se compila, se publican las imagenes y se actualizan los contenedores automaticamente, sin reinstalar MySQL, sin regenerar secretos de Keycloak y sin borrar bases de datos.

> El repositorio no tiene scripts `test` definidos. Por ahora `verify` valida la compilacion de TypeScript/Prisma, pero usa `npm test --if-present`, asi que las pruebas se ejecutaran automaticamente en cuanto se agreguen a cualquier proyecto.

Las imagenes publicadas siguen este formato:

```text
ghcr.io/<owner>/bonosverde-auth-service:sha-<commit>
ghcr.io/<owner>/bonosverde-bonds-service:sha-<commit>
ghcr.io/<owner>/bonosverde-payment-service:sha-<commit>
ghcr.io/<owner>/bonosverde-referral-service:sha-<commit>
ghcr.io/<owner>/bonosverde-frontend:sha-<commit>
```

El `<owner>` se normaliza a minusculas porque GHCR no acepta mayusculas en el nombre del paquete.

---

## 1. Permisos en GitHub

El workflow declara:

```yaml
permissions:
  contents: read
  packages: write
```

en `build-push` y `packages: read` en `deploy-local`.

Si el paquete en GHCR ya existia con permisos de solo lectura, `GITHUB_TOKEN` puede fallar con:

```text
denied: permission_denied: write_package
```

Solucion:

1. En GitHub, abre tu perfil → **Packages** → el paquete (`bonosverde-auth-service`, etc.).
2. Entra a **Package settings** → **Manage Actions access**.
3. Agrega el repositorio y asignale permiso **Write**.
4. Repite para los cinco paquetes que ya existan.
5. Tambien revisa **Settings → Actions → General → Workflow permissions**. No es necesario activar `Read and write permissions` globalmente si el workflow ya pide `packages: write`, pero la configuracion del repositorio no debe bloquearlo.

---

## 2. Registrar el runner local

En el repositorio: **Settings → Actions → Runners → New self-hosted runner → Windows x64**.

Se recomienda una carpeta separada del proyecto:

```powershell
New-Item -ItemType Directory -Force C:\actions-runner
Set-Location C:\actions-runner
```

Descarga y extrae el paquete usando los comandos exactos que muestra GitHub (la version cambia con el tiempo). No compartas el token de registro.

Durante `config.cmd`:

| Pregunta | Valor |
| --- | --- |
| Runner group | `Default` |
| Runner name | `windows-docker-desktop` |
| Additional labels | `docker-desktop` |
| Work folder | `_work` |

Inicia el runner:

```powershell
.\run.cmd
```

Debe aparecer:

```text
Connected to GitHub
Listening for Jobs
```

El job `deploy-local` usa:

```yaml
runs-on: [self-hosted, Windows, X64, docker-desktop]
```

Por eso GitHub solo le enviara el trabajo a un runner que tenga las cuatro etiquetas. Si el runner aparece `Offline` o el job queda esperando, revisa que la ventana este abierta, que no haya un servicio duplicado y que la etiqueta `docker-desktop` este creada (tambien se puede agregar despues desde la pagina **Runners → Labels**).

> No ejecutes este workflow para pull requests de colaboradores no confiables: el runner tiene acceso a Docker y a tu cluster local. El workflow solo se dispara con `push` a `main` y `workflow_dispatch`.

---

## 3. Preparar el cluster

El runner debe tener Docker Desktop funcionando y `kubectl` apuntando al cluster. Antes del primer despliegue automatizado, crea la infraestructura base una vez:

```powershell
docker info

kubectl config current-context
kubectl get nodes
kubectl get deployments -n bonosverde
```

Si el namespace o los deployments no existen:

```powershell
powershell -ExecutionPolicy Bypass -File k8s\deploy.ps1
```

El contexto tipico de la guia es `docker-desktop`, pero el script tambien funciona con `kind` o `minikube` siempre que `kubectl` pueda llegar al cluster y este tenga acceso a GHCR.

Durante el despliegue, `scripts/deploy-ci.ps1`:

1. Verifica `docker` y `kubectl`.
2. Crea/actualiza el `imagePullSecret` `ghcr-login` en el namespace `bonosverde`.
3. Lo asocia al ServiceAccount `default`.
4. Ejecuta `kubectl set image` sobre los 5 deployments con el tag inmutable `sha-<commit>`.
5. Espera `kubectl rollout status` de cada deployment.

No aplica `k8s/10-mysql.yaml` ni `k8s/15-keycloak.yaml`, por lo que MySQL, Keycloak y sus datos se conservan.

---

## 4. Primera ejecucion

1. Entra a **Actions → CI/CD - BonosVerde (Docker + Kubernetes)**.
2. **Run workflow** → Branch: `main` → **Run workflow**.
3. Verifica el orden: `verify` → `build-push` → `deploy-local`.
4. Confirma el resultado:

```powershell
kubectl get deployments,pods -n bonosverde
kubectl get deployment auth-service -n bonosverde `
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

La imagen debe ser `ghcr.io/<owner>/bonosverde-auth-service:sha-<commit>`.

Desde ese momento, cualquier push a `main` repite el flujo automaticamente.

---

## 5. Resolucion de problemas

| Sintoma | Causa probable | Accion |
| --- | --- | --- |
| `permission_denied: write_package` en `build-push` | El paquete GHCR existente no permite escribir al repo | **Package settings → Manage Actions access → Write** para cada paquete. |
| `deploy-local` queda en cola | Runner `Offline`, ocupado o sin la etiqueta `docker-desktop` | Abrir `.\run.cmd`, verificar etiquetas en **Settings → Actions → Runners**. |
| Pods en `ImagePullBackOff` | Falta el `imagePullSecret` o el token no puede leer el paquete | El workflow recrea `ghcr-login`; revisa `packages: read` y los permisos del paquete. |
| `No existe el namespace 'bonosverde'` | Aun no se corrio el despliegue inicial | Ejecutar `powershell -ExecutionPolicy Bypass -File k8s\deploy.ps1`. |
| Rollout timeout | La imagen nueva no arranca o los health checks fallan | `kubectl logs -n bonosverde deployment/<servicio> --tail=100` y `kubectl describe pod -n bonosverde`. |
| `docker info` falla en el runner | Docker Desktop detenido | Iniciar Docker Desktop y dejar la ventana del runner abierta. |

Si se vuelve a ejecutar `k8s/deploy.ps1` despues de un CI exitoso, los manifiestos locales restauran la imagen `bonosverde/<servicio>:latest`. El siguiente push a `main` vuelve a cambiarla a la imagen de GHCR.
