# CampusFind en el Kubernetes de Docker Desktop (Windows / PowerShell)
#   powershell -ExecutionPolicy Bypass -File scripts\k8s-local.ps1          -> despliega
#   powershell -ExecutionPolicy Bypass -File scripts\k8s-local.ps1 -Delete  -> elimina todo
param([switch]$Delete)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

kubectl config use-context docker-desktop | Out-Null

if ($Delete) {
  kubectl delete namespace campusfind --ignore-not-found
  Write-Host "Namespace campusfind eliminado." -ForegroundColor Yellow
  exit 0
}

# 1. Secretos: se reutilizan los mismos que usa Docker Compose (secrets\*.txt)
$envFile = 'k8s\overlays\local\secrets.env'
if (-not (Test-Path $envFile)) {
  if (-not (Test-Path 'secrets\jwt_secret.txt')) { & powershell -ExecutionPolicy Bypass -File scripts\generate-secrets.ps1 }
  $read = { param($n) (Get-Content "secrets\$n" -Raw).Trim() }
  @(
    "DB_PASSWORD=$(& $read 'db_password.txt')"
    "DB_ROOT_PASSWORD=$(& $read 'db_root_password.txt')"
    "JWT_SECRET=$(& $read 'jwt_secret.txt')"
    "DJANGO_SECRET_KEY=$(& $read 'django_secret_key.txt')"
  ) | Set-Content -Encoding ascii $envFile
  Write-Host "Creado $envFile" -ForegroundColor Green
}

# 2. Imagenes locales (las mismas de Docker Compose: campusfind/*:local)
docker compose build api stats web

# 3. Desplegar (Namespace, ConfigMap, Secret, MySQL StatefulSet, Job de migraciones, Deployments, Services, HPA, PDB, NetworkPolicies)
kubectl apply -k k8s\overlays\local

Write-Host "`nEsperando a MySQL y a las migraciones (1-3 min)..." -ForegroundColor Cyan
kubectl -n campusfind rollout status statefulset/mysql --timeout=300s
kubectl -n campusfind wait --for=condition=complete job/api-migrate --timeout=300s
foreach ($d in 'api','stats','web') { kubectl -n campusfind rollout status deployment/$d --timeout=300s }

Write-Host "`nRecursos de Kubernetes:" -ForegroundColor Cyan
kubectl -n campusfind get pods,svc,deploy,statefulset,hpa,pvc

Write-Host "`nAbre http://localhost:8081  (Ctrl+C para detener el port-forward)" -ForegroundColor Green
kubectl -n campusfind port-forward svc/web 8081:80
