-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "mongoDataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationResult" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "dia" INTEGER NOT NULL,
    "totalBarsUsed" INTEGER NOT NULL,
    "totalWaste" DECIMAL(10,3) NOT NULL,
    "averageUtilization" DECIMAL(5,2) NOT NULL,
    "executionTime" DECIMAL(10,2) NOT NULL,
    "mongoResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_uploadDate_idx" ON "Project"("uploadDate");

-- CreateIndex
CREATE INDEX "CalculationResult_projectId_idx" ON "CalculationResult"("projectId");

-- CreateIndex
CREATE INDEX "CalculationResult_algorithm_idx" ON "CalculationResult"("algorithm");

-- AddForeignKey
ALTER TABLE "CalculationResult" ADD CONSTRAINT "CalculationResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
