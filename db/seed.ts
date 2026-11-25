import bcrypt from "bcryptjs";
import { db, newId } from "../src/lib/db";
import type {
  ContentType,
  Course,
  EnrollmentRole,
  LiveSessionStatus,
  Role,
} from "../src/lib/db-types";

type IdRow = { id: string };
type CourseRow = Pick<Course, "id" | "code" | "title">;

function firstId(rows: IdRow[]): string {
  const row = rows[0];
  if (!row) throw new Error("No se pudo obtener el identificador de la fila");
  return row.id;
}

function dueDate(daysFromNow: number, hour = 23, minute = 59) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function upsertUser(
  email: string,
  name: string,
  passwordHash: string,
  role: Role,
): Promise<string> {
  return firstId(await db.query<IdRow>(
    `INSERT INTO "User" ("id", "name", "email", "isActive", "passwordHash", "role", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, TRUE, $4, $5, NOW(), NOW())
     ON CONFLICT ("email") DO UPDATE
     SET "name" = EXCLUDED."name",
         "passwordHash" = EXCLUDED."passwordHash",
         "role" = EXCLUDED."role",
         "isActive" = TRUE,
         "updatedAt" = NOW()
     RETURNING "id"`,
    [newId(), name, email, passwordHash, role],
  ));
}

async function upsertCourse(
  sample: { code: string; title: string; description: string },
  instructorId: string,
): Promise<CourseRow> {
  const rows = await db.query<CourseRow>(
    `INSERT INTO "Course" ("id", "code", "title", "description", "term", "instructorId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("code") DO UPDATE
     SET "title" = EXCLUDED."title",
         "description" = EXCLUDED."description",
         "term" = EXCLUDED."term",
         "instructorId" = EXCLUDED."instructorId",
         "updatedAt" = NOW()
     RETURNING "id", "code", "title"`,
    [newId(), sample.code, sample.title, sample.description, "2026", instructorId],
  );
  const row = rows[0];
  if (!row) throw new Error("No se pudo crear el curso");
  return row;
}

async function ensureEnrollment(
  courseId: string,
  userId: string,
  role: EnrollmentRole,
): Promise<void> {
  await db.query<IdRow>(
    `INSERT INTO "Enrollment" ("id", "courseId", "userId", "role", "createdAt")
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT ("courseId", "userId") DO UPDATE
     SET "role" = EXCLUDED."role"
     RETURNING "id"`,
    [newId(), courseId, userId, role],
  );
}

async function ensureAssignment(
  courseId: string,
  title: string,
  data: { description: string; dueAt: Date; points: number },
): Promise<string> {
  const existing = await db.query<IdRow>(
    `SELECT "id" FROM "Assignment" WHERE "courseId" = $1 AND "title" = $2 LIMIT 1`,
    [courseId, title],
  );
  const current = existing[0];
  if (current) {
    return firstId(await db.query<IdRow>(
      `UPDATE "Assignment"
       SET "description" = $1, "dueAt" = $2, "points" = $3, "updatedAt" = NOW()
       WHERE "id" = $4
       RETURNING "id"`,
      [data.description, data.dueAt, data.points, current.id],
    ));
  }
  return firstId(await db.query<IdRow>(
    `INSERT INTO "Assignment" ("id", "courseId", "title", "description", "dueAt", "points", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING "id"`,
    [newId(), courseId, title, data.description, data.dueAt, data.points],
  ));
}

async function ensureSubmission(
  assignmentId: string,
  studentId: string,
  text: string,
  grade: number | null,
  feedback: string | null,
  gradedAt: Date | null,
): Promise<void> {
  await db.query<IdRow>(
    `INSERT INTO "Submission" ("id", "assignmentId", "studentId", "text", "grade", "feedback", "gradedAt", "submittedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT ("assignmentId", "studentId") DO UPDATE
     SET "text" = EXCLUDED."text",
         "grade" = EXCLUDED."grade",
         "feedback" = EXCLUDED."feedback",
         "gradedAt" = EXCLUDED."gradedAt"
     RETURNING "id"`,
    [newId(), assignmentId, studentId, text, grade, feedback, gradedAt],
  );
}

