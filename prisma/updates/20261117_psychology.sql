BEGIN;

-- CreateEnum
CREATE TYPE "PsychologyCategory" AS ENUM ('LEARNING', 'COEXISTENCE', 'EMOTIONAL', 'FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "PsychologyCaseStatus" AS ENUM ('OPEN', 'FOLLOW_UP', 'CLOSED');

-- CreateEnum
CREATE TYPE "PsychologyAppointmentStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PSYCHOLOGIST';

-- CreateTable
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

-- CreateTable
CREATE TABLE "PsychologyNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "attendedOn" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PsychologyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsychologyAppointment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "PsychologyAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PsychologyAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PsychologyCase_studentId_key" ON "PsychologyCase"("studentId");

-- CreateIndex
CREATE INDEX "PsychologyCase_psychologistId_status_idx" ON "PsychologyCase"("psychologistId", "status");

-- CreateIndex
CREATE INDEX "PsychologyNote_caseId_attendedOn_idx" ON "PsychologyNote"("caseId", "attendedOn");

-- CreateIndex
CREATE INDEX "PsychologyAppointment_caseId_startsAt_idx" ON "PsychologyAppointment"("caseId", "startsAt");

-- CreateIndex
CREATE INDEX "PsychologyAppointment_status_startsAt_idx" ON "PsychologyAppointment"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "PsychologyCase" ADD CONSTRAINT "PsychologyCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologyCase" ADD CONSTRAINT "PsychologyCase_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologyCase" ADD CONSTRAINT "PsychologyCase_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologyNote" ADD CONSTRAINT "PsychologyNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PsychologyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologyNote" ADD CONSTRAINT "PsychologyNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologyAppointment" ADD CONSTRAINT "PsychologyAppointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PsychologyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
