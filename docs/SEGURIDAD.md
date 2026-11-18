# Seguridad (OWASP)

> **Nota sobre "OWASP Top 10 2023":** la edición 2023 de OWASP es el **API Security Top 10 (2023)**,
> que es la lista adecuada para una API REST como esta. Las inyecciones SQL/XSS y el CSRF pertenecen
> al Top 10 de aplicaciones web (A03 *Injection*, A01 *Broken Access Control*). Abajo se cubren ambas.

## Vulnerabilidades encontradas en la v1 (PHP) y cómo se corrigen

| v1 (`legacy/`) | Riesgo | v2 |
|---|---|---|
| `script.js → buildCard()` y `loadMessages()` insertan `name`, `description`, `message`… con `innerHTML` | **XSS almacenado**: cualquier usuario podía ejecutar JS en el navegador de otros | React renderiza texto escapado; ESLint `react/no-danger`; CSP `script-src 'self'`; `safeImageSrc()` solo admite `uploads/…` |
| `onclick="openContact(…,'${obj.user_name}',…)"` | XSS por ruptura de comillas en un atributo | Manejadores de eventos de React, sin HTML construido a mano |
| `get_messages.php`: `UPDATE … WHERE receiver_id = $user_id` (concatenado) | Patrón de **inyección SQL** | Todo el SQL pasa por Sequelize / Django ORM con parámetros enlazados |
| Sesión PHP por cookie y sin token anti-CSRF en `save_object.php`, `send_message.php` | **CSRF** | La API usa `Authorization: Bearer` (el navegador no lo envía solo); los únicos endpoints con cookie (`/oauth/token` refresh y `/oauth/revoke`) exigen *double-submit* `X-CSRF-Token` + `SameSite=Strict` |
| Validación por `mime_content_type` + extensión del usuario | Subida de HTML/SVG disfrazado | Detección por *magic bytes*, extensión decidida por el servidor, nombre UUID, `nosniff` + CSP `sandbox` al servirlas |
| `get_objects.php` devuelve `u.email` del dueño | Exposición excesiva de datos | DTO explícito: solo `user_name` y `contact_email` elegido por el usuario |
| Usuario demo `root` sin contraseña en `config.php` | Credenciales por defecto | Usuario de BD dedicado y secretos en ficheros / Secrets Manager |
| Contraseña mínima de 6 caracteres, sin límite de intentos | Fuerza bruta | Mínimo 8, bcrypt coste 12, *rate limit* 20 intentos/15 min y alerta Prometheus |
| `localStorage.cf_user` decide si "estás logueado" | Estado de auth manipulable | La sesión la decide el servidor (JWT verificado / refresh cookie HttpOnly) |

## Inyección SQL
* Consultas solo a través de ORMs con *bound parameters* (`Op.like`, `findByPk`, `.filter()`); cero SQL concatenado.
* Los comodines `%` y `_` del usuario se escapan (`utils/sql.js`) para evitar escaneos costosos.
* Validación previa con **zod** (tipos, longitudes, enumeraciones) y rutas `/:id(\d+)`.
* Tests: `backend/tests/security.test.js`, `ai-testing/cases/baseline.security.json`, carpeta *Security* de Postman.

## XSS
* **Salida**: React/JSX escapa; nada de `dangerouslySetInnerHTML`.
* **Cabeceras**: CSP estricta en nginx y en Express, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
* **Tokens fuera del alcance de XSS**: refresh token HttpOnly; access token solo en memoria (15 min).
* Test de regresión: `frontend/src/__tests__/ObjectCard.test.jsx`.

## CSRF
* API sin cookies de autenticación → no es *CSRF-able*.
* Cookies de sesión OAuth: `HttpOnly`, `SameSite=Strict`, `Path=/oauth`, `Secure` en HTTPS.
* *Double-submit cookie* (`cf_csrf` ↔ `X-CSRF-Token`, comparación en tiempo constante).
* El parámetro `state` de OAuth protege el flujo de login contra CSRF/mix-up.

## OWASP API Security Top 10 (2023)

| # | Riesgo | Medida |
|---|---|---|
| API1 | Broken Object Level Authorization | `loadOwned()` en PATCH/DELETE de objetos; bandeja filtrada por `receiver_id` del token |
| API2 | Broken Authentication | OAuth 2.1 + PKCE, JWT verificado (alg, iss, aud, exp), rotación y detección de reutilización, *rate limit*, respuesta idéntica para usuario inexistente (anti-enumeración, hash ficticio) |
| API3 | Broken Object Property Level Authorization | Esquemas zod `.strict()` (sin *mass assignment*), DTOs de salida explícitos, `defaultScope` sin `password` |
| API4 | Unrestricted Resource Consumption | `limit ≤ 50`, cuerpo JSON ≤ 100 KB, imagen ≤ 5 MB, *rate limiting*, HPA |
| API5 | Broken Function Level Authorization | *Scopes* OAuth por endpoint |
| API6 | Unrestricted Access to Sensitive Business Flows | Límite en registro/login; no se puede escribir a uno mismo |
| API7 | SSRF | La API nunca descarga URLs proporcionadas por el usuario |
| API8 | Security Misconfiguration | Helmet, CORS con lista blanca, sin `X-Powered-By`, errores sin *stack trace*, contenedores *non-root* y FS de solo lectura, PSA `restricted` |
| API9 | Improper Inventory Management | API versionada (`/api/v1`), OpenAPI como inventario, `/metrics` y `/health` no expuestos por el gateway |
| API10 | Unsafe Consumption of APIs | Django valida el JWT por su cuenta (no confía en el gateway) |

## Riesgos aceptados (revisión de dependencias, nov. 2026)

`npm audit` reporta hallazgos cuya única corrección es un cambio de versión mayor (*breaking change*).
Se analizaron y se aceptan temporalmente; el CI bloquea los de severidad **crítica**.

| Paquete | Severidad | Advisory | Por qué no es explotable en CampusFind | Plan |
|---|---|---|---|---|
| `zod` 3.x (y la copia interna de `@vercel/blob`) | Alta | GHSA-mrhx-c7xc-m3w5: consumo de memoria al validar colecciones enormes con restricciones | Los esquemas solo validan objetos planos (sin arrays/sets) y Express limita el cuerpo a 100 KB y los formularios a 20 campos | Migrar a zod 4 (cambia la API de mensajes de error) |
| `uuid` < 11.1.1 (dependencia de Sequelize) | Moderada | GHSA-w5hq-g745-h8pq: falta validación de límites cuando se pasa `buf` | La app no llama a `uuid` con buffer; usa `crypto.randomUUID()` | Esperar versión de Sequelize que actualice `uuid` |

## Cadena de suministro y secretos
* CodeQL, Trivy (vulnerabilidades, secretos y *misconfig*), `npm audit`, `pip-audit`, Dependabot.
* Imágenes ECR inmutables con *scan on push*, SBOM y *provenance* en el build.
* Ver [gestión de secretos](DESPLIEGUE.md#gestión-de-secretos).
