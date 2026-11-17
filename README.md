# 🔍 CampusFind 2.0 — Lost & Found universitario

Portal para reportar objetos perdidos/encontrados en el campus y contactar a quien los publicó.
La versión 1 (PHP + MySQL en XAMPP) se conserva en [`legacy/`](legacy/); esta versión la
reimplementa como una arquitectura **cliente-servidor** moderna, segura, observable y desplegable en la nube.

```
┌──────────────┐  HTTPS   ┌──────────────────────────── gateway nginx ───────────────────────────┐
│  Navegador   │ ───────► │  /            → React SPA (build estático)                            │
│  React SPA   │          │  /api/v1, /oauth, /uploads → API Node.js/Express + Sequelize ──┐      │
└──────────────┘          │  /api/stats   → Microservicio Django + Django ORM ─────────────┤      │
                          └────────────────────────────────────────────────────────────────┼──────┘
                                                                                           ▼
                                                    MySQL 8 (Docker / StatefulSet / Amazon RDS)
        Prometheus ◄── /metrics (API, Django, mysqld-exporter) ──► Grafana (dashboards + alertas)
```

## Qué cubre cada tema

| Tema | Dónde está |
|---|---|
| **Node.js + Express** | [`backend/`](backend/) — API REST v1, servidor OAuth 2.1 |
| **Django** | [`stats-service/`](stats-service/) — microservicio de estadísticas (DRF) |
| **React** | [`frontend/`](frontend/) — SPA con Vite, mismo diseño que la v1 |
| Angular / Vue.js | Comparativa y cómo sustituir el cliente: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md#frameworks-frontend) |
| **Cliente-servidor, APIs REST** | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md), [`docs/API.md`](docs/API.md) |
| **OpenAPI 3.0 + Swagger** | [`backend/src/docs/openapi.yaml`](backend/src/docs/openapi.yaml) → `/api/docs/`; Django: `/api/stats/docs/` |
| **OAuth 2.1 + JWT** | [`backend/src/routes/oauth.js`](backend/src/routes/oauth.js) (Authorization Code + PKCE, refresh rotation) |
| **BD relacional + ORM** | Sequelize (modelos + migraciones) y Django ORM (modelos no gestionados) sobre MySQL |
| **OWASP (SQLi, XSS, CSRF)** | [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) |
| **Postman** | [`postman/`](postman/) — colección con PKCE automático, ejecutada con Newman en CI |
| **IA aplicada al testing** | [`ai-testing/`](ai-testing/) — Claude genera casos desde el contrato OpenAPI |
| **Docker / Compose** | `Dockerfile` en cada servicio + [`docker-compose.yml`](docker-compose.yml) (imágenes, volúmenes, redes, secretos) |
| **Kubernetes** | [`k8s/`](k8s/) — Deployments, Services, HPA, PDB, NetworkPolicy, Ingress (kustomize) |
| **Despliegue en AWS (EC2, económico)** | [`docs/DESPLIEGUE-EC2.md`](docs/DESPLIEGUE-EC2.md) — auto-deploy desde `main` con GitHub Actions |
| **Terraform (IaC) + AWS** | [`terraform/aws/`](terraform/aws/) — VPC, EKS, RDS, EFS, ECR, Secrets Manager, IAM OIDC |
| **IaaS / PaaS / SaaS, AWS·GCP·Azure** | [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md#modelos-de-servicio-cloud) |
| **Gestión de secretos** | `*_FILE` + Docker secrets → K8s Secrets → AWS Secrets Manager + External Secrets |
| **Git, GitHub, GitFlow** | [`docs/GITFLOW.md`](docs/GITFLOW.md), `.github/` |
| **GitHub Actions (CI/CD)** | [`.github/workflows/`](.github/workflows/) |
| **Prometheus + Grafana** | [`monitoring/`](monitoring/), [`docs/OBSERVABILIDAD.md`](docs/OBSERVABILIDAD.md) |

## Arranque rápido (Docker)

Requisitos: Docker Desktop (o Docker Engine + Compose v2).

```bash
./scripts/generate-secrets.sh            # Windows: powershell -File scripts/generate-secrets.ps1
cp docker-compose.override.example.yml docker-compose.override.yml   # opcional: puertos + usuario demo
docker compose up -d --build
```

| URL | Servicio |
|---|---|
| http://localhost:8080 | Aplicación (React) |
| http://localhost:8080/api/docs/ | Swagger UI de la API |
| http://localhost:8080/api/stats/docs/ | Swagger UI del microservicio Django |
| http://localhost:3001 | Grafana (usuario `admin`, contraseña en `secrets/grafana_admin_password.txt`) |
| http://localhost:9090 | Prometheus |

Con el override activo existe el usuario demo **demo@campusfind.edu / password123**.

## Desarrollo local sin Docker (con el MySQL de XAMPP)

```bash
# 1) API
cd backend && cp .env.example .env && npm install
npm run migrate          # crea solo las tablas que falten (reutiliza tu BD 'campusfind' de XAMPP)
npm run dev              # http://localhost:3000  (Swagger: /api/docs)

# 2) Microservicio Django (Python 3.12, MySQL 8 o MariaDB ≥ 10.5)
cd stats-service && python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt && cp .env.example .env              # usa el MISMO JWT_SECRET que la API
set -a && . ./.env && set +a && python manage.py runserver 8000

# 3) Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173 (proxy a :3000 y :8000)
```

> Las imágenes que ya tenías en `uploads/` se copiaron a `backend/uploads/`, así que los objetos existentes siguen mostrando su foto.

## Tests

```bash
cd backend && npm test                      # Jest + Supertest (SQLite en memoria)
cd stats-service && DB_ENGINE=sqlite DJANGO_SECRET_KEY=x python manage.py test
cd frontend && npm test                     # Vitest + Testing Library
npx newman run postman/CampusFind.postman_collection.json -e postman/CampusFind.local.postman_environment.json
node ai-testing/run-cases.mjs --base-url http://localhost:8080 --cases ai-testing/cases
```

Detalles en [`docs/TESTING.md`](docs/TESTING.md).

## Estructura

```
backend/         API Express + Sequelize + OAuth 2.1 (Dockerfile, tests, openapi.yaml)
stats-service/   Microservicio Django (DRF, Django ORM, JWT, Prometheus)
frontend/        SPA React (Vite) + gateway nginx
postman/         Colección y entorno de Postman
ai-testing/      Generación de casos con IA + ejecutor + casos base de seguridad
monitoring/      Prometheus (scrape + alertas) y Grafana (datasource + dashboard)
k8s/             Kustomize: base, overlays local/aws, monitoring
terraform/aws/   Infraestructura como código en AWS
.github/         Workflows CI/CD, Dependabot, CodeQL, plantilla de PR
docs/            Documentación técnica
legacy/          Versión PHP original (solo referencia)
```
