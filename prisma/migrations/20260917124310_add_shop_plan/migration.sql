-- CreateTable
CREATE TABLE "ShopPlan" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "shopGid" TEXT,
    "syncedPlan" TEXT,
    "updatedAt" DATETIME NOT NULL
);
