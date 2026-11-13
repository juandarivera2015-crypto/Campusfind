# Despliegue: contenedores, Kubernetes, Terraform y cloud

## Docker

Cada servicio tiene un `Dockerfile` **multi-stage** (dependencias → runtime mínimo), usuario *non-root* y `HEALTHCHECK`:

| Imagen | Base runtime | Puerto |
|---|---|---|
| `api` (`backend/`) | `node:22-alpine` + tini | 3000 |
| `stats` (`stats-service/`) | `python:3.12-slim` + gunicorn | 8000 |
| `web` (`frontend/`) | `nginxinc/nginx-unprivileged` | 8080 |

`docker-compose.yml` define:
* **Volúmenes con nombre**: `db_data` (MySQL), `uploads` (imágenes), `prometheus_data`, `grafana_data` — sobreviven a `docker compose down` (usa `down -v` para borrarlos).
* **Redes**: `frontend` (gateway ↔ servicios) y `backend` (servicios ↔ BD); la BD no es alcanzable desde el gateway.
* **Secretos de Compose** montados en `/run/secrets/*` y leídos vía variables `*_FILE`.
* `depends_on` con `condition: service_healthy` para arrancar en orden.

```bash
docker compose up -d --build        # levantar
docker compose logs -f api          # logs
docker compose exec api npx sequelize-cli db:seed:all   # datos demo
docker compose down                 # parar (conserva volúmenes)
```

## Kubernetes

Manifiestos con **kustomize** en `k8s/`:

```
k8s/base/            Namespace (PSA restricted), ConfigMap, PVC, Job de migraciones,
                     Deployments + Services + HPA + PDB (api, stats, web), NetworkPolicies, Ingress
k8s/overlays/local/  minikube/kind: MySQL StatefulSet, Secret desde secrets.env, 1 réplica de API
k8s/overlays/aws/    EKS: ExternalSecret (Secrets Manager), StorageClass EFS, Ingress ALB, imágenes ECR
k8s/monitoring/      ServiceMonitor, PrometheusRule y dashboard para kube-prometheus-stack
```

Conceptos aplicados:
* **Pods** con probes `liveness`/`readiness`, `resources`, `securityContext` (no root, FS de solo lectura, sin capabilities, seccomp).
* **Services** ClusterIP (`api`, `stats`, `web`) — el nombre del Service es el host que usa nginx.
* **Deployments** con *rolling update* sin indisponibilidad (`maxUnavailable: 0`), **HPA** por CPU y **PDB**.
* **Job** `api-migrate` para migraciones (una sola vez por despliegue, antes del rollout).
* **NetworkPolicy** *default-deny* + flujos permitidos.

### Local (minikube)
```bash
minikube start && minikube addons enable ingress
eval $(minikube docker-env)
docker build -t campusfind/api:local backend
docker build -t campusfind/stats:local stats-service
docker build -t campusfind/web:local frontend
cp k8s/overlays/local/secrets.env.example k8s/overlays/local/secrets.env   # editar valores
kubectl apply -k k8s/overlays/local
kubectl -n campusfind get pods,svc,hpa
echo "$(minikube ip) campusfind.local" | sudo tee -a /etc/hosts
```

## Terraform (Infrastructure as Code) en AWS

`terraform/aws/` crea:

| Recurso | Modelo | Propósito |
|---|---|---|
| VPC, subredes públicas/privadas/BD, NAT | IaaS | Red aislada |
| **EKS** + node group gestionado + add-ons (VPC CNI con NetworkPolicy, EFS CSI) | CaaS/PaaS | Kubernetes gestionado |
| **RDS MySQL 8** cifrado, TLS obligatorio, backups, Performance Insights | PaaS | Base de datos relacional |
| **EFS** | PaaS | Volumen compartido `ReadWriteMany` para imágenes |
| **ECR** (3 repos, inmutables, scan on push) | PaaS | Registro de imágenes |
| **Secrets Manager** + KMS | PaaS | Secretos de la app |
| IAM **OIDC para GitHub Actions** + IRSA | — | CI/CD y pods sin claves estáticas |
| Helm: AWS Load Balancer Controller, External Secrets, kube-prometheus-stack | — | Ingress ALB, sincronización de secretos, monitorización |

