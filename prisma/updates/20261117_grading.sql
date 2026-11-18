BEGIN;

-- CreateTable
CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "level" "SchoolLevel" NOT NULL,
    "config" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "GradingScale_yearId_level_key" ON "GradingScale"("yearId", "level");

-- CreateIndex
CREATE INDEX "PeriodGrade_studentId_periodId_idx" ON "PeriodGrade"("studentId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodGrade_courseId_periodId_studentId_key" ON "PeriodGrade"("courseId", "periodId", "studentId");

-- AddForeignKey
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodGrade" ADD CONSTRAINT "PeriodGrade_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
