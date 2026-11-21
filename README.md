# ControlBoard

Campus virtual todo en uno. Reúne cursos, contenido, anuncios, tareas, libro de notas y aulas virtuales con video, chat, pantalla compartida, pizarra colaborativa y grabaciones.
ss

## Stack

- **Next.js 16** (App Router, Server Actions) + React 19
- **Tailwind CSS 4** + componentes propios
- **Neon PostgreSQL** con `@neondatabase/serverless` (SQL directo, sin ORM)
- **Auth.js v5** con credenciales, sesiones JWT y bcrypt
- **LiveKit** para video, audio, pantalla compartida, chat y data channels
- **Excalidraw** para la pizarra colaborativa
- **Vercel Blob** para archivos de contenido y entregas
- **Neon** como único proveedor de base de datos

## Funcionalidad

- Registro e inicio de sesión con roles `SUPER_ADMIN`, `ADMIN`, `SECRETARY`, `PSYCHOLOGIST`, `INSTRUCTOR` y `STUDENT`.
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

Crea `.env` a partir de `.env.example` y copia la cadena **pooled** de tu proyecto Neon en `DATABASE_URL`. Para una base vacía, aplica el esquema y los datos demo:

```bash
npm run db:schema
npm run db:seed
npm run dev
```

Si la base ya existe con el esquema anterior, no vuelvas a aplicar `db:schema`: la migración solo cambió la capa de acceso a datos, no las tablas.

Abre `http://localhost:3000`.

### Credenciales demo

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Superadministrador | `superadmin@controlboard.dev` | `SuperAdmin123!` |
| Secretaría | `secretaria@controlboard.dev` | `Secretaria123!` |
| Psicología | `psicologia@controlboard.dev` | `Psicologia123!` |
| Administrador | `admin@controlboard.dev` | `Admin123!` |
| Docente | `instructor@controlboard.dev` | `Profe123!` |
| Estudiante | `estudiante@controlboard.dev` | `Estudiante123!` |
| Estudiante | `ana@controlboard.dev` | `Estudiante123!` |

Los cursos de ejemplo corresponden a 1° Medio A: Matemática, Lengua y Literatura, Ciencias Naturales, Historia, Inglés, Tecnología, Artes Visuales y Educación Física.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Cadena pooled de Neon (`-pooler`). |
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
npm run build        # next build
npm run start        # producción
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run db:schema    # aplica db/schema.sql (base vacía)
npm run db:seed      # datos demo
```

## Estructura

```text
db/
  schema.sql           Esquema completo para Neon
  seed.ts              Datos demo
src/
  app/
    (app)/             Zona autenticada: panel, cursos y sus tabs
    api/auth/          Handlers de Auth.js
    api/livekit/       Token de sala y control de grabación
    actions/           Server Actions por dominio
    login/ register/   Autenticación
  components/          Shell, tarjetas, formularios, LiveKit y pizarra
   lib/                 Cliente Neon, permisos y utilidades
  auth.ts              Configuración de Auth.js
