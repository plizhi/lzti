# 荔枝测评 | 荔学卷

> 基于「内在结构养育理论」的学习状态评估工具
> 更新：2026-08-01

---

## 一、项目定位

帮助家长评估孩子的学习状态，生成个性化分析报告和引导建议。

**核心理念**：学业问题的底层是心智，心神不稳，再多外力也只是治标不治本。

**产品名称**：荔枝测评 | 荔学卷

---

## 二、评估体系

### 6学段核心能力

```
小学低(勤勉感) → 小学高(胜任感) → 初中(韧性萌芽) → 初三大(抗压适应) → 高一高二(意义建立) → 高三(选择承担)
```

### 当前学段：小学低年级（1-2年级）

| 维度 | 轴1 | 轴2 |
|------|-----|-----|
| 学习兴趣 | 好奇心 | 坚持完成 |
| 基础习惯 | 自动化 | 执行有序 |
| 情绪适应 | 情绪占据度 | 情绪表达 |

### 四象限

| 类型 | 含义 |
|------|------|
| optimal（绿） | 理想状态 |
| strategy（黄） | 需引导 |
| passive（灰） | 需支持 |
| overwhelmed（红） | 需关注 |

---

## 三、产品哲学

### 维度极简
学习兴趣 + 基础习惯 + 情绪适应 —— 家长能听懂的日常词，无专业术语。

### 测评即关注点矫正
测完不是就完了，是改变家长的思维方式。

| 测评前（错误）| 测评后（正确）|
|------------|------------|
| 孩子考试分数 | 孩子的内在结构 |
| 孩子听话不听话 | 孩子的学习兴趣/习惯/情绪 |
| 横向比较 | 纵向和自己的过去比 |

### 不测"分数"，测"内在状态"
题目不出现"考试/分数"，关注"孩子的状态/倾向"。

### 反对过度话术设计
家长不需要被教怎么和孩子说话，操作须知越细越紧张。唯一必要提醒：避免在孩子答完后追问或否定。

### 不信任"完美家长"画像
不要假设"全职妈妈、慢节奏、深度陪伴"，要承认家庭多样性（双职工、老人带等）。

---

## 四、邀请码与分享机制

### 核心理念
**邀请码 = 账户的第一次**
- 一个邀请码 = 一个预账户
- 邀请码激活时即创建预账户
- 预账户注册后升级为正式账户
- 邀请码使用后失效，与设备无关

### 账户体系
| 状态 | 说明 |
|------|------|
| PENDING | 预账户，激活邀请码后创建，无手机号密码 |
| ACTIVE | 正式账户，注册后升级，拥有完整凭证 |

### 三种分享链接

| 类型 | URL | 接收方 | 流程 |
|------|-----|--------|------|
| 邀请注册 | `/register?share=批次ID&slot=激活码` | 新用户 | 分配预账户 → 测评 → 2小时内注册 |
| 邀请孩子自评 | `/assessment/[stage]/student?share=批次ID&slot=码&childId=孩子ID` | 学生 | 直接提交到家长账户 |
| 邀请老师参评 | `/assessment/[stage]/teacher?share=批次ID&slot=码&childId=孩子ID` | 老师 | 直接提交到家长账户 |

### 链接特性
- **一次性**：邀请测评链接提交后失效，不可再用
- **预账户有效期**：测评完成后2小时
- **分享链接有效期**：2天

### 相关文档
- `knowledge/邀请码与分享流程设计.md` - 详细设计文档

---

## 五、功能

- **首页**：学段选择入口
- **测评**：5点量表，按维度分组答题
- **报告**：当下位置 + 变化趋势 + 关注建议
- **分享**：通过邀请码分享测评链接

---

## 六、技术栈

Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript + Prisma + PostgreSQL

---

## 七、知识库

- `knowledge/评估体系/` - 评估体系完整设计
- `knowledge/内在结构养育/` - 理论基础
- `knowledge/邀请码与分享流程设计.md` - 分享机制设计

---

## 八、数据库模型

### 核心表

| 表 | 说明 |
|---|------|
| User | 用户，含 status (PENDING/ACTIVE)、shareCode、bonusAttempts、bonusUsed |
| ShareBatch | 分享批次 |
| Slot | 邀请槽位 |
| Child | 孩子档案 |
| AssessmentSession | 测评会话 |
| SessionAttempt | 测评尝试 |
| AttemptReport | 测评报告 |
| UserInviteCode | 用户邀请码池 |

### 会员订阅表

| 表 | 说明 |
|---|------|
| Subscription | 订阅表（plan、status、attemptsTotal、attemptsUsed） |
| Payment | 支付记录（amount、status、provider、transactionId） |
| ReTestReminder | 复测提醒（userId、childId、remindAt、status） |

### 分享激励表

| 表 | 说明 |
|---|------|
| Referral | 邀请关系（referrerId、refereeId、rewardRegistered/Assessed/Subscribed） |
| ShareReward | 分享奖励记录（type、bonusCount） |
| ShareLog | 分享日志（shareCode、type） |

