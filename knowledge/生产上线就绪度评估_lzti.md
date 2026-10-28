# 荔学卷（lzti）生产上线就绪度评估

> 评估对象：`/home/pupeng/projects/lzti-dev`（分支 `dev-work`）
> 评估日期：2026-10-28
> 评估口径：从「上线生产」视角，按 **稳定 / 合理 / 安全 / 高效** 四条原则逐条核查
> 核实方式：读代码 + 实机执行（测试、类型检查、lint、数据库约束实测、pm2/备份/磁盘实况）
> 原则声明：所有结论均基于实测，不做推断；推断处明确标注「未实测」

---

## 〇、总体结论

**这是一个工程纪律很好、但生产化欠账集中在「权限闭环」与「可观测性」的成熟原型。当前不具备直接放量上线的条件。**

| 维度 | 评价 | 一句话 |
|---|---|---|
| 稳定 | 中上 | 并发与事务问题修得扎实，有备份且**验证过可恢复**；但无迁移版本化、无回滚路径，磁盘已 90% |
| 合理 | 中 | 产品模型自洽；会员权益 gating 未实现、积分/券/配额三套规则分散在代码与文档两处 |
| 安全 | 中下 | 认证链路的坑基本堵上；但**券码转让存在确认越权**，生产限流可被伪造头绕过，公开接口无频控 |
| 高效 | 中 | CI 步骤正确、测试全绿；但核心业务零测试覆盖，部署资产在仓库外不可复现 |

**给生产上线的一句话建议**：先做 P0（都是小改动、无需产品决策），再做 P1 的可观测性；「会员/支付口径」「bind 通道退役」「staging 是否要建」三件需要拍板的事单列，不要与技术项混做。

---

## 一、已核实的现状快照

### 1.1 代码与流程

| 项 | 实测结果 |
|---|---|
| 分支同步 | `dev-work` 仅领先 `master` 2 个 commit，**且都是文档**；生产代码停在 `dced0b6`。两边代码基本一致 ✅ |
| 单元测试 | `npx vitest run` → 7 文件 **58 用例全绿**（约 27s）✅ |
| 类型检查 | `npx tsc --noEmit` → 无错误 ✅ |
| Lint | `npx eslint` → **50 errors / 58 warnings**，CI 里用 `continue-on-error` 放行 ⚠️ |
| CI 流水线 | `prisma generate → typecheck → test → build → lint(不阻塞)`，步骤顺序正确，且注释里保留了「漏 generate 会编译失败」的事故教训 ✅ |
| 依赖审计 | 未接入 `npm audit` / Dependabot / CodeQL ❌ |

### 1.2 值得肯定的三处硬功夫（应保持）

1. **并发安全有真实事故背景**
   `src/lib/services/assessment.service.ts:357-396`：扣次数与写 attempt 放在**同一事务**，事务内 `SELECT ... FOR UPDATE` 锁 session 行，schema 上有 `@unique([sessionId, questionnaireType])` 兜底。注释写明了「判定首个视角与扣减都必须在事务里」的推理链。
2. **注册票据取代前端传参**
   `src/lib/auth/registration-ticket.ts` + `/api/auth/register`：userId/phone 由服务端签发的票据推导，堵住了「知道 cuid 就能替人注册」的越权路径。
3. **知识库留档质量高**
   `knowledge/跨应用账号体系方案.md`（1009 行）记录了决策、被否方案、订正、实测证据与失败假设，是本项目最有价值的资产。

### 1.3 运维实况（实机核实）

| 项 | 实测结果 |
|---|---|
| 备份 | 每日 `pg_dump` 覆盖 8 库（保留 14 天）+ **每周日 `verify_restore.sh` 实测还原** ✅（很多团队只 dump 不验证） |
| 备份位置 | **全部在本机同一块盘**（`/home/pupeng/projects/backup`），无异机/异地副本 ❌ |
| 磁盘 | `/` 已用 **90%**（39G 用了 33G，剩 3.9G）⚠️ |
| 内存 | 65% |
| pm2 | `lzti` 生产 `cluster`（`instances:1`）、`lzti-dev` `fork`；`nzyy-auth`/`nzyy-auth-dev` 共用代码目录 |
| 生产 `.env` | 只有 `DATABASE_URL` / `JWT_SECRET` / `NZYY_API_URL`，**SSO 四件套未配** → 登录页不渲染 SSO 入口（安全降级，符合设计） ✅ |
| Sentry | 三份配置文件齐备，但**生产未配 `SENTRY_DSN`** → 实际未启用 ❌ |
| `/api/health` | 只返回静态 `{status:'ok'}`，**不探数据库** ❌ |
| 定时任务 | crontab 仅 acme 续签 + 备份 + 还原校验；**应用侧无任何定时任务** ❌ |

