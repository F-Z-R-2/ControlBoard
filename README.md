# ControlBoard

Campus virtual todo en uno. Reúne cursos, contenido, anuncios, tareas, libro de notas y aulas virtuales con video, chat, pantalla compartida, pizarra colaborativa y grabaciones.

## Stack

- **Next.js 16** (App Router, Server Actions) + React 19
- **Tailwind CSS 4** + componentes propios
- **PostgreSQL + Prisma 6**
- **Auth.js v5** con credenciales, sesiones JWT y bcrypt
- **LiveKit** para video, audio, pantalla compartida, chat y data channels
- **Excalidraw** para la pizarra colaborativa
- **Vercel Blob** para archivos de contenido y entregas
- **Neon** como PostgreSQL recomendado en producción

## Funcionalidad

- Registro e inicio de sesión con roles `ADMIN`, `INSTRUCTOR` y `STUDENT`.
- Cursos con código único, periodo, docente y matrícula por código.
- Contenido tipo página, enlace o archivo.
- Anuncios por curso.
- Tareas con fecha límite, puntaje, entregas de texto/archivo, calificación y retroalimentación.
- Libro de notas con consolidado por estudiante.
- Listado de personas del curso.
- Aulas virtuales LiveKit:
  - Video y audio grupal.
  - Chat en vivo.
  - Pantalla compartida y controles de LiveKit.
  - Pizarra Excalidraw sincronizada por data channels.
  - Grabación con LiveKit Egress hacia S3.
- Autorización por curso en páginas, acciones y rutas API.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL local o Neon
- Proyecto de LiveKit Cloud (opcional para probar el video)
- Bucket S3 compatible (opcional para grabaciones)
- Token de Vercel Blob (opcional para archivos)

## Desarrollo local

```bash
npm install
```

Crea `.env` a partir de `.env.example`. Para una base local sin Docker:

```bash
npx prisma dev --detach --name controlboard
npx prisma dev ls
```

Copia la URL TCP que imprime `prisma dev ls` en `DATABASE_URL` y `DIRECT_URL`, añadiendo `&pgbouncer=true` a `DATABASE_URL` para que Prisma no use prepared statements a través del proxy de `prisma dev`. Luego:

```bash
npx prisma db push
npm run db:generate
npm run db:seed
npm run dev
```

Abre `http://localhost:3000`.

### Credenciales demo

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@controlboard.dev` | `Admin123!` |
| Docente | `instructor@controlboard.dev` | `Profe123!` |
| Estudiante | `estudiante@controlboard.dev` | `Estudiante123!` |
| Estudiante | `ana@controlboard.dev` | `Estudiante123!` |

Los cursos de ejemplo corresponden a 1° Medio A: Matemática, Lengua y Literatura, Ciencias Naturales, Historia, Inglés, Tecnología, Artes Visuales y Educación Física.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Cadena pooled de Neon o URL local. |
| `DIRECT_URL` | Sí | Cadena directa de Neon para Prisma. |
| `AUTH_SECRET` | Sí | Secreto de Auth.js. |
| `AUTH_TRUST_HOST` | Recomendada | `true` detrás de Vercel/proxy. |
| `NEXT_PUBLIC_LIVEKIT_URL` | Para video | URL `wss://` del proyecto LiveKit. |
| `LIVEKIT_API_KEY` | Para video | API key de LiveKit. |
| `LIVEKIT_API_SECRET` | Para video | API secret de LiveKit. |
| `LIVEKIT_URL` | No | Host para Egress; si falta se usa `NEXT_PUBLIC_LIVEKIT_URL`. |
| `LIVEKIT_S3_ACCESS_KEY` | Para grabar | Credencial S3. |
| `LIVEKIT_S3_SECRET` | Para grabar | Secreto S3. |
| `LIVEKIT_S3_BUCKET` | Para grabar | Bucket de grabaciones. |
| `LIVEKIT_S3_REGION` | Para grabar | Región del bucket. |
| `LIVEKIT_S3_ENDPOINT` | No | Endpoint para S3 compatible (MinIO, R2, etc.). |
| `LIVEKIT_S3_FORCE_PATH_STYLE` | No | `true` para endpoints con path style. |
| `BLOB_READ_WRITE_TOKEN` | Para archivos | Token de Vercel Blob. |

Genera `AUTH_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Scripts

```bash
npm run dev          # desarrollo
npm run build        # prisma generate + next build
npm run start        # producción
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run db:generate  # Prisma Client
npm run db:push      # sincroniza el esquema
npm run db:migrate   # crea migraciones
npm run db:seed      # datos demo
```

## Estructura

```text
prisma/
  schema.prisma        Modelo de datos
  seed.ts              Datos demo
src/
  app/
    (app)/             Zona autenticada: panel, cursos y sus tabs
    api/auth/          Handlers de Auth.js
    api/livekit/       Token de sala y control de grabación
    actions/           Server Actions por dominio
    login/ register/   Autenticación
  components/          Shell, tarjetas, formularios, LiveKit y pizarra
  lib/                 Prisma, permisos y utilidades
  auth.ts              Configuración de Auth.js
```

## Despliegue en Vercel + Neon

1. Crea una base en Neon y copia la cadena **pooled** en `DATABASE_URL` (con `&pgbouncer=true`) y la **direct** en `DIRECT_URL`.
2. Crea un proyecto en LiveKit Cloud y agrega `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET`.
3. Para archivos, conecta Vercel Blob y usa `BLOB_READ_WRITE_TOKEN`.
4. Para grabaciones, configura un bucket S3 y las variables `LIVEKIT_S3_*`. El usuario de S3 necesita permisos de escritura sobre el bucket.
5. Importa el repositorio en Vercel y define las variables de entorno.
6. Aplica el esquema a Neon:
   ```bash
   npx prisma db push
   ```
   Para un flujo productivo, usa `npm run db:migrate` y versiona las migraciones.
7. Opcional: ejecuta `npm run db:seed` solo en entornos de demostración.
8. Despliega. El script de build ejecuta `prisma generate` automáticamente.

## Notas y límites actuales

- La pizarra sincroniza snapshots del scene por data channel de LiveKit. Es suficiente para uso básico; para edición intensiva conviene mover la sincronización a un CRDT o a un servidor dedicado.
- La grabación usa LiveKit Egress. El estado de la grabación se marca como lista al detenerla; en producción conviene añadir un webhook de Egress para confirmar el archivo final y actualizar `Recording.status`.
- Los archivos requieren Vercel Blob. Sin token, las entregas por archivo muestran un error controlado; las entregas de texto siguen funcionando.
- El registro permite elegir rol `INSTRUCTOR` para facilitar la demo. En producción conviene restringirlo o aprobarlo por un administrador.
- No hay notificaciones por correo, foros ni calendario.
- No hay rate limiting en login ni en las rutas API.
- Las contraseñas demo del seed no deben usarse en producción.
