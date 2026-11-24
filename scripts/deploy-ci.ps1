param(
  [Parameter(Mandatory = $true)]
  [string]$Registry,

  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [Parameter(Mandatory = $true)]
  [string]$Tag,

  [string]$Namespace = "bonosverde"
)

$ErrorActionPreference = "Stop"

$apps = @(
  "auth-service",
  "bonds-service",
  "payment-service",
  "referral-service",
  "frontend"
)

$registrySecret = "ghcr-login"

function Assert-LastExitCode {
  param([string]$Message)

  if ($LASTEXITCODE -ne 0) {
    throw $Message
  }
}

function Test-CommandAvailable {
  param([string]$Name)

  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

foreach ($command in @("docker", "kubectl")) {
  if (-not (Test-CommandAvailable $command)) {
    throw "No se encontro '$command' en el runner. Instalalo y vuelve a intentar."
  }
}

Write-Host "==> Verificando Docker" -ForegroundColor Cyan
docker info | Out-Null
Assert-LastExitCode "Docker no esta disponible o no esta corriendo."

$context = kubectl config current-context
Assert-LastExitCode "No hay un contexto de Kubernetes configurado."
Write-Host "Contexto de Kubernetes: $context" -ForegroundColor Cyan

kubectl get namespace $Namespace -o name | Out-Null
Assert-LastExitCode "No existe el namespace '$Namespace'. Ejecuta primero k8s\deploy.ps1 para crear la infraestructura base."

foreach ($app in $apps) {
  kubectl get deployment $app -n $Namespace -o name | Out-Null
  Assert-LastExitCode "No existe el deployment '$app' en el namespace '$Namespace'. Ejecuta primero k8s\deploy.ps1."
}

$token = $env:GH_TOKEN
$actor = $env:GH_ACTOR
if (-not $token -or -not $actor) {
  throw "GH_TOKEN y GH_ACTOR deben estar disponibles para crear el imagePullSecret."
}

Write-Host "==> Configurando imagePullSecret '$registrySecret'" -ForegroundColor Cyan
$secretYaml = kubectl create secret docker-registry $registrySecret `
  --namespace $Namespace `
  --docker-server=$Registry `
  --docker-username=$actor `
  --docker-password=$token `
  --docker-email="$actor@users.noreply.github.com" `
  --dry-run=client -o yaml
Assert-LastExitCode "No se pudo generar el imagePullSecret."

$secretYaml | kubectl apply -f -
Assert-LastExitCode "No se pudo aplicar el imagePullSecret."

kubectl patch serviceaccount default `
  --namespace $Namespace `
  -p '{"imagePullSecrets":[{"name":"ghcr-login"}]}' | Out-Null
Assert-LastExitCode "No se pudo asignar el imagePullSecret al ServiceAccount default."

Write-Host "==> Actualizando imagenes de los deployments" -ForegroundColor Cyan
foreach ($app in $apps) {
  $image = "$Registry/$Owner/bonosverde-$app`:$Tag"
  Write-Host "    $app -> $image"
  kubectl set image "deployment/$app" "$app=$image" --namespace $Namespace
  Assert-LastExitCode "No se pudo actualizar el deployment '$app'."
}

Write-Host "==> Esperando a que los rollouts terminen" -ForegroundColor Cyan
foreach ($app in $apps) {
  kubectl rollout status "deployment/$app" --namespace $Namespace --timeout=300s
  Assert-LastExitCode "El rollout de '$app' no termino correctamente."
}

Write-Host ""
Write-Host "==> Estado final" -ForegroundColor Green
kubectl get deployments,pods -n $Namespace
Assert-LastExitCode "No se pudo consultar el estado del namespace '$Namespace'."
