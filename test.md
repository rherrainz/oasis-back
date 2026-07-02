# Suite de tests - Backend

Este repositorio usa Vitest y Supertest para probar la API Express sin depender de una base de datos real. Prisma se mockea desde `src/tests/prismaMock.js`.

## Comando principal

```bash
npm run test:run
```

También existe:

```bash
npm run test
npm run test:coverage
```

## Archivos de test

- `src/tests/auth.test.js`: login administrativo, protección por JWT, permisos de auditoría y lectura de logs.
- `src/tests/posts.test.js`: endpoints públicos de posts, filtros públicos, creación admin de posts y auditoría de creación/publicación.
- `src/tests/categories.test.js`: listado público de categorías y auditoría al crear categorías.
- `src/tests/tags.test.js`: listado público de tags.

## Cobertura funcional actual

La suite verifica:

- Login con `ADMIN_KEY` y emisión de JWT.
- Registro de auditoría para login exitoso con clave inicial.
- Bloqueo de rutas administrativas sin token.
- Bloqueo de `/api/admin/audit-logs` para usuarios sin rol `admin`.
- Consulta de logs de auditoría por usuario admin.
- Listado público de posts publicados.
- Detalle público de post por slug.
- Filtros públicos por texto, categoría, tag y autor.
- Creación de post con JWT.
- Registro de auditoría para `POST_CREATED` y `POST_PUBLISHED`.
- Listado público de categorías y tags.
- Registro de auditoría para `CATEGORY_CREATED`.

## Estrategia de mocks

Los tests no levantan PostgreSQL. En su lugar, `@prisma/client` se reemplaza por `prismaMock`, que expone mocks por modelo:

- `post`
- `user`
- `category`
- `tag`
- `auditLog`

Cada test ejecuta `resetPrismaMock()` en `beforeEach` para limpiar llamadas y respuestas anteriores.

## Variables usadas en tests

Los tests configuran valores mínimos en memoria:

```env
JWT_SECRET=test-secret
ADMIN_KEY=admin-test-key
FRONTEND_URL=http://localhost:5173
```

No requieren `DATABASE_URL`, Cloudinary ni una base activa.

## Logs durante tests

La API usa `pino-http`, por eso durante la suite aparecen logs JSON de requests. Es normal ver entradas `200`, `201`, `401` y `403` en casos donde el test valida permisos.