async function ensureAnnouncement(
  courseId: string,
  authorId: string,
  title: string,
  body: string,
): Promise<void> {
  const existing = await db.query<IdRow>(
    `SELECT "id" FROM "Announcement" WHERE "courseId" = $1 AND "title" = $2 LIMIT 1`,
    [courseId, title],
  );
  const current = existing[0];
  if (current) {
    await db.query(
      `UPDATE "Announcement"
       SET "body" = $1, "authorId" = $2, "updatedAt" = NOW()
       WHERE "id" = $3`,
      [body, authorId, current.id],
    );
    return;
  }
  await db.query(
    `INSERT INTO "Announcement" ("id", "courseId", "authorId", "title", "body", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [newId(), courseId, authorId, title, body],
  );
}

async function ensureContent(
  courseId: string,
  authorId: string,
  data: {
    title: string;
    type: ContentType;
    body?: string;
    url?: string;
    position: number;
  },
): Promise<void> {
  const existing = await db.query<IdRow>(
    `SELECT "id" FROM "ContentItem" WHERE "courseId" = $1 AND "title" = $2 LIMIT 1`,
    [courseId, data.title],
  );
  const current = existing[0];
  if (current) {
    await db.query(
      `UPDATE "ContentItem"
       SET "title" = $1, "type" = $2, "body" = $3, "url" = $4,
           "position" = $5, "authorId" = $6, "updatedAt" = NOW()
       WHERE "id" = $7`,
      [
        data.title,
        data.type,
        data.body ?? null,
        data.url ?? null,
        data.position,
        authorId,
        current.id,
      ],
    );
    return;
  }
  await db.query(
    `INSERT INTO "ContentItem" ("id", "courseId", "authorId", "title", "type", "body", "url", "position", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      newId(),
      courseId,
      authorId,
      data.title,
      data.type,
      data.body ?? null,
      data.url ?? null,
      data.position,
    ],
  );
}

