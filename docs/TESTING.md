# Estrategia de pruebas

| Nivel | Herramienta | Qué cubre | Comando |
|---|---|---|---|
| Unitarias/integración API | **Jest + Supertest** (SQLite en memoria) | OAuth 2.1/PKCE, rotación de refresh, JWT, CRUD, BOLA, SQLi, XSS, cabeceras, métricas, OpenAPI | `cd backend && npm test` |
| Microservicio | **Django TestCase + DRF APIClient** | Agregaciones ORM, validación, JWT (firma/exp/aud) | `cd stats-service && DB_ENGINE=sqlite DJANGO_SECRET_KEY=x python manage.py test` |
| Frontend | **Vitest + Testing Library** | Escapado XSS en tarjetas, PKCE en el navegador | `cd frontend && npm test` |
| Contrato/E2E | **Postman + Newman** | Flujo completo contra el stack Docker (32 peticiones con aserciones) | ver abajo |
| Documentación viva | **Swagger UI** | Prueba manual de cada endpoint con "Try it out" | `/api/docs/` |
| Seguridad dirigida | **Casos declarativos** (`ai-testing/cases`) | 27 casos OWASP base + los generados por IA | `node ai-testing/run-cases.mjs …` |
| Estática | ESLint, CodeQL, Trivy, `terraform validate`, kubeconform | Código, IaC y manifiestos | CI |

## Postman / Newman

```bash
docker compose up -d --build
npx newman run postman/CampusFind.postman_collection.json \
  -e postman/CampusFind.local.postman_environment.json --reporters cli,htmlextra
```

Orden de carpetas: `0. Setup` → `1. OAuth 2.1` → `2. Objects` → `3. Messages` → `4. Security (OWASP)` → `5. Stats (Django)` → `6. Cleanup`.
Los *pre-request scripts* generan `code_verifier`/`code_challenge` y los *tests* guardan tokens, CSRF e IDs en variables de colección.

## Inteligencia artificial aplicada al testing

`ai-testing/generate-cases.mjs` envía el contrato OpenAPI a **Claude** (API de Anthropic) y le pide casos
negativos, de frontera y de seguridad (OWASP API Top 10, mal uso de OAuth 2.1) en un formato JSON declarativo.
`ai-testing/run-cases.mjs` los ejecuta contra un stack efímero creando usuarios y objetos de prueba.

```bash
export ANTHROPIC_API_KEY=...            # opcional: ANTHROPIC_MODEL=claude-sonnet-5-5
node ai-testing/generate-cases.mjs --spec backend/src/docs/openapi.yaml --out ai-testing/generated/cases.ai.json --count 30
node ai-testing/run-cases.mjs --base-url http://localhost:8080 --cases ai-testing/generated
```

Principios:
1. **Humano en el bucle**: lo generado va a `ai-testing/generated/` (ignorado por git) y en CI se sube como artefacto; solo los casos revisados se mueven a `ai-testing/cases/`.
2. **Guardarraíles**: el generador descarta casos con métodos no permitidos o URLs absolutas (no puede apuntar fuera de la API) y todo se ejecuta contra un entorno desechable.
3. **Determinismo**: los casos aprobados quedan versionados y se ejecutan en cada CI sin llamar a la IA.

El workflow `.github/workflows/ai-tests.yml` lo automatiza semanalmente (activar con la variable `AI_TESTING_ENABLED=true` y el secreto `ANTHROPIC_API_KEY`).
Otras herramientas de IA compatibles con este enfoque: **Postbot** de Postman (genera tests de la colección), asistentes de código para escribir tests unitarios y *fuzzers* guiados por el contrato como Schemathesis.
