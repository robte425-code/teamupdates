-- CreateTable
CREATE TABLE "BirthdayEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirthdayEntry_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BirthdayEntry" ("id", "name", "month", "day", "createdAt", "updatedAt") VALUES
  ('bday_001', 'Linda Kimm', 4, 10, NOW(), NOW()),
  ('bday_002', 'Jacqueline Baker', 4, 18, NOW(), NOW()),
  ('bday_003', 'MarLee Clyborne', 6, 14, NOW(), NOW()),
  ('bday_004', 'Patricia Sweetin', 8, 2, NOW(), NOW()),
  ('bday_005', 'Richelle Dickens', 9, 5, NOW(), NOW()),
  ('bday_006', 'Brooke Daniels', 9, 9, NOW(), NOW()),
  ('bday_007', 'Julia Price', 9, 23, NOW(), NOW()),
  ('bday_008', 'Aviendah Chapman', 10, 6, NOW(), NOW()),
  ('bday_009', 'Elisabeth McLeod', 10, 6, NOW(), NOW()),
  ('bday_010', 'Robert Evans', 10, 25, NOW(), NOW()),
  ('bday_011', 'Leanne Schuit', 12, 27, NOW(), NOW()),
  ('bday_012', 'Heather Asplund', 1, 18, NOW(), NOW()),
  ('bday_013', 'Ghim-Sim Chua', 2, 28, NOW(), NOW()),
  ('bday_014', 'Sarah Chapman', 3, 23, NOW(), NOW());