async function ensureLiveSession(
  courseId: string,
  title: string,
  roomName: string,
  status: LiveSessionStatus,
  createdById: string,
): Promise<void> {
  const existing = await db.query<IdRow>(
    `SELECT "id" FROM "LiveSession" WHERE "courseId" = $1 AND "title" = $2 LIMIT 1`,
    [courseId, title],
  );
  if (existing.length) return;
  await db.query(
    `INSERT INTO "LiveSession" ("id", "courseId", "title", "roomName", "status", "createdById", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [newId(), courseId, title, roomName, status, createdById],
  );
}

async function main() {
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error("La carga demo está desactivada. Define ENABLE_DEMO_SEED=true solo en una base de demostración.");
  }
  await db.query("SELECT 1");

  const passwords = {
    superAdmin: "DemoCuenta01!",
    secretary: "DemoCuenta02!",
    psychologist: "DemoCuenta03!",
    admin: "DemoCuenta04!",
    instructor: "DemoCuenta05!",
    students: [
      "DemoCuenta06!",
      "DemoCuenta07!",
      "DemoCuenta08!",
      "DemoCuenta09!",
      "DemoCuenta10!",
      "DemoCuenta11!",
    ],
  };

  await upsertUser(
    "admin@controlboard.dev",
    "Administración",
    await bcrypt.hash(passwords.admin, 10),
    "ADMIN",
  );

  for (const account of [
    { email: "superadmin@controlboard.dev", name: "Superadministración", role: "SUPER_ADMIN" as Role, password: passwords.superAdmin },
    { email: "secretaria@controlboard.dev", name: "Secretaría", role: "SECRETARY" as Role, password: passwords.secretary },
    { email: "psicologia@controlboard.dev", name: "Psicología", role: "PSYCHOLOGIST" as Role, password: passwords.psychologist },
  ]) {
    await upsertUser(
      account.email,
      account.name,
      await bcrypt.hash(account.password, 10),
      account.role,
    );
  }

  const instructorId = await upsertUser(
    "instructor@controlboard.dev",
    "Laura Méndez",
    await bcrypt.hash(passwords.instructor, 10),
    "INSTRUCTOR",
  );

  const studentIds: string[] = [];
  const studentSeeds = [
    { name: "Diego Ramírez", email: "estudiante@controlboard.dev", password: passwords.students[0] },
    { name: "Ana Torres", email: "ana@controlboard.dev", password: passwords.students[1] },
    { name: "Camila Rojas", email: "camila@controlboard.dev", password: passwords.students[2] },
    { name: "Mateo Silva", email: "mateo@controlboard.dev", password: passwords.students[3] },
    { name: "Sofía Vega", email: "sofia@controlboard.dev", password: passwords.students[4] },
    { name: "Lucas Herrera", email: "lucas@controlboard.dev", password: passwords.students[5] },
  ];

  for (const seed of studentSeeds) {
    studentIds.push(
      await upsertUser(
        seed.email,
        seed.name,
        await bcrypt.hash(seed.password, 10),
        "STUDENT",
      ),
    );
  }

  const legacyCourseCodes = [
    "CS-101",
    "CAL-202620",
    "DAM-202620",
    "IOT-202620",
    "EDP-202620",
    "FSD-202620",
    "IND-202620",
    "PRS-202620",
  ];
  const placeholders = legacyCourseCodes.map((_, index) => `$${index + 1}`).join(", ");
  await db.query(
    `DELETE FROM "Course" WHERE "code" IN (${placeholders})`,
    legacyCourseCodes,
  );

  const demoCourses = [
    {
      code: "MAT-1MA",
      title: "Matemática 1° Medio A",
      description:
        "Números, álgebra, geometría y resolución de problemas cotidianos.",
      resource: {
        title: "Khan Academy en español",
        url: "https://es.khanacademy.org/math",
      },
      assignments: [
        {
          title: "Diagnóstico: números y operaciones",
          description:
            "Resuelve la evaluación inicial de números, operaciones y resolución de problemas.",
          days: -1,
          points: 40,
        },
        {
          title: "Guía de ejercicios: fracciones y decimales",
          description:
            "Completa la guía de fracciones, decimales y porcentajes mostrando el desarrollo de cada ejercicio.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: presupuesto familiar",
          description:
            "Elabora un presupuesto familiar aplicando porcentajes, operaciones y tablas de datos.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "LEN-1MA",
      title: "Lengua y Literatura 1° Medio A",
      description:
        "Comprensión lectora, escritura creativa y comunicación oral.",
      resource: {
        title: "Biblioteca Digital Escolar",
        url: "https://www.bibliotecadigitalescolar.cl/",
      },
      assignments: [
        {
          title: "Diagnóstico de comprensión lectora",
          description:
            "Lee el texto entregado y responde las preguntas de comprensión literal e inferencial.",
          days: -1,
          points: 40,
        },
        {
          title: "Análisis de un cuento latinoamericano",
          description:
            "Identifica narrador, personajes, conflicto y tema en el cuento trabajado en clases.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: antología del curso",
          description:
            "Crea un texto breve para la antología del curso y participa en la edición final.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "CNA-1MA",
      title: "Ciencias Naturales 1° Medio A",
      description:
        "Biología, física y química a través de la observación y la indagación.",
      resource: {
        title: "Simulaciones PhET",
        url: "https://phet.colorado.edu/es/",
      },
      assignments: [
        {
          title: "Diagnóstico: método científico",
          description:
            "Responde preguntas sobre observación, hipótesis, experimentación y conclusiones.",
          days: -1,
          points: 40,
        },
        {
          title: "Informe de laboratorio: ecosistemas",
          description:
            "Registra observaciones y conclusiones del laboratorio sobre componentes de un ecosistema.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: maqueta del ciclo del agua",
          description:
            "Construye una maqueta o modelo digital que explique las etapas del ciclo del agua.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "HIS-1MA",
      title: "Historia y Ciencias Sociales 1° Medio A",
      description:
        "Historia de Chile y el mundo, geografía y formación ciudadana.",
      resource: {
        title: "Memoria Chilena",
        url: "https://www.memoriachilena.gob.cl/",
      },
      assignments: [
        {
          title: "Diagnóstico: líneas de tiempo",
          description:
            "Ordena acontecimientos históricos y explica la relación entre causa y consecuencia.",
          days: -1,
          points: 40,
        },
        {
          title: "Análisis de fuentes: independencia",
          description:
            "Compara dos fuentes históricas sobre el proceso de independencia y responde las preguntas guía.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: museo histórico del curso",
          description:
            "Investiga un proceso histórico y prepara una ficha de museo con imágenes y fuentes.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "ING-1MA",
      title: "Inglés 1° Medio A",
      description:
        "Comunicación oral y escrita para situaciones de la vida cotidiana.",
      resource: {
        title: "British Council LearnEnglish",
        url: "https://learnenglish.britishcouncil.org/",
      },
      assignments: [
        {
          title: "Diagnóstico: comprensión lectora en inglés",
          description:
            "Read the short text and answer the comprehension questions in English.",
          days: -1,
          points: 40,
        },
        {
          title: "Writing practice: my daily routine",
          description:
            "Write a short paragraph about your daily routine using present simple and time expressions.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: presentación de mi ciudad",
          description:
            "Prepare a short oral presentation in English about your city, including places and activities.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "TEC-1MA",
      title: "Tecnología 1° Medio A",
      description:
        "Herramientas digitales, pensamiento computacional y ciudadanía digital.",
      resource: {
        title: "Code.org",
        url: "https://code.org/",
      },
      assignments: [
        {
          title: "Diagnóstico: ciudadanía digital",
          description:
            "Responde preguntas sobre seguridad, privacidad y uso responsable de internet.",
          days: -1,
          points: 40,
        },
        {
          title: "Práctica: hoja de cálculo",
          description:
            "Organiza datos del curso en una planilla y crea una gráfica con la información.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: página web del curso",
          description:
            "Diseña una página sencilla con información, imágenes y enlaces para presentar el curso.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "ART-1MA",
      title: "Artes Visuales 1° Medio A",
      description:
        "Exploración de técnicas, materiales y lenguaje visual.",
      resource: {
        title: "Google Arts & Culture",
        url: "https://artsandculture.google.com/",
      },
      assignments: [
        {
          title: "Diagnóstico: elementos del lenguaje visual",
          description:
            "Identifica línea, forma, color y textura en las imágenes presentadas.",
          days: -1,
          points: 40,
        },
        {
          title: "Práctica: boceto y color",
          description:
            "Realiza un boceto del natural y aplica una paleta de color justificando tus decisiones.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: galería del curso",
          description:
            "Crea una obra para la galería del curso y escribe una breve descripción artística.",
          days: 6,
          points: 120,
        },
      ],
    },
    {
      code: "EDF-1MA",
      title: "Educación Física y Salud 1° Medio A",
      description:
        "Movimiento, deportes, trabajo en equipo y hábitos saludables.",
      resource: {
        title: "OMS: actividad física",
        url: "https://www.who.int/es/news-room/fact-sheets/detail/physical-activity",
      },
      assignments: [
        {
          title: "Diagnóstico: condición física inicial",
          description:
            "Completa el registro inicial de tu condición física y tus hábitos de actividad.",
          days: -1,
          points: 40,
        },
        {
          title: "Bitácora de actividad física",
          description:
            "Registra durante la semana las actividades realizadas, su duración y tu nivel de esfuerzo.",
          days: 1,
          points: 100,
        },
        {
          title: "Proyecto: plan de vida saludable",
          description:
            "Diseña un plan semanal de actividad física, alimentación e hidratación para tu curso.",
          days: 6,
          points: 120,
        },
      ],
    },
  ];

  const courses: CourseRow[] = [];
  for (const sample of demoCourses) {
    courses.push(await upsertCourse(sample, instructorId));
  }

  for (const course of courses) {
    for (const studentId of studentIds) {
      await ensureEnrollment(course.id, studentId, "STUDENT");
    }
  }

  for (const [courseIndex, course] of courses.entries()) {
    const courseSeed = demoCourses[courseIndex]!;
    const courseAssignments = courseSeed.assignments;

    for (const [assignmentIndex, template] of courseAssignments.entries()) {
      const assignment = await ensureAssignment(course.id, template.title, {
        description: `${template.description}\n\nCurso: ${course.title} (${course.code}).`,
        dueAt: dueDate(template.days),
        points: template.points,
      });

      for (const [studentIndex, studentId] of studentIds.entries()) {
        const isDemoStudent = studentId === studentIds[0];
        const shouldSubmit = isDemoStudent
          ? assignmentIndex === 0
          : (courseIndex + assignmentIndex + studentIndex) % 4 !== 0;

        if (!shouldSubmit) continue;

        const leaveUngraded =
          assignmentIndex === 1 && (courseIndex + studentIndex) % 2 === 0;
        const grade = leaveUngraded
          ? null
          : Math.round(
              template.points *
                (0.68 +
                  ((courseIndex * 3 + studentIndex * 2 + assignmentIndex) % 28) /
                    100),
            );

        await ensureSubmission(
          assignment,
          studentId,
          `Entrega de "${template.title}" para ${course.code}.`,
          grade,
          leaveUngraded
            ? null
            : "Buen avance. Revisa la retroalimentación y continúa con la siguiente actividad.",
          leaveUngraded ? null : new Date(),
        );
      }
    }

    await ensureAnnouncement(
      course.id,
      instructorId,
      `Bienvenida a ${course.title}`,
      `Hola a todos. Este es el espacio oficial de ${course.code}. Revisa el contenido de la primera semana, revisa las tareas y escríbeme si tienes dudas.`,
    );
    await ensureAnnouncement(
      course.id,
      instructorId,
      "Recordatorio de entregas",
      "Recuerda revisar el calendario del curso. Las entregas se reciben desde la plataforma y puedes reemplazar tu respuesta antes de la fecha límite.",
    );

    await ensureContent(course.id, instructorId, {
      title: `Programa de ${course.code}`,
      type: "PAGE",
      body: `Semana 1: introducción y diagnóstico.\nSemana 2: conceptos clave y práctica guiada.\nSemana 3: proyecto de unidad.\nSemana 4: evaluación y cierre.`,
      position: 0,
    });
    await ensureContent(course.id, instructorId, {
      title: "Guía de estudio de la unidad",
      type: "PAGE",
      body: "Revisa el material de clase, completa la práctica guiada y prepara tus dudas para la sesión en vivo.",
      position: 1,
    });
    await ensureContent(course.id, instructorId, {
      title: courseSeed.resource.title,
      type: "LINK",
      url: courseSeed.resource.url,
      position: 2,
    });

    await ensureLiveSession(
      course.id,
      "Clase de bienvenida",
      `demo-${course.code.toLowerCase()}`,
      "SCHEDULED",
      instructorId,
    );
  }

  console.log("Seed completado.");
  console.log("Superadministrador: superadmin@controlboard.dev / DemoCuenta01!");
  console.log("Secretaría: secretaria@controlboard.dev / DemoCuenta02!");
  console.log("Psicología: psicologia@controlboard.dev / DemoCuenta03!");
  console.log("Administrador: admin@controlboard.dev / DemoCuenta04!");
  console.log("Docente: instructor@controlboard.dev / DemoCuenta05!");
  console.log("Estudiante: estudiante@controlboard.dev / DemoCuenta06!");
  console.log("Estudiante: ana@controlboard.dev / DemoCuenta07!");
  console.log("Estudiante: camila@controlboard.dev / DemoCuenta08!");
  console.log("Estudiante: mateo@controlboard.dev / DemoCuenta09!");
  console.log("Estudiante: sofia@controlboard.dev / DemoCuenta10!");
  console.log("Estudiante: lucas@controlboard.dev / DemoCuenta11!");
  console.log(`Cursos listos: ${courses.length}`);
  console.log(
    `Tareas listas: ${demoCourses.reduce((total, course) => total + course.assignments.length, 0)}`,
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
