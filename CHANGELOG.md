# Changelog
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [2.0.0] - 2026-11-12
### Añadido
- API REST v1 en Node.js/Express + Sequelize con errores RFC 9457 y contrato OpenAPI 3.0 (Swagger UI).
- Servidor de autorización OAuth 2.1 (Authorization Code + PKCE S256, refresh tokens rotados con detección de reutilización) y access tokens JWT.
- Microservicio de estadísticas en Django + DRF + Django ORM que valida los JWT.
- Cliente React (Vite) con el mismo diseño de la v1.
- Docker/Compose, Kubernetes (kustomize), Terraform para AWS, gestión de secretos, Prometheus + Grafana.
- CI/CD con GitHub Actions, colección Postman/Newman y generación de tests con IA.
### Seguridad
- Corregidos XSS almacenado, patrón de inyección SQL y ausencia de protección CSRF de la v1 (ver `docs/SEGURIDAD.md`).
### Cambiado
- La versión PHP pasa a `legacy/`.
