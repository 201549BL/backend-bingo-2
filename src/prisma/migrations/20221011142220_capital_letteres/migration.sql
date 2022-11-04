/*
  Warnings:

  - You are about to drop the `room` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "room";

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");