```

## Despliegue en Vercel + Neon

1. Crea una base en Neon y copia la cadena **pooled** en `DATABASE_URL`.
2. Crea un proyecto en LiveKit Cloud y agrega `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET`.
3. Para archivos, conecta Vercel Blob y usa `BLOB_READ_WRITE_TOKEN`.
4. Para grabaciones, configura un bucket S3 y las variables `LIVEKIT_S3_*`. El usuario de S3 necesita permisos de escritura sobre el bucket.
5. Importa el repositorio en Vercel y define las variables de entorno.
6. Si la base está vacía, aplica el esquema con `npm run db:schema`.
7. Opcional: ejecuta `npm run db:seed` solo en entornos de demostración.
8. Despliega. El script de build es directamente `next build`.

## Notas y límites actuales

- La pizarra sincroniza snapshots del scene por data channel de LiveKit. Es suficiente para uso básico; para edición intensiva conviene mover la sincronización a un CRDT o a un servidor dedicado.
- La grabación usa LiveKit Egress. El estado de la grabación se marca como lista al detenerla; en producción conviene añadir un webhook de Egress para confirmar el archivo final y actualizar `Recording.status`.
- Los archivos requieren Vercel Blob. Sin token, las entregas por archivo muestran un error controlado; las entregas de texto siguen funcionando.
- El registro público crea únicamente estudiantes; las cuentas de personal se crean desde Administración.
- No hay notificaciones por correo ni foros. El calendario lista entregas y sesiones.
- No hay rate limiting en login ni en las rutas API.
- Las contraseñas demo del seed no deben usarse en producción.
# sitema-manuel-scorza-demo

## Secretaría y administración

El menú muestra `/administration` solo al personal autorizado. Secretaría gestiona cuentas de estudiantes y matrículas; Administración también gestiona docentes y Secretaría; Superadministración gestiona todos los roles. Se pueden buscar, crear, editar, activar o desactivar cuentas y establecer nuevas contraseñas. Ningún usuario puede editar su propia cuenta desde este panel. No se permite dejar el sistema sin superadministradores activos.

Las páginas, acciones y API de LiveKit consultan el estado y rol actuales en la base de datos: desactivar una cuenta bloquea sus siguientes solicitudes, incluso con una sesión JWT existente. Los tokens LiveKit ya emitidos conservan su vigencia hasta expirar; no se expulsa automáticamente a participantes ya conectados.

Las instalaciones existentes conservan su esquema; no hay cambios de DDL en esta migración. Para instalaciones nuevas, `npm run db:schema` crea el esquema completo. `npm run db:seed` incluye las cuentas demo de Secretaría y Superadministración; úsalo solo en una base de demostración, porque también actualiza cursos y cuentas demo existentes.

Para crear el primer superadministrador sin cargar datos de demostración, establece `BOOTSTRAP_EMAIL`, `BOOTSTRAP_NAME` y `BOOTSTRAP_PASSWORD` en el entorno y ejecuta `npm run admin:bootstrap`. El comando solo crea una cuenta nueva y se niega a ejecutarse si ya existe un superadministrador activo o el correo está ocupado.

Validación de la jerarquía de permisos: `npm run test:roles`.

## Asistencia

`/attendance` permite seleccionar curso y fecha (zona horaria `America/Lima`). También hay un acceso desde las pestañas de cada curso.

- El docente asignado, Secretaría, Administración y Superadministración pueden registrar y corregir asistencia.
- Los estudiantes solo ven su propia asistencia, observaciones y resumen mensual de los cursos a los que tienen acceso.
- Estados: presente, falta, tardanza y justificada. No se asignan faltas automáticamente a días o estudiantes sin registrar.
- Cada estudiante se guarda por separado, con una observación opcional de hasta 500 caracteres, visible para él. Se conserva quién hizo la última modificación y cuándo; no es un historial completo de cambios.
- Solo se crean registros para estudiantes activos matriculados. Los registros existentes se conservan al retirar la matrícula y pueden corregirse desde el panel de asistencia.
- No se permiten fechas futuras ni dos registros para el mismo estudiante, curso y día. Las versiones y transacciones evitan sobrescribir modificaciones concurrentes sin avisar.

En una base nueva, `npm run db:schema` incluye ambos módulos. Pruebas de fechas y permisos: `npm run test:attendance`.

## Gestión académica

`/academics` está disponible para Secretaría, Administración y Superadministración. Permite crear y editar años lectivos, periodos, grados (Inicial, Primaria y Secundaria) y secciones. Las secciones pertenecen a un año y un grado; los periodos pertenecen a un año, deben estar dentro de sus fechas y no pueden superponerse.

Los cursos existentes pueden vincularse a una sección y un periodo del mismo año, o desvincularse. Se mantienen sus matrículas, tareas, notas y asistencia, así como el texto original de `Course.term`. El listado de cursos muestra el año vinculado cuando existe, y la cabecera del curso muestra también la sección y el periodo. Esta primera versión vincula cada curso a un solo periodo; no divide las notas por bimestres ni matricula estudiantes directamente en una sección.

Cerrar un año bloquea la modificación de sus periodos, secciones y vinculaciones de cursos. No cierra clases ni bloquea notas o asistencia. Puede reabrirse desde el mismo panel. Un grado compartido por secciones de años cerrados no se puede modificar. No se eliminan registros desde este módulo.

Para una base nueva, `npm run db:schema` crea la estructura completa. Pruebas: `npm run test:academics`.

## Escalas de calificación configurables

Secretaría, Administración y Superadministración configuran `/grading-settings` por año lectivo y nivel (Inicial, Primaria, Secundaria). No se aplica ninguna escala automáticamente: hay que guardarla antes de registrar notas del periodo.

- Numérica: mínimo, máximo y 0, 1 o 2 decimales; por ejemplo 0–20 o 0–100.
- Letras/categorías: de 2 a 12 códigos únicos y sus descripciones. El formulario ofrece AD/A/B/C como ejemplo editable; no impone una escala oficial ni calcula equivalencias numéricas.
- La configuración de un año cerrado no se puede editar. Los cambios se versionan para detectar formularios abiertos con configuraciones anteriores.

En el curso aparece **Notas del periodo**, junto a **Notas de tareas**. El docente asignado o un administrador registra la nota y observación de cada estudiante activo matriculado, usando la sección y el periodo actualmente vinculados al curso. Deben pertenecer al mismo año abierto y tener una escala configurada para su nivel. Secretaría configura la escala, pero no registra calificaciones docentes.

Cada nota conserva una copia de la escala utilizada. Cambiar la configuración no modifica las notas existentes ni los puntos de las tareas. Al corregir una nota después de un cambio de escala, el docente debe ingresar explícitamente un nuevo valor; no hay conversión automática. Los estudiantes ven únicamente sus notas. La tabla muestra hasta los últimos 100 registros, con la escala original; no es un registro de auditoría de todas las ediciones.

Esta versión guarda notas del periodo directamente, visibles para el estudiante. El flujo borrador/revisión/cierre por bimestre, la generación de libretas, las ponderaciones y el cálculo automático desde tareas siguen pendientes.

Pruebas: `npm run test:grading`.

## Psicología

Administración y Superadministración pueden crear cuentas con el nuevo rol `PSYCHOLOGIST`. El módulo `/psychology` permite abrir una ficha por estudiante, asignarla al profesional desde su creación, coordinar citas y registrar seguimiento.

- Psicología y el personal autorizado pueden subir fichas PDF de hasta 4 MB; estudiantes pueden descargarlas desde una vista que no muestra derivaciones ni datos clínicos. Se requiere `BLOB_READ_WRITE_TOKEN`.
- En instalaciones existentes, aplica la migración con `npm run db:migrate:psychology-materials`. En bases nuevas, `npm run db:schema` ya incluye la tabla.
- Secretaría y administradores ven datos de derivación, profesional, estado de la ficha y citas. Pueden abrir derivaciones, programar y cancelar citas. No pueden leer ni registrar las notas de atención.
- El psicólogo ve únicamente sus fichas asignadas. Puede registrar notas de atención, marcar atención o inasistencia, cambiar el estado a pendiente/seguimiento/cerrado y reabrir fichas. No hay diagnósticos automáticos.
- Docentes, estudiantes y otros psicólogos no tienen acceso a fichas clínicas ajenas; los estudiantes solo ven los materiales publicados. Las páginas administrativas no consultan las notas clínicas; las acciones vuelven a verificar los permisos y el estado activo de la cuenta en el servidor.
- Las notas son entradas inmutables de hasta 5000 caracteres: una corrección se documenta con una nueva nota. El listado de seguimiento está paginado.
- Citas de 30, 45 o 60 minutos, en horario de Lima, sin cruces para el profesional ni el estudiante. Se muestran las próximas 20 citas y las 20 anteriores/canceladas más recientes por ficha. Reprogramar requiere cancelar y crear la nueva cita.
- Cerrar una ficha cancela sus citas futuras; conserva citas pasadas y seguimiento. Se permite añadir notas de corrección a fichas cerradas.

Esta primera versión no incluye transferencia de fichas entre profesionales, adjuntos clínicos, firma de consentimientos, exportaciones clínicas ni avisos automáticos. La privacidad descrita corresponde a los permisos de la aplicación; no se añadió cifrado de campos ni una auditoría de lectura.

Pruebas: `npm run test:psychology`.
