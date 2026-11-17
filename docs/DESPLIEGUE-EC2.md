# Despliegue económico en AWS: un servidor EC2 + despliegue automático desde `main`

Pensado para cuentas de estudiante (Free plan de AWS o AWS Academy Learner Lab). Corre exactamente
el mismo `docker-compose.yml` que en local, detrás de **Caddy** (HTTPS automático con Let's Encrypt).
El montaje EKS/RDS de `terraform/aws` sigue disponible para un entorno con presupuesto mayor.

```
GitHub (push a main) ─► Actions: CI ✅ ─► Deploy to AWS EC2 ──ssh/rsync──► EC2 (Ubuntu 24.04, t3.small)
                                                                          ├─ caddy :443  (HTTPS, sslip.io)
                                                                          ├─ web (nginx + React) → api / stats
                                                                          ├─ db (MySQL, volumen)
                                                                          └─ prometheus + grafana (privados)
```

| Concepto | Valor aproximado |
|---|---|
| EC2 t3.small (2 vCPU, 2 GB) 24/7 | ~15 USD/mes |
| Disco gp3 20 GB | ~1,6 USD/mes |
| IPv4 pública / Elastic IP | ~3,6 USD/mes |
| **Total** | **~20 USD/mes** (apágala cuando no la uses para ahorrar) |

## 1. Lanzar la instancia (consola de AWS)
1. Región **us-east-1 (N. Virginia)** (en Learner Lab es obligatoria).
2. **EC2 → Instances → Launch instances**
   * Name: `campusfind`
   * AMI: **Ubuntu Server 24.04 LTS** (x86_64)
   * Instance type: **t3.small**
   * Key pair: *Create new key pair* → `campusfind-key`, RSA, `.pem` (Learner Lab: usa `vockey` y descarga `labsuser.pem` desde *AWS Details*)
   * Network settings → *Create security group* y marca: **SSH (22) Anywhere**, **HTTP (80) Anywhere**, **HTTPS (443) Anywhere**
   * Storage: **20 GiB gp3**
   * Advanced details → **User data**: pega el contenido de `deploy/aws-ec2/user-data.sh`
3. **Launch instance** y espera ~3 min a que *Status checks* diga `2/2 checks passed`.

## 2. IP fija (Elastic IP)
**EC2 → Elastic IPs → Allocate Elastic IP address → Allocate**, luego **Actions → Associate** → tu instancia.
Así la dirección no cambia al reiniciar (importante en Learner Lab, donde la instancia se detiene al terminar la sesión).

## 3. Conectar GitHub
Repositorio → **Settings → Secrets and variables → Actions**:
* **Secrets → New repository secret**: `EC2_SSH_KEY` = contenido completo del `.pem` (incluidas las líneas `-----BEGIN…` y `-----END…`).
* **Variables → New repository variable**: `EC2_HOST` = la Elastic IP (ej. `3.85.120.7`).
* Opcional: `APP_DOMAIN` si tienes dominio propio (apunta un registro A a la Elastic IP). Si no, se usa `3-85-120-7.sslip.io`.

## 4. Primer despliegue
**Actions → Deploy to AWS EC2 → Run workflow** (rama `main`). Tarda 10–15 min la primera vez (construye las imágenes).
Al terminar abre `https://<ip-con-guiones>.sslip.io`.

Desde entonces cada merge a `main` que pase el CI se despliega solo.

## 5. Operación
```bash
ssh -i campusfind-key.pem ubuntu@<ELASTIC_IP>
cd /opt/campusfind
docker compose -f docker-compose.yml -f deploy/aws-ec2/docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f deploy/aws-ec2/docker-compose.prod.yml logs -f api
# Usuario demo (opcional)
docker compose -f docker-compose.yml -f deploy/aws-ec2/docker-compose.prod.yml exec api npx sequelize-cli db:seed:all
# Grafana / Prometheus por túnel SSH -> http://localhost:3001 y http://localhost:9090
ssh -i campusfind-key.pem -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 ubuntu@<ELASTIC_IP>
cat /opt/campusfind/secrets/grafana_admin_password.txt
```

Los secretos se generan **una sola vez en el servidor** (`/opt/campusfind/secrets/`) y nunca pasan por GitHub.
Los datos (MySQL, imágenes, certificados) viven en volúmenes de Docker y sobreviven a cada despliegue.

## Control de costos
* **Billing → Budgets → Create budget → Zero spend / Monthly cost budget** (ej. 20 USD) con aviso por correo.
* *Instance state → Stop* cuando no la uses; *Terminate* + liberar la Elastic IP al terminar el proyecto.
