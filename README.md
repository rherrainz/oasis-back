# OasisJS Blogger Backend

API REST para OasisJS Blogger usando Node.js, Express, PostgreSQL, Prisma, JWT y Cloudinary.

## Datos del proyecto

- Autor: Rodrigo Herrainz
- Universidad / Facultad: Universidad Kennedy
- Materia: Sistemas Multiplataformas
- Sistema: OasisJS Blogger
- Repositorio backend: `https://github.com/rherrainz/oasis-back.git`
- Repositorio frontend: `https://github.com/rherrainz/oasis-front.git`

Consultar también el repositorio frontend para ver la interfaz web, rutas públicas, panel de administración y configuración de Vercel.

## Tecnologías usadas

- Lenguaje: JavaScript
- Runtime: Node.js
- Sistema de módulos: ES Modules (`type: module`)
- Framework HTTP: Express
- Base de datos: PostgreSQL
- ORM: Prisma
- Autenticación: JSON Web Token (`jsonwebtoken`)
- Hash de contraseñas: bcrypt
- Carga de archivos: Multer
- Repositorio de imágenes: Cloudinary
- Configuración de entorno: dotenv
- CORS: cors
- Desarrollo local: nodemon
- Gestor de paquetes: npm
- Hosting backend: Railway
- Configuración de deploy: `railway.json`

## Requisitos

- Node.js 18 o superior
- PostgreSQL
- Cuenta de Cloudinary

## Instalación local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

La API queda disponible en `http://localhost:3000`.

## Variables de entorno

```env
PORT=3000
DATABASE_URL=postgresql://usuario:password@host:puerto/db
FRONTEND_URL=http://localhost:5173
ADMIN_KEY=una_clave_inicial_segura
JWT_SECRET=un_secreto_largo_para_jwt
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`ADMIN_KEY` permite el primer acceso al panel sin tener un usuario creado. Luego se puede crear un usuario administrador desde `POST /api/users`.

## Endpoints principales

- `GET /api/posts`: lista posts publicados.
- `GET /api/posts/:slug`: detalle de un post publicado.
- `POST /api/auth/login`: login con `adminKey` o con `email` y `password`.
- `POST /api/users`: crea un administrador. Requiere JWT.
- `GET /api/admin/posts`: lista todos los posts. Requiere JWT.
- `POST /api/admin/posts`: crea un post. Requiere JWT.
- `PUT /api/admin/posts/:id`: edita un post. Requiere JWT.
- `DELETE /api/admin/posts/:id`: elimina un post. Requiere JWT.
- `POST /api/admin/upload`: sube imagen a Cloudinary con campo `image`. Requiere JWT.

Las rutas protegidas deben recibir:

```text
Authorization: Bearer TOKEN
```

## Crear primer administrador

Opción 1: usar la clave inicial.

```json
{
  "adminKey": "valor_de_ADMIN_KEY"
}
```

Enviar a `POST /api/auth/login`, guardar el JWT y crear un usuario con `POST /api/users`.

Opción 2: usar seed local.

El seed crea `admin@example.com` con contraseña `admin123`. Cambiarla antes de usar en un entorno real.

## Deploy en Railway

1. Crear un proyecto en Railway.
2. Agregar PostgreSQL y copiar la `DATABASE_URL`.
3. Configurar las variables de entorno del archivo `.env.example`.
4. Configurar `FRONTEND_URL` con el dominio de Vercel.
5. Ejecutar migraciones con `npm run prisma:migrate` desde Railway o localmente apuntando a la base de Railway.
6. Railway usa `railway.json` para generar Prisma Client durante el build y ejecutar `npm start`.

Railway define `PORT` automáticamente. El servidor usa `process.env.PORT`.
