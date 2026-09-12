-- Migrate any existing BLOCKED values before removing the enum variant
UPDATE "tasks" SET "status" = 'IN_PROGRESS' WHERE "status"::text = 'BLOCKED';
UPDATE "activity_logs" SET "previousStatus" = 'IN_PROGRESS' WHERE "previousStatus"::text = 'BLOCKED';
UPDATE "activity_logs" SET "newStatus" = 'IN_PROGRESS' WHERE "newStatus"::text = 'BLOCKED';

-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
ALTER TABLE "public"."tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TABLE "activity_logs" ALTER COLUMN "previousStatus" TYPE "TaskStatus_new" USING ("previousStatus"::text::"TaskStatus_new");
ALTER TABLE "activity_logs" ALTER COLUMN "newStatus" TYPE "TaskStatus_new" USING ("newStatus"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';
COMMIT;
