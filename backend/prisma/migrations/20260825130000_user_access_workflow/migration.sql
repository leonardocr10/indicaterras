CREATE TYPE "UserApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "User"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approvalStatus" "UserApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Existing accounts were already in use before the verification workflow.
UPDATE "User"
SET "emailVerified" = true,
    "emailVerifiedAt" = CURRENT_TIMESTAMP,
    "approvalStatus" = 'APPROVED',
    "approvedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "CondominiumSettings"
  ADD COLUMN "requireUserApproval" BOOLEAN NOT NULL DEFAULT true;