---

## 二、待解决问题清单

### P0 —— 不补就不该上线

#### P0-1 券码转让接口存在确认越权（IDOR）

- 位置：`src/lib/services/point.service.ts:382` `transferCoupon()`、`src/app/api/coupons/transfer/route.ts`
- 现状：
  ```ts
  export async function transferCoupon(code: string, newOwnerId?: string): Promise<void> {
    await prisma.coupon.update({ where: { code }, data: { userId: newOwnerId || null } });
  }
  ```
  路由只做 `requireAuth`，**不校验券的归属**。
- 影响：任意登录用户只要知道券码，就能把**他人**的券转到**任意 userId**；`newOwnerId` 省略时会把券置为孤儿（`userId=null`）。无归属校验、无限流、无审计。
- 建议：校验 `coupon.userId === context.user.id`（管理员另放行）；目标用户存在性校验；加限流与审计行；券码本身是凭据，转让应有二次确认与通知。

#### P0-2 生产限流可被伪造请求头绕过

- 位置：`src/lib/api/ratelimit.ts` `getIdentifier()`；nginx 配置 `/home/pupeng/projects/deploy/nginx/lzti.nzyy.ltd`
- 现状：应用取 `x-forwarded-for` 的**第一段**作为限流键；nginx 用的是 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`（**追加**，不覆盖）。
- 影响：攻击者自带 `X-Forwarded-For: 1.2.3.4` → 应用读到伪造值 → 登录/注册限流（敏感接口 5 次/分）形同虚设，可对已知手机号做密码爆破。
- 补充：`@upstash/redis` **已安装但全仓零引用**，当前限流是纯内存 `Map`——重启即失效、无淘汰策略、无上限（长期运行会缓慢增长）、多进程不共享（当前 `instances:1` 暂不触发，但 `cluster` 模式下改 `instances` 就会踩）。
- 建议：限流键取**最后一段**（即 `$remote_addr`）或让 nginx 显式覆盖；或直接接 Redis（依赖已就位）。

#### P0-3 三个公开接口完全没有频控

| 接口 | 暴露面 |
|---|---|
| `GET /api/share/report/[shareCode]` | 公开读取全量报告：**儿童姓名**、各维度得分、象限、引导建议。无频控 → 可脚本化枚举/爬取 |
| `POST /api/invitation-codes/validate` | 校验 6 位批次邀请码（空间仅 10⁶），无频控 → 可批量枚举有效邀请码 |
| `POST /api/bind` | 门户绑定通道，无频控；且它正是文档已认定「门户不验证手机号」的手机号墙通道 |

- 建议：全部接入频控；`/api/bind` 按方案退役（下线）；邀请码位数提升。

#### P0-4 邀请码 / 报告码用 `Math.random()` 生成

- 位置：`src/lib/services/code-generator.ts`（BATCH 6 位数字、REFERRAL 8 位、REPORT 8 位混合大小写）
- 现状：`Math.random()` 非密码学安全，V8 的 xorshift128+ 状态可由观测输出反推 → **后续生成的码可被预测**。
- 建议：改用 Node 内置 `crypto.randomInt()`（项目内 `crypto.randomUUID` 已在用）；批次码从 6 位提到 8 位以上；配合 P0-3 的频控。

#### P0-5 删除用户 / 删除孩子档案在有测评记录时必然失败（数据删除权不可兑现）

- 位置：`src/app/api/admin/users/route.ts:53` `DELETE`、`src/lib/services/child.service.ts:130` `deleteChild()`
- 实测证据（`lzti_dev` 库，事务内已回滚）：
  ```
  DELETE FROM "Child" ... → ERROR: violates foreign key constraint "AssessmentSession_childId_fkey"
  DELETE FROM "AssessmentSession" ... → ERROR: violates foreign key constraint "SessionAttempt_sessionId_fkey"
  ```
- 根因：schema 里 `Child.sessions`、`SessionAttempt.session` **都没有 `onDelete: Cascade`**，默认是 Restrict。
  - `deleteChild()` 的注释写着「会级联删除 attempts 和 reports」——**与库不符**，实际会直接报错。
  - `DELETE /api/admin/users` 的事务里 `child.deleteMany` 会因上述 FK 失败 → 整个事务回滚 → **有测评记录的用户根本删不掉**。
  - 反过来，无测评的用户被删时，`AssessmentSession` / `SessionAttempt` 不在删除清单里 → 留下 `childId` 悬空的孤儿历史数据。
- 影响：隐私政策里「可要求删除数据」的承诺无法兑现（合规风险）；后台运维删不掉脏数据。
- 建议：schema 补 `onDelete: Cascade`（`SessionAttempt`、`AttemptReport` 逐级），删除逻辑改为按会话树整体删除并写成事务；`SessionAttempt.childId` 建议补 FK，消除孤儿。

#### P0-6 数据库变更没有版本化，缺回滚路径

- 现状：生产靠 `prisma db push`；文档已两次记录「加唯一约束时 db push 报错退出 → 后续 build/restart 全不执行 → 命令看似跑完、生产其实没更新」。
- 影响：一次加约束失败 = 部署半途而废；生产 schema 与 dev 漂移（wxcl 侧已实际出现 `Intent` 枚举缺值、外键缺失，lzti 迟早同样）。
- 建议：引入 `prisma migrate` 迁移目录，生产只 `migrate deploy`；上线前用 `migrate diff`（只读）出变更面人工确认；deploy 脚本保证「迁移失败即中止、绝不继续 build/restart」。

#### P0-7 备份只在本机同一块盘 + 磁盘已 90%

- 现状：`/home/pupeng/projects/backup` 与生产库同盘；`/` 已用 90%（剩 3.9G）。备份脚本本身有 14 天保留清理，但 `.next` 产物、node_modules、日志、备份都在抢同一块盘。
- 影响：磁盘写满 → PostgreSQL 拒写、备份失败、构建失败；机器/磁盘损坏 → 数据与备份一起消失。
- 建议：备份异机/对象存储副本（至少一份不在同一块盘）；清理历史 `.next` 与 pm2 日志轮转；磁盘 >80% 告警。

---

### P1 —— 上线前应完成

#### P1-1 可观测性接近于零

- 生产未配 `SENTRY_DSN` → `sentry.*.config.ts` 三份文件形同摆设，线上报错无人知。
- `/api/health` 不探库 → 数据库挂了探活仍返回 green。
- 无日志聚合、无告警；「扣次失败」「auth 调用失败」「hook 丢失」全靠人肉翻 pm2 日志。
- 建议：health 实做 `SELECT 1`；配 Sentry DSN；关键失败路径打结构化日志（带 `requestId`）并接入告警。

#### P1-2 核心业务没有测试保护

58 个用例集中在 validators / scoring / api / auth-portal / registration-ticket。**真正会出事故的地方没有单测**：配额扣减、券的兑换与转让、分享码一次性、评估落库、报告分享过期、删号删档。
- 建议：至少补 5 组 service 级用例（`deductQuota`/`transferCoupon`/`submitAttempt`/`deleteChild`/`onReferralRegistered`），并把 P0-1、P0-5 的修复用测试钉住。

#### P1-3 积分与推荐奖励是 read-modify-write，并发下会双发

- `src/lib/services/referral.service.ts:106` `onReferralRegistered`：`findFirst({shareCode, refereeId:null})` → `update` 指定 `refereeId`，**非原子**。两个并发注册可能抢到同一条 referral，后者覆盖前者；`pointsRegistered` 的「检查 → 发分 → 置标志」三步也不在事务里 → **可双发 +5 分**。
- `src/lib/services/point.service.ts:144` `calculateAndAwardBonusPoints`：读 `realPoints` 算差额 → 再 `increment`，典型的双发竞态。当前因**没有支付**（无人是付费用户）不会触发；**一旦接入支付立刻变成线上事故**。
- `recordPointTransaction` 的 `balance` 也是读后写 → 并发下流水余额与实际余额不符，对账必然错。
- `Referral.shareCode` 没有唯一约束，schema 层也没兜底。
- 建议：全部收进事务 + 用条件更新（如 `updateMany where pointsRegistered=false` 判定影响行数）+ 唯一约束兜底。

#### P1-4 应用侧没有定时任务

- `cleanup.service.ts` 的「过期 PENDING 账户清理」只能靠手动调 `POST /api/maintenance/cleanup`（还需鉴权）。crontab 里没有任何应用级定时任务。
- 影响：2 小时有效的预账户、过期券、过期分享批次不会被自动清理 → 库膨胀、脏数据累积、到期语义失效。
- 建议：加一个最小调度（systemd timer 或独立脚本入口），清理走幂等逻辑；或者用 PostgreSQL 的定时任务扩展。

#### P1-5 公开报告页会被搜索引擎收录（儿童隐私）

- `/shared/report/[shareCode]` 是**服务端渲染**（唯一 SSR 的数据页），返回**儿童姓名**与完整报告；仓库里**没有 `robots.ts`、没有 `sitemap.ts`、没有 `not-found.tsx`**。
- 影响：分享码一旦外泄并被爬取，儿童姓名与测评结论进入搜索引擎索引，与「儿童隐私」的表述冲突。
- 建议：该路由加 `robots: { index: false, follow: false }` + `metadata` 的 `noindex`；补 `robots.ts` 屏蔽 `/shared/`、`/api/`、`/admin/`；补 `not-found.tsx`。

#### P1-6 缺 CSP + JWT 存 localStorage

- 全仓无 Content-Security-Policy（`src/middleware.ts` 只设了 HSTS / nosniff / X-Frame-Options 等基础头）。
- `src/lib/api/client.ts:11` 把 JWT 存在 `localStorage['lzti_token']` → 任何 XSS 都能直接偷走长期凭据（JWT 有效期 7 天）。
- 建议：补 CSP（先 report-only 灰度）；会话改为 `httpOnly` cookie 或加短时效 access token + refresh 机制；同时修 P2-3（middleware 已废弃）。

#### P1-7 JWT 无 issuer/audience 隔离、无服务端失效手段

- `src/lib/auth/jwt.ts` 只签 `{userId}`，7 天有效，无 `iss`/`aud`，也没有服务端会话表 → **无法登出失效、无法强制下线**。
- 注：SSO 侧已额外锁了 audience（见跨应用方案），**本应用自身签发的 JWT 没有等价约束**。
- 建议：签发时带 `iss`/`aud`（`lzti`）；短期 access + refresh；`/api/auth/logout` 记黑名单或改用服务端会话。

#### P1-8 管理操作无审计日志

- 删除用户、导出全量用户数据、发放邀请码、修改配额 —— **全部没有审计**（只有业务表本身）。出问题后无法追责与复盘。
- 建议：加 `AdminAuditLog`（谁、何时、对谁、做了什么、结果），写库不写日志文件（与 auth 侧 `AuthAuditLog` 同样的判断）。

#### P1-9 匿名测评提交只校验「session 存在」

- `submitAttempt()` 的匿名分支只做 `findUnique({id: sessionId})`，不校验 slot / 分享凭据与 session 的绑定。
- 影响：sessionId 一旦泄露（分享链接、Referer、日志），任何人都能向该 session 提交视角 → **污染他人报告**。
- 建议：匿名提交时校验请求携带的 slot/分享凭据与 session 的绑定关系，且一次性。

#### P1-10 后台页面没有服务端守卫

- `/admin/*` 页面本身是客户端组件、任何人可打开看到框架（数据接口有 `role==='ADMIN'` 检查，所以**没有数据泄露**），但体验与审计都不合格。
- 建议：加服务端守卫（未登录/非管理员直接 redirect），并配合 P1-8 记录登录与管理动作。

#### P1-11 反馈闭环缺失

- `src/lib/services/email.service.ts`：SMTP 未配置时**静默跳过**（只 `console.log` 并返回 false）→ 生产上「提交了反馈但没人收到」。
- `/api/feedback` 要求登录，而 `Feedback.userId` 可空（设计上是支持匿名的），模型与路由不一致。
- 建议：至少进管理后台列表（有 `/admin/feedback`）+ 企微 Webhook 或 SMTP；SMTP 缺失时应在管理端显式标红「通知未接通」，而不是静默。

---

### P2 —— 效率与工程化

#### P2-1 部署资产不在仓库里
`deploy.sh` / `ecosystem.config.js` / nginx 副本都在 `/home/pupeng/projects/deploy/` → **部署流程不可复现、不可 code review、不可审计**，新人只能靠 `CLAUDE.md` 学。建议把 `ecosystem.config.js` 与 nginx 配置（脱敏后）版本化进仓库，`deploy.sh` 同步入库。

#### P2-2 `staging.env.example` 存在，但没有 staging 环境
备份脚本清单里 `lzti_staging` 是 0 用户空壳。要「上线前验证」却没有第三环境，验证只能压在 dev 或生产上 —— 这与「稳定」原则直接冲突。建议建独立库 + 独立端口 + 独立 SSO client。

#### P2-3 `src/middleware.ts` 用了 Next 16 已废弃的文件约定
按 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`：`middleware` 已改名 `proxy`（deprecated，下个大版本移除）。当前仍能工作但需迁移；同时借机补 CSP（P1-6）。

#### P2-4 lint 债 50 errors
靠 `continue-on-error` 放行，形同虚设。至少清掉 `no-explicit-any` 与未使用变量，让 lint 恢复拦截力。

#### P2-5 生产 pm2 用 cluster 跑 `next start`
当前 `instances:1` 等价单进程，风险不大；但 Next 16 的缓存/预渲染在多进程下行为不同，一旦有人把 `instances` 调大就会踩。建议显式统一为 `fork`（与 dev 一致，符合 CLAUDE.md「四环境统一 next start」的记录）。

#### P2-6 缺依赖与安全扫描
未接 `npm audit`、Dependabot、CodeQL、secret scanning。儿童数据 + 手机号 + 密码哈希的业务，依赖漏洞的爆炸半径不小。

#### P2-7 规则分散在代码与文档两处
积分规则（注册 +5 / 测评 +3 / 订阅 +3 / 每满 10 奖 2）、券规则（荔心卷 10 分 / 升学指数 15 分）、推荐年度上限 24 次、测评次数上限 —— 一部分在 `knowledge/用户体系和激励规则.md`，一部分在 `point.service.ts` 的魔数里。**代码与文档必然会漂移**。建议规则集中为一张配置表，文档引用同一份。

---

## 三、需要拍板的决策项（技术难度低，但会影响产品承诺）

| # | 决策 | 现状 | 建议 |
|---|---|---|---|
| D1 | **会员/支付是否上线** | `checkFeature()` 恒返回 `true`，`/membership` 页面展示订阅与权益但不 gating；支付回调未接 | 若本次不收费：**下架会员入口与权益文案**，避免虚假承诺。若要收费：支付回调、次数上限、退款流程是独立的新工程，**不要和这次上线混做** |
| D2 | **生产 SSO 入口何时开** | 代码已上生产但入口不渲染（正确状态）。B4 判据：wxcl 带统一密码真人号 ≥ 10，当前约 5 | **保持现状**。账户层有可登录账号之前不开，否则就是「点了登不进去」的半成品 |
| D3 | **`/api/bind` 门户绑定通道是否退役** | 文档已判定该通道建的用户在账号层里是断的，且门户不验证手机号 | 与 SSO 入口同批退役；退役前补频控 |
| D4 | **儿童数据合规口径** | 收集儿童姓名/性别/生日，隐私政策写了儿童隐私条款，但**没有监护人身份验证、没有年龄分级、没有数据保留期限的落地** | 上线前明确最小化字段、保留期、删除流程（依赖 P0-5 修好） |

---

## 四、上线准入清单（DoD）

- [ ] P0-1 券码转让越权已修 + 有单测（跨用户转让 → 403）
- [ ] P0-2 限流键改为可信 IP（或接 Redis）；伪造 `X-Forwarded-For` 无法绕过；登录加账户级失败锁定
- [ ] P0-3 三个公开接口已加频控；`/api/bind` 已下线或加签
- [ ] P0-4 所有码改用 `crypto.randomInt`；批次码位数提升
- [ ] P0-5 schema 补 `onDelete: Cascade`；删孩子、删用户（含有测评记录的用户）实测通过；无孤儿数据
- [ ] P0-6 生产改 `prisma migrate deploy`；上线前 `migrate diff` 出变更面并人工确认；迁移失败即中止
- [ ] P0-7 备份有异机副本；磁盘降到 <70% 且有 80% 告警
- [ ] P1-1 Sentry DSN 已配；health 真实探库；关键失败路径有告警
- [ ] P1-2 5 组核心 service 单测补齐
- [ ] P1-3 积分/推荐奖励改事务 + 条件更新
- [ ] P1-4 应用侧定时任务上线（清理过期账户/券/批次）
- [ ] P1-5 分享报告页 noindex；`robots.ts` / `not-found.tsx` 补齐
- [ ] P1-6 CSP 上线（先 report-only）
- [ ] P1-8 管理操作审计表
- [ ] P1-9 匿名提交校验分享凭据
- [ ] 决策项 D1~D4 已拍板并落地

---

## 五、与既有知识库的关系

本文与 `knowledge/跨应用账号体系方案.md`（账号层/SSO 侧）是**互补关系**：

- 那篇管的是「跨应用账号层怎么建、什么时候开 SSO 入口」；
- 本文管的是「荔学卷本应用自身要达到什么生产标准才能对外放量」。

两篇都遵守同一条底线：**稳定、合理、安全、高效**。其中「先做到安全降级、宁可不上线也不上半成品」的判断是一致的 —— 生产 SSO 入口现在不渲染是正确状态，不要为了「上线看起来完整」提前开。
