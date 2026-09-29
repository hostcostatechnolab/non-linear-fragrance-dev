-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "noteGid" TEXT NOT NULL,
    "noteHandle" TEXT,
    "noteLabel" TEXT,
    "groupGid" TEXT,
    "groupLabel" TEXT,
    "blockId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ClickEvent_shop_createdAt_idx" ON "ClickEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "ClickEvent_shop_noteGid_idx" ON "ClickEvent"("shop", "noteGid");
