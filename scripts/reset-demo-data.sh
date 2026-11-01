#!/bin/bash
# 清理演示库（lzti_dev）的测评数据
#
# 三种模式：
#   hard     彻底清场：会话/加入码/孩子/答案/报告全清（旧的加入码一起作废）
#   soft     只清「内容」：删答案/报告/报告码，**保留加入码、会话、孩子**
#            → 演示现场：用户1 拍了码走人后清内容，他家人回头扫**同一个码**
#              还能继续做剩下角色的卷、也能用它看剩下的报告
#   expired  只清「已过期」的会话（24h 到期、没人回来做的那种）
#
# 用法：
#   bash scripts/reset-demo-data.sh              # = hard
#   bash scripts/reset-demo-data.sh soft         # 只清内容，保留加入码
#   bash scripts/reset-demo-data.sh expired      # 只清已过期的会话
#
# 永远保留：User（含 demo 账号）、devices、device_tokens（演示设备 token 要留着）
set -euo pipefail

MODE="${1:-hard}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${LZTI_ENV_FILE:-/home/pupeng/projects/lzti-dev/.env}"

export $(grep -h "^DATABASE_URL=" "$ENV_FILE" | sed 's/"//g')
PGURL="${DATABASE_URL%%\?*}"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${LZTI_BACKUP_DIR:-/home/pupeng/.openclaw/workspace/docs/backup}"
BACKUP="${BACKUP_DIR}/lzti_dev_demo_${TS}.sql"
mkdir -p "$BACKUP_DIR"

# 🔴 库名闸门（2026-11-01 补）
# 本脚本会 DELETE 生产级表（SessionAttempt / AssessmentSession / Child …）。
# LZTI_ENV_FILE 可被环境变量覆盖 → 万一指向生产 .env，就会直接删生产库数据。
# 生产库里有真实用户的 Child（实测 6 条），这不是能靠「小心点」解决的风险。
# 硬性拦下：库名不是 lzti_dev 一律拒绝执行。
DB_NAME=$(basename "${PGURL%%\?*}")
if [ "$DB_NAME" != "lzti_dev" ]; then
  echo "✗ 拒绝执行：目标库是 ${DB_NAME}，不是 lzti_dev" >&2
  echo "  本脚本只允许清理演示库（lzti_dev）。" >&2
  echo "  如确认要清别的库，请改用该库自己的清理方式，不要绕过这道闸门。" >&2
  exit 1
fi

echo "=== 模式: ${MODE}"
echo "=== 1) 备份 → ${BACKUP}"
pg_dump "$PGURL" --data-only \
  --table='"SessionAttempt"' --table='"AttemptReport"' --table='"AssessmentSession"' \
  --table='"Child"' --table='"ShareBatch"' --table='"Slot"' --table='"ReportShare"' \
  > "$BACKUP"
echo "    备份 $(wc -l < "$BACKUP") 行"

case "$MODE" in
  hard)
    echo "=== 2) 彻底清场"
    psql "$PGURL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM "ReportShare";
DELETE FROM "Slot";
DELETE FROM "ShareBatch";
DELETE FROM "AttemptReport";
DELETE FROM "SessionAttempt";
DELETE FROM "AssessmentSession";
DELETE FROM "Child";
COMMIT;
SQL
    ;;

  soft)
    # 只删「内容」：答案、报告、报告码
    # 保留：加入码(Slot)、会话(AssessmentSession)、孩子(Child)
    # 注意：会话的 completed 标记仍停在已完成状态 →
    #       孩子扫码时看到「家长已完成 / 学生待做」，语义正确
    echo "=== 2) 只清内容（保留加入码 / 会话 / 孩子）"
    psql "$PGURL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM "ReportShare" WHERE "attemptId" IN (SELECT id FROM "SessionAttempt");
DELETE FROM "AttemptReport";
DELETE FROM "SessionAttempt";
COMMIT;
SQL
    echo "    ⚠️ 清完后这些会话的对比会缺数据（缺的那一方会标成「数据缺失，不纳入对比」）"
    ;;

  expired)
    # 只清「已经过了 24h 有效期、也没人回来做」的会话。
    # 有效期不在 AssessmentSession 上（它没这个字段），而在加入码所属的 ShareBatch.expiresAt。
    echo "=== 2) 只清已过期的会话"
    psql "$PGURL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
CREATE TEMP TABLE _expired_sessions AS
SELECT s.id AS session_id, s."childId" AS child_id
FROM "AssessmentSession" s
JOIN "Slot" sl ON sl.id = s."slotId"
JOIN "ShareBatch" b ON b.id = sl."batchId"
WHERE b."expiresAt" < now();

DELETE FROM "ReportShare" WHERE "attemptId" IN (
  SELECT a.id FROM "SessionAttempt" a JOIN _expired_sessions e ON e.session_id = a."sessionId"
);
DELETE FROM "AttemptReport" WHERE "attemptId" IN (
  SELECT a.id FROM "SessionAttempt" a JOIN _expired_sessions e ON e.session_id = a."sessionId"
);
DELETE FROM "SessionAttempt" WHERE "sessionId" IN (SELECT session_id FROM _expired_sessions);
DELETE FROM "AssessmentSession" WHERE id IN (SELECT session_id FROM _expired_sessions);
-- 孩子：只删已经没有别的会话的
DELETE FROM "Child" WHERE id IN (SELECT child_id FROM _expired_sessions)
  AND id NOT IN (SELECT DISTINCT "childId" FROM "AssessmentSession");
-- 加入码那套槽位
DELETE FROM "Slot" WHERE "batchId" IN (SELECT id FROM "ShareBatch" WHERE "expiresAt" < now());
DELETE FROM "ShareBatch" WHERE "expiresAt" < now();
COMMIT;
SQL
    ;;

  *)
    echo "未知模式：$MODE（可选 hard / soft / expired）" >&2
    exit 1
    ;;
esac

echo "=== 3) 复核"
for t in SessionAttempt AttemptReport AssessmentSession Child ShareBatch Slot ReportShare User devices device_tokens; do
  printf "  %-20s %s\n" "$t" "$(psql "$PGURL" -t -A -c "select count(*) from \"$t\";")"
done
echo "=== 完成。备份：${BACKUP}"