```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars        # github_repository = "tu-usuario/campusfind"
terraform init && terraform plan -out tfplan && terraform apply tfplan
terraform output                                     # valores para las variables de GitHub
$(terraform output -raw kubeconfig_command)
```

Después, en GitHub → *Settings → Secrets and variables → Actions → Variables*, crea:
`AWS_REGION, AWS_DEPLOY_ROLE_ARN, EKS_CLUSTER, ECR_REGISTRY, RDS_ENDPOINT, EFS_FILE_SYSTEM_ID, EXTERNAL_SECRETS_ROLE_ARN, APP_DOMAIN, ACM_CERTIFICATE_ARN`
(y `AWS_TERRAFORM_ROLE_ARN` si quieres `terraform plan/apply` desde Actions). Cada *push* a `main` despliega.

> Costes: EKS + NAT + RDS generan cargo por hora. Usa `terraform destroy` al terminar las pruebas.

## Gestión de secretos

Mismo contrato en todos los entornos: **la aplicación lee `NOMBRE_FILE`** (o `NOMBRE` en desarrollo) mediante
`backend/src/config/secrets.js` y `stats-service/config/secrets.py`. Nunca hay secretos en el código ni en las imágenes.

| Entorno | Origen | Cómo llega al contenedor |
|---|---|---|
| Desarrollo | `.env` (ignorado por git) | variables de entorno |
| Docker Compose | `secrets/*.txt` (generados por `scripts/generate-secrets.*`, ignorados) | Docker secrets → `/run/secrets/*` |
| Kubernetes local | `k8s/overlays/local/secrets.env` (ignorado) | `secretGenerator` → Secret → volumen de solo lectura |
| AWS | **Secrets Manager** (`campusfind/app`, cifrado con KMS, generado por Terraform) | External Secrets Operator (IRSA) → Secret → volumen |
| CI/CD | GitHub OIDC → rol IAM temporal | sin claves de larga duración; `ANTHROPIC_API_KEY` como *GitHub secret* |

Buenas prácticas incluidas: secretos montados como ficheros (no variables de entorno), cifrado de Secrets de Kubernetes con KMS en EKS,
rotación posible cambiando el valor en Secrets Manager (External Secrets refresca cada hora; reinicia los pods),
escaneo de secretos con Trivy en cada CI y estado de Terraform cifrado en S3 (bloque `backend` comentado en `versions.tf`).

## Modelos de servicio cloud

| Modelo | Qué gestiona el proveedor | En CampusFind |
|---|---|---|
| **IaaS** (Infrastructure as a Service) | Hardware, red, virtualización | VPC, subredes, NAT, nodos EC2 del node group |
| **PaaS** (Platform as a Service) | + SO, runtime, parches, backups | RDS, EKS (plano de control), ECR, EFS, Secrets Manager |
| **SaaS** (Software as a Service) | Toda la aplicación | GitHub / GitHub Actions, Grafana Cloud (opcional), API de Anthropic para el testing con IA |

## Proveedores: AWS, GCP y Azure

Se implementó AWS. Equivalencias para portar el Terraform:

| Necesidad | AWS (implementado) | Google Cloud | Azure |
|---|---|---|---|
| Kubernetes gestionado | EKS | GKE | AKS |
| MySQL gestionado | RDS for MySQL | Cloud SQL for MySQL | Azure Database for MySQL – Flexible Server |
| Registro de contenedores | ECR | Artifact Registry | Azure Container Registry |
| Secretos | Secrets Manager + KMS | Secret Manager + Cloud KMS | Key Vault |
| Almacenamiento compartido | EFS | Filestore | Azure Files |
| Balanceador / Ingress | ALB (LB Controller) | GKE Ingress / Cloud Load Balancing | Application Gateway (AGIC) |
| Identidad de pods | IRSA | Workload Identity | Workload Identity (Entra ID) |
| CI/CD federado | GitHub OIDC → IAM Role | Workload Identity Federation | Federated credentials en Entra ID |
| Monitorización gestionada | Amazon Managed Prometheus/Grafana | Managed Service for Prometheus | Azure Monitor managed Prometheus + Managed Grafana |
| Provider de Terraform | `hashicorp/aws` | `hashicorp/google` | `hashicorp/azurerm` |

Los manifiestos de `k8s/base` son agnósticos al proveedor; solo cambia el overlay (StorageClass, Ingress, SecretStore).
