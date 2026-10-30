# lzti 分支与部署约定

## 分支

| 分支 | 用途 | 部署到 |
|---|---|---|
| `dev-work` | 集成分支，**始终可部署**，是 ltd 测试环境运行的分支 | `lzti.nzyy.ltd` |
| `master` | 生产分支，只接受来自 `dev-work` 的合并 | `lzti.nzyy.cc` |
| `feature/*` | 功能分支，从 `dev-work` 拉出，合并回 `dev-work` | — |

## 流程

```
本地笔记本 (feature/*)
   │ git push origin
   ▼
GitHub ──合并──► dev-work ──(服务器 cron 每 2 分钟自动检测)──► lzti-dev 实例 ──► lzti.nzyy.ltd
   │
   └──PR 合并──► master ──(人工确认后手动部署)──► lzti 实例 ──► lzti.nzyy.cc
```

## 规则

1. **单向流**：`dev-work → master`。生产目录只 `git pull --ff-only`，永不产生 commit。
2. **上生产前必须在 ltd 验证过**：dev 环境 ≥ 生产环境。
3. **数据库**：生产库 `lzti`，测试库 `lzti_dev`，本地开发库 `lzti_local`（独立账号）。
   改 schema 后：本地 `npx prisma db push` → dev 环境 `--db` → 生产 `--db`（会先自动备份）。
4. **生产部署**：`bash _tools/deploy-prod.sh lzti`（需输入 YES 确认），服务器侧
   `deploy.sh` 负责构建 + `pm2 reload` + 健康检查；失败不自动回滚，会打印回滚命令。
5. **ltd 自动部署**：服务器 `~/projects/deploy/auto-deploy-dev.sh`（cron），
   检测到 `dev-work` 有新提交就自动构建部署，健康检查失败会自动回滚。

## 本地开发

```bash
npm ci
npm run dev            # http://localhost:3000
bash _tools/tunnel.sh  # 数据库走隧道连 lzti_local
bash _tools/guard-db.sh  # 安全护栏：检查 .env 不会指向生产库
```
