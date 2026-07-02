# Auditoría y logs - Backend

El backend tiene dos capas de observabilidad:

- Logs HTTP operativos con `pino-http`.
- Auditoría persistente de acciones relevantes en la tabla `AuditLog`.

## Logs HTTP

La configuración está en `src/app.js` y `src/utils/logger.js`.

Cada request registra:

- Método HTTP.
- URL.
- IP.
- User agent.
- Código de respuesta.
- Tiempo de respuesta.

La ruta `/api/health` se ignora para evitar ruido.

El logger redacta datos sensibles como:

- `authorization`
- cookies
- passwords
- tokens
- `JWT_SECRET`
- `ADMIN_KEY`
- `DATABASE_URL`
- `CLOUDINARY_API_SECRET`

El nivel se controla con:

```env
LOG_LEVEL=info
```

## Auditoría persistente

El modelo está en `prisma/schema.prisma`:

```prisma
model AuditLog
```

La migración está en:

```text
prisma/migrations/20260701220000_add_audit_logs/migration.sql
```

Campos principales:

- `userId`
- `userEmail`
- `action`
- `entity`
- `entityId`
- `detail`
- `ipAddress`
- `userAgent`
- `createdAt`

## Eventos registrados

Las acciones disponibles están en `src/utils/auditLogger.js`:

- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `USER_CREATED`
- `POST_CREATED`
- `POST_UPDATED`
- `POST_DELETED`
- `POST_PUBLISHED`
- `POST_UNPUBLISHED`
- `CATEGORY_CREATED`
- `CATEGORY_UPDATED`
- `CATEGORY_DELETED`
- `IMAGE_UPLOADED`

## Consulta de auditoría

Endpoint:

```http
GET /api/admin/audit-logs
```

Requiere:

```text
Authorization: Bearer TOKEN
```

Solo pueden consultar usuarios con rol `admin`.

Filtros soportados:

- `action`
- `entity`
- `userEmail`
- `from`
- `to`

Ejemplo:

```http
GET /api/admin/audit-logs?action=POST_CREATED&userEmail=admin@example.com&from=2026-07-01&to=2026-07-02
```

La respuesta devuelve hasta 200 registros ordenados por `createdAt desc`.

## Comportamiento ante fallas

Si falla la escritura de auditoría, `createAuditLog` registra el error operativo y devuelve `null`. La operación principal no se bloquea por un fallo del log de auditoría.

