# Monitorización, observabilidad y escalabilidad

## Métricas expuestas

| Servicio | Endpoint | Librería | Métricas clave |
|---|---|---|---|
| API Express | `api:3000/metrics` | prom-client | `http_request_duration_seconds` (histograma por ruta/método/código), `http_requests_total`, métricas de proceso Node (event loop, heap, GC) |
| API — negocio | idem | prom-client | `campusfind_login_attempts_total{result}`, `campusfind_objects_created_total{status,category}`, `campusfind_messages_sent_total`, `campusfind_users_registered_total`, `campusfind_refresh_token_reuse_total` |
| Django | `stats:8000/metrics` | django-prometheus | peticiones por vista, latencias, consultas a BD |
| MySQL | `mysqld-exporter:9104` | mysqld_exporter | conexiones, consultas/s, InnoDB |

Las etiquetas `route` usan la plantilla (`/api/v1/objects/:id`) para mantener baja la cardinalidad.
`/metrics` no se publica a Internet: el gateway no lo enruta y la NetworkPolicy solo deja entrar al namespace `monitoring`.

## Prometheus
* Config: `monitoring/prometheus/prometheus.yml` (Compose) · `k8s/monitoring/servicemonitors.yaml` (Operator).
* Alertas (`alerts.yml`): servicio caído, tasa de 5xx > 5 %, p95 > 500 ms, posible fuerza bruta (> 30 logins fallidos/min) y **reutilización de refresh token** (indicio de robo de tokens).

## Grafana
Dashboard **CampusFind — Overview** aprovisionado automáticamente (`monitoring/grafana/dashboards/campusfind-overview.json`):
peticiones/s, ratio de errores, p50/p95/p99, respuestas por código, logins OK/fallidos, objetos y mensajes por hora,
tráfico del microservicio Django, memoria de procesos y estado de MySQL.

Compose: http://localhost:3001 (admin / `secrets/grafana_admin_password.txt`).
Kubernetes: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80`.

## Escalabilidad
* Servicios **stateless** (JWT) → réplicas idénticas detrás del Service.
* **HPA**: API 2→8 réplicas al 70 % de CPU; Django 1→4.
* Imágenes compartidas en **EFS** (`ReadWriteMany`) para que cualquier réplica las sirva.
* BD gestionada (RDS) con almacenamiento autoescalable y opción Multi-AZ.
* *Rolling updates* sin caída + PDB para mantenimientos del clúster.
* Siguiente paso sugerido: mover imágenes a S3 + CloudFront y cachear `/api/stats` (Redis) si el tráfico crece.
