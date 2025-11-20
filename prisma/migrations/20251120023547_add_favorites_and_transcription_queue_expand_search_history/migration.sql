-- AlterTable
ALTER TABLE "SearchHistory" ADD COLUMN     "channelName" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "endDate" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "maxResults" INTEGER,
ADD COLUMN     "order" TEXT,
ADD COLUMN     "startDate" TEXT,
ALTER COLUMN "query" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptionQueue" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "TranscriptionQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_type_idx" ON "Favorite"("userId", "type");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TranscriptionQueue_userId_status_idx" ON "TranscriptionQueue"("userId", "status");

-- CreateIndex
CREATE INDEX "TranscriptionQueue_userId_createdAt_idx" ON "TranscriptionQueue"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptionQueue_userId_videoId_key" ON "TranscriptionQueue"("userId", "videoId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_query_idx" ON "SearchHistory"("userId", "query");
