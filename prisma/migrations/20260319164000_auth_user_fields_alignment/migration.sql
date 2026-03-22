-- Drop username artifacts
DROP INDEX IF EXISTS "User_username_idx";
DROP INDEX IF EXISTS "User_username_key";

-- Align User table with auth flow requirements
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "username",
  ADD COLUMN IF NOT EXISTS "gender" "Gender" NOT NULL DEFAULT 'UNISEX',
  ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3) NOT NULL DEFAULT TIMESTAMP '2000-01-01 00:00:00',
  ALTER COLUMN "phoneNumber" SET NOT NULL;

-- Add phone uniqueness and index for auth lookups
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "User"("phoneNumber");
CREATE INDEX IF NOT EXISTS "User_phoneNumber_idx" ON "User"("phoneNumber");

-- Remove temporary defaults after backfill
ALTER TABLE "User"
  ALTER COLUMN "gender" DROP DEFAULT,
  ALTER COLUMN "dateOfBirth" DROP DEFAULT;
