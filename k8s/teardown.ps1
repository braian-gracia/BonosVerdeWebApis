param(
  [switch]$KeepImages
)

$ErrorActionPreference = "Stop"
$Namespace = "bonosverde"

Write-Host "==> Eliminando namespace $Namespace (incluye PVC y datos de MySQL)" -ForegroundColor Yellow
kubectl delete namespace $Namespace --ignore-not-found

if (-not $KeepImages) {
  Write-Host "==> Eliminando imagenes locales bonosverde/*" -ForegroundColor Yellow
  $images = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -like "bonosverde/*" }
  foreach ($image in $images) {
    docker rmi -f $image | Out-Null
  }
}

Write-Host "Listo." -ForegroundColor Green
