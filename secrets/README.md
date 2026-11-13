# secrets/

Local-only secret files consumed by `docker-compose.yml` (mounted at `/run/secrets/*`).
Generate them with `./scripts/generate-secrets.sh` (Linux/macOS/Git Bash) or
`./scripts/generate-secrets.ps1` (PowerShell). **Everything in this folder except this
README is git-ignored.** In Kubernetes/AWS the same values come from AWS Secrets Manager
via External Secrets (see `docs/DESPLIEGUE.md`).
