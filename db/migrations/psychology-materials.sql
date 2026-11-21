CREATE TABLE IF NOT EXISTS "PsychologyMaterial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PsychologyMaterial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PsychologyMaterial_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PsychologyMaterial_createdAt_idx"
    ON "PsychologyMaterial"("createdAt" DESC);
