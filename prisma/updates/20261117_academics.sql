BEGIN;

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('INITIAL', 'PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "academicPeriodId" TEXT,
ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolGrade" (
    "id" TEXT NOT NULL,
    "level" "SchoolLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SchoolGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSection" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SchoolSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_yearId_name_key" ON "AcademicPeriod"("yearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolGrade_level_name_key" ON "SchoolGrade"("level", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSection_yearId_gradeId_name_key" ON "SchoolSection"("yearId", "gradeId", "name");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SchoolSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSection" ADD CONSTRAINT "SchoolSection_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSection" ADD CONSTRAINT "SchoolSection_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "SchoolGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
