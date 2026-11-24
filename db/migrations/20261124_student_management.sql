CREATE TABLE IF NOT EXISTS "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "schoolSectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentProfile_schoolSectionId_fkey" FOREIGN KEY ("schoolSectionId") REFERENCES "SchoolSection"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "StudentGuardian" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "documentNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_documentNumber_key" ON "StudentProfile"("documentNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_studentCode_key" ON "StudentProfile"("studentCode");
CREATE INDEX IF NOT EXISTS "StudentProfile_schoolSectionId_idx" ON "StudentProfile"("schoolSectionId");
CREATE INDEX IF NOT EXISTS "StudentGuardian_studentId_idx" ON "StudentGuardian"("studentId");
