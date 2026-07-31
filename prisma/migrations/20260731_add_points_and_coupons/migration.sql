-- LZTI 积分体系迁移脚本
-- 执行时间：2026-07-31
-- 注意事项：执行前请备份数据库

-- 1. User 表新增积分字段
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "realPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusPointsUsed" INTEGER NOT NULL DEFAULT 0;

-- 2. AssessmentSession 表新增 couponId 字段
ALTER TABLE "AssessmentSession" ADD COLUMN IF NOT EXISTS "couponId" TEXT;

-- 3. 创建积分流水表
CREATE TABLE IF NOT EXISTS "PointTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "description" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PointTransaction_userId_idx" ON "PointTransaction"("userId");
CREATE INDEX IF NOT EXISTS "PointTransaction_type_idx" ON "PointTransaction"("type");
CREATE INDEX IF NOT EXISTS "PointTransaction_createdAt_idx" ON "PointTransaction"("createdAt");

-- 4. 创建券表
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_userId_idx" ON "Coupon"("userId");
CREATE INDEX IF NOT EXISTS "Coupon_status_idx" ON "Coupon"("status");

-- 5. 为 AssessmentSession 添加 couponId 外键约束
DO $$ BEGIN
    ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 回滚脚本
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "realPoints";
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "bonusPoints";
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "bonusPointsUsed";
-- ALTER TABLE "AssessmentSession" DROP COLUMN IF EXISTS "couponId";
-- DROP TABLE IF EXISTS "Coupon";
-- DROP TABLE IF EXISTS "PointTransaction";
