param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$K8sDir = $PSScriptRoot
$Namespace = "bonosverde"

function Load-DotEnv {
  param([string]$Path)
  $values = @{}
  if (Test-Path -LiteralPath $Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
      $idx = $trimmed.IndexOf("=")
      if ($idx -lt 1) { continue }
      $key = $trimmed.Substring(0, $idx).Trim()
      $value = $trimmed.Substring($idx + 1).Trim().Trim('"')
      $values[$key] = $value
    }
  }
  return $values
}

$script:dotenv = Load-DotEnv (Join-Path $Root ".env")

function Get-Value {
  param([string]$Key, [string]$Default)
  if ($script:dotenv.ContainsKey($Key) -and $script:dotenv[$Key]) {
    return $script:dotenv[$Key]
  }
  return $Default
}

$dbName = Get-Value "MYSQL_DATABASE" "bonos_db"
$dbUser = Get-Value "MYSQL_USER" "bonos"
$dbPass = Get-Value "MYSQL_PASSWORD" "bonos_pass"
$dbRoot = Get-Value "MYSQL_ROOT_PASSWORD" "root_pass"
$kcAdminClientSecret = Get-Value "KEYCLOAK_ADMIN_CLIENT_SECRET" "bonosverde-admin-secret-2026"
$kcCliClientSecret = Get-Value "KEYCLOAK_CLI_CLIENT_SECRET" "bonosverde-cli-secret-2026"
$kcBootstrapPassword = Get-Value "KEYCLOAK_ADMIN_PASSWORD" "admin"
$paypalId = Get-Value "PAYPAL_CLIENT_ID" ""
$paypalSecret = Get-Value "PAYPAL_CLIENT_SECRET" ""
$epaycoPublic = Get-Value "EPAYCO_PUBLIC_KEY" ""
$epaycoPrivate = Get-Value "EPAYCO_PRIVATE_KEY" ""
$epaycoCust = Get-Value "EPAYCO_CUST_ID" ""

$databaseUrl = "mysql://${dbUser}:${dbPass}@mysql:3306/${dbName}"

$images = @(
  @{ Name = "auth-service"; Path = "microservices/auth-service" },
  @{ Name = "bonds-service"; Path = "microservices/bonds-service" },
  @{ Name = "payment-service"; Path = "microservices/payment-service" },
  @{ Name = "referral-service"; Path = "microservices/referral-service" },
  @{ Name = "frontend"; Path = "frontend" }
)

if (-not $SkipBuild) {
  Write-Host "==> Construyendo imagenes Docker" -ForegroundColor Cyan
  foreach ($img in $images) {
    $tag = "bonosverde/$($img.Name):latest"
    Write-Host "    docker build -t $tag"
    docker build -t $tag (Join-Path $Root $img.Path)
    if ($LASTEXITCODE -ne 0) { throw "Fallo el build de $tag" }
  }
}

$context = kubectl config current-context 2>$null
Write-Host "==> Contexto de Kubernetes: $context" -ForegroundColor Cyan
if ($context -match "kind") {
  foreach ($img in $images) {
    kind load docker-image "bonosverde/$($img.Name):latest"
  }
} elseif ($context -match "minikube") {
  foreach ($img in $images) {
    minikube image load "bonosverde/$($img.Name):latest"
  }
}

Write-Host "==> Aplicando namespace y configuracion" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "00-namespace.yaml")
kubectl apply -f (Join-Path $K8sDir "01-config.yaml")

Write-Host "==> Creando/actualizando Secret" -ForegroundColor Cyan
$secretYaml = kubectl create secret generic bonosverde-secrets `
  --namespace $Namespace `
  --from-literal=MYSQL_DATABASE=$dbName `
  --from-literal=MYSQL_USER=$dbUser `
  --from-literal=MYSQL_PASSWORD=$dbPass `
  --from-literal=MYSQL_ROOT_PASSWORD=$dbRoot `
  --from-literal=DATABASE_URL=$databaseUrl `
  --from-literal=KEYCLOAK_ADMIN_CLIENT_SECRET=$kcAdminClientSecret `
  --from-literal=KEYCLOAK_CLI_CLIENT_SECRET=$kcCliClientSecret `
  --from-literal=KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD=$kcBootstrapPassword `
  --from-literal=PAYPAL_CLIENT_ID=$paypalId `
  --from-literal=PAYPAL_CLIENT_SECRET=$paypalSecret `
  --from-literal=EPAYCO_PUBLIC_KEY=$epaycoPublic `
  --from-literal=EPAYCO_PRIVATE_KEY=$epaycoPrivate `
  --from-literal=EPAYCO_CUST_ID=$epaycoCust `
  --dry-run=client -o yaml
$secretYaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "No se pudo aplicar el Secret" }

Write-Host "==> Desplegando MySQL" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "10-mysql.yaml")
kubectl rollout status statefulset/mysql -n $Namespace --timeout=300s
if ($LASTEXITCODE -ne 0) { throw "MySQL no quedo listo" }

Write-Host "==> Creando ConfigMap del realm de Keycloak" -ForegroundColor Cyan
$realmYaml = kubectl create configmap keycloak-realm `
  --namespace $Namespace `
  --from-file=realm-bonosverde.json=(Join-Path $Root "keycloak/realm-bonosverde.json") `
  --dry-run=client -o yaml
$realmYaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el ConfigMap del realm de Keycloak" }

Write-Host "==> Desplegando Keycloak" -ForegroundColor Cyan
kubectl delete job keycloak-realm-setup -n $Namespace --ignore-not-found | Out-Null
kubectl apply -f (Join-Path $K8sDir "15-keycloak.yaml")
kubectl rollout status deployment/keycloak -n $Namespace --timeout=300s
if ($LASTEXITCODE -ne 0) { throw "Keycloak no quedo listo" }
kubectl wait --for=condition=complete job/keycloak-realm-setup -n $Namespace --timeout=180s
if ($LASTEXITCODE -ne 0) { throw "No se pudieron asignar los permisos del service account de Keycloak" }

Write-Host "==> Desplegando microservicios y frontend" -ForegroundColor Cyan
foreach ($file in @("20-auth-service.yaml", "21-bonds-service.yaml", "22-payment-service.yaml", "23-referral-service.yaml", "30-frontend.yaml")) {
  kubectl apply -f (Join-Path $K8sDir $file)
}

foreach ($deployment in @("auth-service", "bonds-service", "payment-service", "referral-service", "frontend")) {
  kubectl rollout status "deployment/$deployment" -n $Namespace --timeout=180s
  if ($LASTEXITCODE -ne 0) { throw "El deployment $deployment no quedo listo" }
}

Write-Host "==> Aplicando Ingress" -ForegroundColor Cyan
$ingressClasses = kubectl get ingressclass 2>$null | Out-String
if ($ingressClasses -notmatch "nginx") {
  Write-Warning "No se detecto la IngressClass 'nginx'. Instala nginx-ingress antes de usar http://bonosverde.local"
}
kubectl apply -f (Join-Path $K8sDir "40-ingress.yaml")

Write-Host ""
Write-Host "==> Estado del despliegue" -ForegroundColor Green
kubectl get pods,svc,ingress -n $Namespace

Write-Host ""
Write-Host "URL: http://bonosverde.local" -ForegroundColor Green
Write-Host "Keycloak Admin (local): kubectl port-forward svc/keycloak 8085:8080 -n bonosverde" -ForegroundColor Green
Write-Host "Recuerda agregar '127.0.0.1 bonosverde.local' a C:\Windows\System32\drivers\etc\hosts"
