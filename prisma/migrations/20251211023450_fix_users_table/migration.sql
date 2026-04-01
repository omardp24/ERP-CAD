/*
  Warnings:

  - You are about to drop the column `description` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `auth_users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "description",
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "active",
DROP COLUMN "created_at",
DROP COLUMN "password_hash",
DROP COLUMN "role_id",
ADD COLUMN     "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password" VARCHAR(200) NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "updatedAt" TIMESTAMP(6) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(150);

-- DropTable
DROP TABLE "auth_users";
