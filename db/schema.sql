CREATE TYPE "Role" AS ENUM ('PSYCHOLOGIST', 'SUPER_ADMIN', 'SECRETARY', 'ADMIN', 'INSTRUCTOR', 'STUDENT');
CREATE TYPE "EnrollmentRole" AS ENUM ('STUDENT', 'TA');
CREATE TYPE "ContentType" AS ENUM ('PAGE', 'LINK', 'FILE');
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');
CREATE TYPE "RecordingStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "SchoolLevel" AS ENUM ('INITIAL', 'PRIMARY', 'SECONDARY');
CREATE TYPE "PsychologyCategory" AS ENUM ('LEARNING', 'COEXISTENCE', 'EMOTIONAL', 'FAMILY', 'OTHER');
CREATE TYPE "PsychologyCaseStatus" AS ENUM ('OPEN', 'FOLLOW_UP', 'CLOSED');
CREATE TYPE "PsychologyAppointmentStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolGrade" (
    "id" TEXT NOT NULL,
    "level" "SchoolLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "SchoolGrade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolSection" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "SchoolSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "sectionId" TEXT,
    "academicPeriodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EnrollmentRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "text" TEXT,
    "fileUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),
    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "egressId" TEXT NOT NULL,
    "url" TEXT,
    "status" "RecordingStatus" NOT NULL DEFAULT 'PROCESSING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "recordedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "level" "SchoolLevel" NOT NULL,
    "config" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PeriodGrade" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "scaleSnapshot" JSONB NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "recordedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PeriodGrade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PsychologyCase" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "category" "PsychologyCategory" NOT NULL,
    "status" "PsychologyCaseStatus" NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PsychologyCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PsychologyNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "attendedOn" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PsychologyNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PsychologyAppointment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "PsychologyAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "PsychologyAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "schoolSectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentGuardian" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "documentNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncomeReceiptCounter" (
    "id" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "IncomeReceiptCounter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IncomeReceiptCounter_id_check" CHECK ("id" = 'main'),
    CONSTRAINT "IncomeReceiptCounter_nextNumber_check" CHECK ("nextNumber" > 0)
);

CREATE TABLE "IncomeReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" INTEGER NOT NULL,
    "issuedOn" DATE NOT NULL,
    "receivedFrom" TEXT NOT NULL,
    "documentNumber" TEXT,
    "totalAmount" NUMERIC(12,2) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "issuedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncomeReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IncomeReceipt_receiptNumber_check" CHECK ("receiptNumber" > 0),
    CONSTRAINT "IncomeReceipt_totalAmount_check" CHECK ("totalAmount" > 0),
    CONSTRAINT "IncomeReceipt_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "IncomeReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "conceptCode" TEXT NOT NULL,
    "conceptLabel" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL DEFAULT '',
    "amount" NUMERIC(12,2) NOT NULL,
    CONSTRAINT "IncomeReceiptLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IncomeReceiptLine_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "IncomeReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "IncomeReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "IncomeReceiptCounter" ("id", "nextNumber") VALUES ('main', 1);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");
CREATE UNIQUE INDEX "AcademicPeriod_yearId_name_key" ON "AcademicPeriod"("yearId", "name");
CREATE UNIQUE INDEX "SchoolGrade_level_name_key" ON "SchoolGrade"("level", "name");
CREATE UNIQUE INDEX "SchoolSection_yearId_gradeId_name_key" ON "SchoolSection"("yearId", "gradeId", "name");
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");
CREATE UNIQUE INDEX "Enrollment_courseId_userId_key" ON "Enrollment"("courseId", "userId");
CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");
CREATE UNIQUE INDEX "LiveSession_roomName_key" ON "LiveSession"("roomName");
CREATE UNIQUE INDEX "Recording_egressId_key" ON "Recording"("egressId");
CREATE UNIQUE INDEX "Attendance_courseId_studentId_date_key" ON "Attendance"("courseId", "studentId", "date");
CREATE INDEX "Attendance_courseId_date_idx" ON "Attendance"("courseId", "date");
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");
CREATE UNIQUE INDEX "GradingScale_yearId_level_key" ON "GradingScale"("yearId", "level");
CREATE UNIQUE INDEX "PeriodGrade_courseId_periodId_studentId_key" ON "PeriodGrade"("courseId", "periodId", "studentId");
CREATE INDEX "PeriodGrade_studentId_periodId_idx" ON "PeriodGrade"("studentId", "periodId");
CREATE UNIQUE INDEX "PsychologyCase_studentId_key" ON "PsychologyCase"("studentId");
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE UNIQUE INDEX "StudentProfile_documentNumber_key" ON "StudentProfile"("documentNumber");
CREATE UNIQUE INDEX "StudentProfile_studentCode_key" ON "StudentProfile"("studentCode");
CREATE INDEX "StudentProfile_schoolSectionId_idx" ON "StudentProfile"("schoolSectionId");
CREATE INDEX "StudentGuardian_studentId_idx" ON "StudentGuardian"("studentId");
CREATE UNIQUE INDEX "IncomeReceipt_receiptNumber_key" ON "IncomeReceipt"("receiptNumber");
CREATE INDEX "IncomeReceipt_issuedOn_receiptNumber_idx" ON "IncomeReceipt"("issuedOn", "receiptNumber");
CREATE INDEX "IncomeReceiptLine_receiptId_idx" ON "IncomeReceiptLine"("receiptId");
CREATE INDEX "PsychologyCase_psychologistId_status_idx" ON "PsychologyCase"("psychologistId", "status");
CREATE INDEX "PsychologyNote_caseId_attendedOn_idx" ON "PsychologyNote"("caseId", "attendedOn");
CREATE INDEX "PsychologyAppointment_caseId_startsAt_idx" ON "PsychologyAppointment"("caseId", "startsAt");
CREATE INDEX "PsychologyAppointment_status_startsAt_idx" ON "PsychologyAppointment"("status", "startsAt");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolSection" ADD CONSTRAINT "SchoolSection_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolSection" ADD CONSTRAINT "SchoolSection_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "SchoolGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SchoolSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychologyCase" ADD CONSTRAINT "PsychologyCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychologyCase" ADD CONSTRAINT "PsychologyCase_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychologyCase" ADD CONSTRAINT "PsychologyCase_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychologyNote" ADD CONSTRAINT "PsychologyNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PsychologyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychologyNote" ADD CONSTRAINT "PsychologyNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PsychologyAppointment" ADD CONSTRAINT "PsychologyAppointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PsychologyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolSectionId_fkey" FOREIGN KEY ("schoolSectionId") REFERENCES "SchoolSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