---

## 九、已完成

- [x] 多学段问卷（小学高/初中/高中） - 完成计分配置
- [x] 用户认证与孩子管理 - 已完整实现
- [x] 数据库集成 - Prisma + PostgreSQL 已配置
- [x] 邀请码与分享机制 - 完成
- [x] 历史记录与趋势对比 - /history 页面支持时间线/趋势视图切换
- [x] 报告分享/导出 - ShareReportModal + 打印功能（print.css）
- [x] 前端分享功能（家长分享孩子测评链接） - SharePanel 组件

---

## 十、2026-07-29 本次更新

### 已完成
- [x] Footer 组件 - 全局页脚（联系信息、隐私政策、服务条款入口）
- [x] 法律页面 - /privacy、/terms 内容完整
- [x] 用户反馈系统 - Feedback 模型 + FeedbackButton 组件 + 自动分类
- [x] 反馈管理后台 - /admin/feedback 页面
- [x] 快速筛查页面 - /screening/[stage]
- [x] 报告升级订阅提示 - ReportUpgradePrompt 组件 + 企微二维码
- [x] 分享报告重构 - SharedReportClient.tsx
- [x] 公开统计 API - /api/stats（已创建，但首页暂不使用）
- [x] standalone 部署模式 - ecosystem.config.js 配置正确
- [x] GitHub 备份 - 已同步到 plizhi/lzti
- [x] 首页简化 - 移除实时统计展示

### 待解决问题
- [ ] 邮件通知 SMTP 未配置（反馈邮件通知暂不可用）
- [ ] 企业微信 Webhook 通知（可选，反馈实时通知）

### 计划中功能
- [ ] 企微 Webhook 通知 - 有新反馈时推送到群聊
- [ ] 邮件通知 - 配置 SMTP 后启用

---

## 十一、2026-07-30 会员体系升级

### 已完成
- [x] 数据库变更 - Subscription、Payment、ReTestReminder、Referral、ShareReward、ShareLog 表
- [x] 权益检查中间件 - membership.service.ts 实现
- [x] 分享激励机制 - 注册+1、测评+1（追加）、订阅+3（追加）
- [x] 趋势对比功能 - TrendChart 组件，增强趋势展示
- [x] 复测提醒系统 - 测评完成后30天自动创建提醒
- [x] 会员中心页面 - /membership 展示会员状态和邀请奖励
- [x] 季度成长摘要 - quarterly-summary.service.ts 生成3个月数据汇总
- [x] 分享海报优化 - ShareReportModal 增强，显示孩子信息、象限标签
- [x] ReferralPanel 组件 - 展示分享码、邀请统计、奖励记录

### 新增 API
| 路由 | 说明 |
|------|------|
| /api/share/code | 获取/记录分享码 |
| /api/share/rewards | 获取分享奖励统计 |
| /api/reminders | 获取复测提醒 |
| /api/quarterly-summary | 获取季度成长摘要 |

### 安全修复
- [x] 防止自己推荐自己
- [x] 推荐奖励年度上限（每年最多24次）
- [x] useQuota 并发安全（事务保证原子性）

### 待接入（支付相关）
- [ ] 订阅次数限制（当前暂时全部开放）
- [ ] 会员专属功能 gating
- [ ] 支付回调处理（Stripe/Gumroad）

---

## 十二、生产级改进（2026-07-27）

- [x] 错误处理统一 - apiError 规范化，parseJsonBody 辅助函数
- [x] JWT_SECRET 生产检查 - 生产环境禁止使用默认值
- [x] 答案值验证 - validateAnswers 检查 1-5 范围
- [x] 测试覆盖 - validators.test.ts (20个用例)
- [x] 健康检查 - /api/health 端点
- [x] Sentry 集成 - sentry.*.config.ts 配置文件
- [x] 安全响应头 - middleware.ts

---

## 十三、技术备注

- Prisma 7 需要 `prisma.config.ts` 配置文件
- 数据库连接使用 `@prisma/adapter-pg` + `pg`
- 生产环境必须设置非默认的 JWT_SECRET
- **部署原则**：只操作当前项目进程，不影响其他项目
- **GitHub 仓库**：https://github.com/plizhi/lzti

### 部署架构（2026-08-01 更新）

- **进程管理**：systemd（不再使用 PM2）
- **工作目录**：`/home/pupeng/projects/lzti`
- **systemd 服务**：`/etc/systemd/system/lzti.service`
- **服务命令**：`systemctl start/restart/status lzti`
- **港服代理**：47.243.75.164 → 8.147.63.208:3000

### 部署流程

```bash
cd /home/pupeng/projects/lzti
git pull
npm run build
systemctl restart lzti
```

---

## 十四、操作红线

1. **不杀其他项目进程** - 只操作当前 lzti 项目的进程
2. **不修改其他项目代码** - 严格在 `/home/pupeng/projects/lzti` 下工作
3. **关注自己代码质量** - 确保改动正确后再提交
