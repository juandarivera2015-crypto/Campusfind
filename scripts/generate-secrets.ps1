# Windows (PowerShell) version of generate-secrets.sh
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force -Path secrets | Out-Null
function Rand([int]$len) {
  $bytes = New-Object byte[] 64; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  ([Convert]::ToBase64String($bytes) -replace '[/+=]', '').Substring(0, $len)
}
function Gen($name, $value) {
  $p = "secrets/$name"
  if ((Test-Path $p) -and (Get-Item $p).Length -gt 0) { "keep    $p" }
  else { [IO.File]::WriteAllText((Join-Path (Get-Location) $p), $value); "created $p" }
}
Gen 'db_password.txt' (Rand 32)
Gen 'db_root_password.txt' (Rand 32)
Gen 'jwt_secret.txt' (Rand 64)
Gen 'django_secret_key.txt' (Rand 64)
Gen 'grafana_admin_password.txt' (Rand 20)
if (-not (Test-Path 'secrets/exporter.my.cnf')) {
  $root = Get-Content 'secrets/db_root_password.txt' -Raw
  [IO.File]::WriteAllText((Join-Path (Get-Location) 'secrets/exporter.my.cnf'), "[client]`nuser=root`npassword=$root`n")
  'created secrets/exporter.my.cnf'
}
"Grafana admin password: $(Get-Content secrets/grafana_admin_password.txt -Raw)"
