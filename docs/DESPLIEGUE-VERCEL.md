# Despliegue gratuito: Vercel + Neon (Postgres)

| Pieza | Dónde corre | Plan gratuito |
|---|---|---|
| Frontend React (Vite) | Vercel — proyecto `campusfind-umb` | Hobby |
| API Express + OAuth 2.1 | Vercel Function — proyecto `campusfind-api-umb` | Hobby |
| Microservicio Django | Vercel Function (Python) — proyecto `campusfind-stats-umb` | Hobby |
| Base de datos | **Neon** (Postgres serverless) | Free (1 GB por proyecto) |
| Imágenes subidas | **Vercel Blob** | Hobby (1 GB) |

```
navegador ──► campusfind-umb.vercel.app ──rewrites──► campusfind-api-umb.vercel.app  ─┐
                (React + CSP)                      └► campusfind-stats-umb.vercel.app ─┴─► Neon Postgres
```
El frontend reenvía `/api`, `/oauth` y `/.well-known` a los backends (`frontend/vercel.json`), así el navegador
habla con **un solo dominio** y las cookies OAuth (`SameSite=Strict`) siguen funcionando.

La app soporta los dos motores: **MySQL** en local/Docker y **Postgres** cuando existe `DATABASE_URL`
(Sequelize y Django ORM se encargan; el CI prueba ambos).

## 1. Neon
1. Crea la cuenta en neon.com → **New project** → nombre `campusfind`, región **AWS US East (N. Virginia)** (la misma de Vercel por defecto).
2. Botón **Connect**: copia dos cadenas de conexión:
   * **Pooled** (host con `-pooler`): para Vercel.
   * **Direct** (desactiva *Connection pooling*): para las migraciones.

## 2. Crear las tablas (GitHub Actions)
1. GitHub → **Settings → Secrets and variables → Actions → New repository secret**: `NEON_DATABASE_URL` = cadena **Direct**.
2. **Actions → Migrate Neon database → Run workflow**, marca *seed* si quieres el usuario demo (`demo@campusfind.edu` / `password123`).
   Después se ejecuta solo cada vez que llegue a `main` un cambio en `backend/src/db` o `backend/src/models`.

## 3. Vercel (tres proyectos del mismo repositorio)
Entra a vercel.com con tu cuenta de GitHub. Para cada fila: **Add New → Project → Import** `Campusfind`,
cambia **Project Name** y **Root Directory**, añade las variables y pulsa **Deploy**.

| Project Name | Root Directory | Framework | Variables de entorno |
|---|---|---|---|
| `campusfind-api-umb` | `backend` | Express | ver tabla A |
| `campusfind-stats-umb` | `stats-service` | Django | ver tabla B |
| `campusfind-umb` | `frontend` | Vite | (ninguna) |

**A. API** (`campusfind-api-umb`)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | cadena **Pooled** de Neon |
| `JWT_SECRET` | 48+ caracteres aleatorios (ver abajo) |
| `PUBLIC_URL` | `https://campusfind-umb.vercel.app` |
| `CORS_ORIGINS` | `https://campusfind-umb.vercel.app` |
| `OAUTH_REDIRECT_URIS` | `https://campusfind-umb.vercel.app/callback` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `true` |
| `MAX_UPLOAD_MB` | `4` |

Luego, en el proyecto: **Storage → Create → Blob → Connect** (añade `BLOB_READ_WRITE_TOKEN`) y **Deployments → Redeploy**.

**B. Stats** (`campusfind-stats-umb`)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | cadena **Pooled** de Neon |
| `JWT_SECRET` | **el mismo** que en la API |
| `DJANGO_SECRET_KEY` | otro valor aleatorio |
| `DJANGO_ALLOWED_HOSTS` | `campusfind-stats-umb.vercel.app` |

Generar valores aleatorios en PowerShell:
```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

> Si Vercel te asigna otro dominio (porque el nombre ya existía), revísalo en **Settings → Domains** de cada proyecto
> y actualiza `frontend/vercel.json` y las variables `PUBLIC_URL`, `CORS_ORIGINS`, `OAUTH_REDIRECT_URIS`, `DJANGO_ALLOWED_HOSTS`.

## 4. Despliegue automático desde `main`
La integración de Vercel con GitHub queda activa al importar: **cada push/merge a `main` publica en producción**
los tres proyectos; las demás ramas (`develop`, `feature/*`) generan URLs de *preview*.
Para no reconstruir proyectos que no cambiaron: en cada proyecto, **Settings → Build and Deployment → Root Directory →
"Skip deployments when there are no changes to the root directory or its dependencies"**.

## Diferencias frente a Docker
* Prometheus/Grafana no aplican a funciones serverless: usa **Observability** y **Logs** de cada proyecto de Vercel.
* Primer acceso tras un rato sin uso: Neon y las funciones "despiertan" (1–3 s).
* Imágenes hasta 4 MB (límite de cuerpo de las Vercel Functions).
* El plan Hobby es para uso personal / no comercial.
