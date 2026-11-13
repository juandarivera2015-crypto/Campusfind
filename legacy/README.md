# CampusFind v1 (PHP + MySQL / XAMPP) — solo referencia

Versión original, conservada para comparar. **No desplegar**: contiene vulnerabilidades conocidas
(XSS almacenado en `script.js`, SQL concatenado en `get_messages.php`, sin protección CSRF) que se
documentan y corrigen en la v2 — ver [`../docs/SEGURIDAD.md`](../docs/SEGURIDAD.md).

Para seguir usándola en XAMPP, copia el contenido de esta carpeta a `htdocs/campusfind-legacy/`.
El esquema de `database.sql` es compatible con la v2: `npm run migrate` en `backend/` reutiliza esas tablas.
