import {
  ContentType,
  EnrollmentRole,
  LiveSessionStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function dueDate(daysFromNow: number, hour = 23, minute = 59) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function ensureAssignment(
  courseId: string,
  title: string,
  data: {
    description: string;
    dueAt: Date;
    points: number;
  },
) {
  const existing = await prisma.assignment.findFirst({
    where: { courseId, title },
  });

  if (existing) {
    return prisma.assignment.update({ where: { id: existing.id }, data });
  }

  return prisma.assignment.create({
    data: { courseId, title, ...data },
  });
}

async function ensureAnnouncement(
  courseId: string,
  authorId: string,
  title: string,
  body: string,
) {
  const existing = await prisma.announcement.findFirst({
    where: { courseId, title },
  });

  if (existing) {
    return prisma.announcement.update({
      where: { id: existing.id },
      data: { body, authorId },
    });
  }

  return prisma.announcement.create({
    data: { courseId, authorId, title, body },
  });
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
) {
  const existing = await prisma.contentItem.findFirst({
    where: { courseId, title: data.title },
  });

  if (existing) {
    return prisma.contentItem.update({
      where: { id: existing.id },
      data: { ...data, authorId },
    });
  }

  return prisma.contentItem.create({
    data: { courseId, authorId, ...data },
  });
}

async function main() {
  const passwords = {
    admin: await bcrypt.hash("Admin123!", 10),
    instructor: await bcrypt.hash("Profe123!", 10),
    student: await bcrypt.hash("Estudiante123!", 10),
  };

  await prisma.user.upsert({
    where: { email: "admin@controlboard.dev" },
    update: { name: "Administración", passwordHash: passwords.admin, role: Role.ADMIN, isActive: true },
    create: {
      name: "Administración",
      email: "admin@controlboard.dev",
      passwordHash: passwords.admin,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  for (const account of [
    { email: "superadmin@controlboard.dev", name: "Superadministración", role: Role.SUPER_ADMIN, password: "SuperAdmin123!" },
    { email: "secretaria@controlboard.dev", name: "Secretaría", role: Role.SECRETARY, password: "Secretaria123!" },
    { email: "psicologia@controlboard.dev", name: "Psicología", role: Role.PSYCHOLOGIST, password: "Psicologia123!" },
  ]) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role, passwordHash: await bcrypt.hash(account.password, 10), isActive: true },
      create: { email: account.email, name: account.name, role: account.role, passwordHash: await bcrypt.hash(account.password, 10), isActive: true },
    });
  }

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@controlboard.dev" },
    update: {
      passwordHash: passwords.instructor,
      role: Role.INSTRUCTOR,
      name: "Laura Méndez",
      isActive: true,
    },
    create: {
      name: "Laura Méndez",
      email: "instructor@controlboard.dev",
      passwordHash: passwords.instructor,
      role: Role.INSTRUCTOR,
      isActive: true,
    },
  });

  const students = [];
  const studentSeeds = [
    { name: "Diego Ramírez", email: "estudiante@controlboard.dev" },
    { name: "Ana Torres", email: "ana@controlboard.dev" },
    { name: "Camila Rojas", email: "camila@controlboard.dev" },
    { name: "Mateo Silva", email: "mateo@controlboard.dev" },
    { name: "Sofía Vega", email: "sofia@controlboard.dev" },
    { name: "Lucas Herrera", email: "lucas@controlboard.dev" },
  ];

  for (const seed of studentSeeds) {
    students.push(
      await prisma.user.upsert({
        where: { email: seed.email },
        update: {
          passwordHash: passwords.student,
          role: Role.STUDENT,
          name: seed.name,
          isActive: true,
        },
        create: {
          name: seed.name,
          email: seed.email,
          passwordHash: passwords.student,
          role: Role.STUDENT,
          isActive: true,
        },
      }),
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

  await prisma.course.deleteMany({
    where: { code: { in: legacyCourseCodes } },
  });

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

  const courses = [];
  for (const sample of demoCourses) {
    courses.push(
      await prisma.course.upsert({
        where: { code: sample.code },
        update: {
          title: sample.title,
          description: sample.description,
          term: "2026",
          instructorId: instructor.id,
        },
        create: {
          code: sample.code,
          title: sample.title,
          description: sample.description,
          term: "2026",
          instructorId: instructor.id,
        },
      }),
    );
  }

  for (const course of courses) {
    for (const learner of students) {
      await prisma.enrollment.upsert({
        where: {
          courseId_userId: { courseId: course.id, userId: learner.id },
        },
        update: { role: EnrollmentRole.STUDENT },
        create: {
          courseId: course.id,
          userId: learner.id,
          role: EnrollmentRole.STUDENT,
        },
      });
    }
  }

  for (const [courseIndex, course] of courses.entries()) {
    const courseSeed = demoCourses[courseIndex];
    const courseAssignments = courseSeed.assignments;

    for (const [assignmentIndex, template] of courseAssignments.entries()) {
      const assignment = await ensureAssignment(course.id, template.title, {
        description: `${template.description}\n\nCurso: ${course.title} (${course.code}).`,
        dueAt: dueDate(template.days),
        points: template.points,
      });

      for (const [studentIndex, learner] of students.entries()) {
        const isDemoStudent = learner.id === students[0]?.id;
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

        await prisma.submission.upsert({
          where: {
            assignmentId_studentId: {
              assignmentId: assignment.id,
              studentId: learner.id,
            },
          },
          update: {
            text: `Entrega de "${template.title}" para ${course.code}.`,
            grade,
            feedback: leaveUngraded
              ? null
              : "Buen avance. Revisa la retroalimentación y continúa con la siguiente actividad.",
            gradedAt: leaveUngraded ? null : new Date(),
          },
          create: {
            assignmentId: assignment.id,
            studentId: learner.id,
            text: `Entrega de "${template.title}" para ${course.code}.`,
            grade,
            feedback: leaveUngraded
              ? null
              : "Buen avance. Revisa la retroalimentación y continúa con la siguiente actividad.",
            gradedAt: leaveUngraded ? null : new Date(),
          },
        });
      }
    }

    await ensureAnnouncement(
      course.id,
      instructor.id,
      `Bienvenida a ${course.title}`,
      `Hola a todos. Este es el espacio oficial de ${course.code}. Revisa el contenido de la primera semana, revisa las tareas y escríbeme si tienes dudas.`,
    );
    await ensureAnnouncement(
      course.id,
      instructor.id,
      "Recordatorio de entregas",
      "Recuerda revisar el calendario del curso. Las entregas se reciben desde la plataforma y puedes reemplazar tu respuesta antes de la fecha límite.",
    );

    await ensureContent(course.id, instructor.id, {
      title: `Programa de ${course.code}`,
      type: ContentType.PAGE,
      body: `Semana 1: introducción y diagnóstico.\nSemana 2: conceptos clave y práctica guiada.\nSemana 3: proyecto de unidad.\nSemana 4: evaluación y cierre.`,
      position: 0,
    });
    await ensureContent(course.id, instructor.id, {
      title: "Guía de estudio de la unidad",
      type: ContentType.PAGE,
      body: "Revisa el material de clase, completa la práctica guiada y prepara tus dudas para la sesión en vivo.",
      position: 1,
    });
    await ensureContent(course.id, instructor.id, {
      title: courseSeed.resource.title,
      type: ContentType.LINK,
      url: courseSeed.resource.url,
      position: 2,
    });

    const existingSession = await prisma.liveSession.findFirst({
      where: { courseId: course.id, title: "Clase de bienvenida" },
    });
    if (!existingSession) {
      await prisma.liveSession.create({
        data: {
          courseId: course.id,
          title: "Clase de bienvenida",
          roomName: `demo-${course.code.toLowerCase()}`,
          status: LiveSessionStatus.SCHEDULED,
          createdById: instructor.id,
        },
      });
    }
  }

  console.log("Seed completado.");
  console.log("Admin: admin@controlboard.dev / Admin123!");
  console.log("Profesor: instructor@controlboard.dev / Profe123!");
  console.log("Estudiante: estudiante@controlboard.dev / Estudiante123!");
  console.log("Estudiante 2: ana@controlboard.dev / Estudiante123!");
  console.log("Secretaría: secretaria@controlboard.dev / Secretaria123!");
  console.log("Psicología: psicologia@controlboard.dev / Psicologia123!");
  console.log("Superadministrador: superadmin@controlboard.dev / SuperAdmin123!");
  console.log(`Cursos listos: ${courses.length}`);
  console.log(
    `Tareas listas: ${demoCourses.reduce((total, course) => total + course.assignments.length, 0)}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
