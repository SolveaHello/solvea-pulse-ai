# Pulse AI — AI 驱动客户全生命周期管理平台

> **系统**：Pulse AI — AI 驱动客户全生命周期管理平台
> **定位**：实时感知每一个客户的活跃状态、意向强度与价值变化，在正确时机用正确方式触达
> **版本**：v2.1
> **更新**：2026-04-01

---

> ### 📌 文档影响域映射（修改本文档时参照此表同步）
>
> | 本文档章节 | 影响 PRD.md | 影响 FRONTEND_FLOW.md | 影响 BACKEND_FLOW.md |
> |-----------|------------|----------------------|---------------------|
> | 平台双线架构 | §一产品概述 | §二目录结构、§三路由 | §一架构概述 |
> | LINE A STEP 1-2（采集+配置） | §四4.1-4.2 | 组件 MapSearchCard / CampaignWizard | routers/contacts、routers/campaigns |
> | LINE A STEP 3（外呼+Email） | §四4.3-4.4 | hooks/useCallStatus、CallDetailRow | routers/calls、services/vapi |
> | LINE A STEP 4（Campaign详情页） | §七7.1页面表 | routes/CampaignDetailPage 组件设计 | routers/campaigns GET /:id |
> | LINE A STEP 5（二次跟进） | §四4.4-4.5 | hooks/useFollowups | services/email、services/sms |
> | LINE A STEP 6（线索转化） | §四4.7 | routes/LeadsPage、LeadsTable | routers/leads |
> | LINE A STEP 7（复盘报告） | §四4.6 | routes/ReportsPage | routers/reports、scheduler |
> | Disposition 状态机 | §三状态机 | types/index.ts Disposition | models/contact Disposition enum |
> | LINE B 全部章节 | §一1.1双轨、§四新增 | routes/AudiencePage（待建） | routers/audience、services/rfm（待建） |
> | Phase 进度表 | §十实施计划 | §十待接入项 | §待建模块列表 |
> | 环境变量清单 | §九技术栈 | §八环境变量 | .env.example |

---

## 平台双线架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Pulse AI                                   │
│                                                                      │
│   ┌────────────────────────────┐  ┌───────────────────────────────┐  │
│   │     LINE A：外呼获客线      │  │     LINE B：用户运营线         │  │
│   │    （销售团队使用）          │  │    （用户运营团队使用）         │  │
│   │                            │  │                               │  │
│   │  搜索潜在 Leads             │  │  导入存量用户行为数据           │  │
│   │  → 配置外呼活动             │  │  → RFM 模型自动分层            │  │
│   │  → AI 外呼 + Email 营销    │  │  → 差异化触达策略              │  │
│   │  → 意向确认与分级           │  │  → Email / SMS 分层营销       │  │
│   │  → 二次智能跟进             │  │  → 效果追踪 + 复盘             │  │
│   │  → 高意向分配给销售         │  │  → 流失预警 / 复购召回         │  │
│   └────────────────────────────┘  └───────────────────────────────┘  │
│                         ↕ 共享客户 Profile                            │
│        ┌──────────────────────────────────────────────┐              │
│        │  统一客户 Profile  |  每日复盘报告  |  团队分配  │              │
│        └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

# LINE A — 外呼获客线

---

## STEP 1 — 搜索潜在 Leads

**目标**：批量获取目标行业、目标地区的 SMB 联系人

**系统入口**：`/campaigns/new` → AI 对话引导 → MapSearchCard 组件

### 操作流程

```
用户在对话框输入目标描述（如"纽约牙科诊所"）
      │
      ▼
AI 解析意图 → 展示 MapSearchCard 组件
      │
      ▼
用户在搜索框输入关键词（如 "dental clinics in NYC"）
      │
      ▼
系统调用 Google Places API 返回结果列表
  字段：店名、电话、邮箱、地址、评分、简介
      │
      ▼
用户勾选目标商家（支持全选）
      │
      ▼
点击「Next」进入 Campaign 配置阶段
```

### 数据来源支持

| 来源 | 入口 | sourceType |
|------|------|------------|
| Google Maps 关键词搜索 | MapSearchCard | `GOOGLE_MAPS` |
| CSV / Excel 批量上传 | `/api/contacts/upload` | `CSV_UPLOAD` |
| 手动录入 | `/api/contacts/manual` | `MANUAL` |

### 数据处理规则

- 电话号码统一标准化为 E.164 格式（`+1XXXXXXXXXX`）
- 同一 Campaign 内同一电话只保留一条（`@@unique([contactListId, phone])`）
- DNC 名单中的号码自动过滤，不写入 ContactList
- **法国号码特殊规则**：Vapi 对国际 E.164 号码会去掉本地前导 `0`，但法国号码（`+33`）国家码后的 `0` 必须保留。系统在传入 Vapi 前强制校验：法国号码应为 13 位（`+33` + 10 位），若收到标准 E.164 的 12 位格式（`+33` + 9 位），自动补回前导 `0`，确保格式为 `+330XXXXXXXXX`（如 `+330671950548`）

---

## STEP 2 — 创建外呼活动（Campaign 配置）

**目标**：在 AI 对话中一站式完成联络文件 + 外呼参数配置

**系统入口**：`/campaigns/new` → ChatSetupInterface → MapSearchCard Setup 阶段

### Campaign 配置卡片 UI

```
┌─────────────────────────────────────────────────────┐
│ Campaign Setup                          [← 返回]     │
├─────────────────────────────────────────────────────┤
│ 📋 Contact List                    [Download CSV]    │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Business Name       | Phone          | Email     │  │
│ │ Austin Family Dental| (512)555-0101  | hello@... │  │
│ │ Peak Performance Gym| (512)555-0303  | info@...  │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ 📞 Outbound Number                                   │
│ [+1 (512) 555-0000                               ]   │
│                                                      │
│ 🎯 Campaign Objective                                │
│ [Introduce our software and book a demo call      ]  │
│                                                      │
│ ⏰ When to Call                                      │
│ ○ Call now   ● Schedule                              │
│ [2026-04-02] [09:00]                                 │
│                                                      │
│       [Confirm & Continue →]                         │
└─────────────────────────────────────────────────────┘
```

### Campaign 状态机

```
DRAFT → CONFIGURED → RUNNING ⇄ PAUSED → COMPLETED
```

| 状态 | 含义 | 可执行操作 |
|------|------|----------|
| `DRAFT` | 创建中 | 继续编辑 |
| `CONFIGURED` | 配置完成 | 启动外呼 |
| `RUNNING` | 外呼进行中 | 暂停 |
| `PAUSED` | 已暂停 | 恢复 / 编辑话术 |
| `COMPLETED` | 全部联系人已处理 | 查看报告 |

### Agent 配置项

```
语气        → professional / friendly / casual / energetic
语速        → 0.8 - 1.2（默认 1.0）
语音提供商   → ElevenLabs / OpenAI / PlayHT / Deepgram
音色        → 从 Provider 列表中选择
开场白      → 自定义第一句话
话术脚本    → 完整通话指引（Talking Points）
并发上限    → 1 - 10 路同时外呼
外呼时间窗口 → 09:00 - 18:00（联系人本地时区，遵守 TCPA）
跟进触发规则 → 配置哪些 Disposition 自动触发 Email / SMS
```

---

## STEP 3 — AI 外呼 + Email Blast

**目标**：自动化触达联系人，实时同步状态

**系统入口**：Campaign 详情页 → 点击「Launch Campaign」

### 3A — AI 外呼 ✅ 已有

| 流程环节 | 技术实现 |
|---------|---------|
| 并发外呼（max 10） | Vapi.ai + asyncio Semaphore |
| 实时状态推送 | Server-Sent Events (SSE) |
| 通话录音存储 | AWS S3（签名临时链接，有效期 1h） |
| 转录 | Vapi → 全文文本 |
| 摘要 + Sentiment | Claude Haiku 生成结构化 JSON |
| Disposition 自动打标 | Claude 解析返回 `{ disposition, sentiment, confidence }` |
| 日历预约 | Google Calendar API（CALLBACK_REQUESTED 时自动创建） |

**Disposition 自动识别规则**：
- 置信度 ≥ 0.6 → 自动打标
- 置信度 < 0.6 → 降级为 `CALLED`，等待人工判断

### 3B — Email Blast ✅ 已有

- 对有邮箱的联系人并发发送 Claude 生成的个性化开发信
- 基于联系人行业 / 地区 / 简介生成差异化内容
- Resend API 发送，结果写入 `FollowUp`（`channel: EMAIL`）

### Disposition 状态说明

```
PENDING            → 待外呼，加入外呼队列
CALLED             → 已接通，无明确意向，人工判断
INTERESTED         → 明确有兴趣         ──► 触发 24h 跟进邮件
NOT_INTERESTED     → 明确拒绝           ──► 归档停止
VOICEMAIL          → 进入语音信箱       ──► 触发 Email + SMS
NO_ANSWER          → 无人接听           ──► 可加入下批次重拨
DNC                → 要求不再联系       ──► 永久排除，写入黑名单
CALLBACK_REQUESTED → 要求回拨           ──► 触发 Email + SMS + 日历约时
CONFIRMED          → 跟进后确认意向     ──► 推入销售工作台
CONVERTED          → 成交 / 注册完成    ──► 计入转化漏斗
```

---

## STEP 4 — 查看活动详情（Campaign Detail）

**目标**：全面掌握本次外呼活动的执行状态与每通电话的详细记录

**系统入口**：`/campaigns` 列表 → 点击活动卡片 → `/campaigns/:id`

### 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Campaign: "Austin Dental Outreach"                             │
│  状态: RUNNING  ·  开始时间: 2026-04-01 09:00  ·  联系人: 42     │
│                                              [Pause] [Report]  │
├────────────┬────────────┬────────────┬────────────┬────────────┤
│  总外呼数   │  接通率    │  有效对话  │ INTERESTED │  今日成本  │
│    42      │   68.3%   │   45.1%   │     8      │  $3.20    │
└────────────┴────────────┴────────────┴────────────┴────────────┘

Disposition 分布（环形图）
PENDING(18)  CALLED(6)  INTERESTED(8)  VOICEMAIL(4)  NO_ANSWER(6)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

通话记录列表
```

### 通话记录列表（8 列）

| 列名 | 内容 | 说明 |
|------|------|------|
| **联系人** | 商家名称 + 电话号码 | 点击展开详情 |
| **外呼号码** | 实际拨出的号码（E.164） | 多号码轮转时显示具体使用号 |
| **开始时间** | 外呼发起时间 | 格式：`Apr 1, 2026 09:14 AM` |
| **通话时长** | 秒级精度 | `0s` = 未接通，`2m 34s` = 正常通话 |
| **通话状态** | 技术层面状态 | `COMPLETED` / `NO_ANSWER` / `FAILED` / `IN_PROGRESS` |
| **Disposition** | 意向标签 | 彩色 Badge（INTERESTED = 绿，DNC = 红…） |
| **任务结果** | 是否达成目标 | `✅ 成功` / `⚠️ 部分` / `❌ 未达成` |
| **操作** | 展开详情按钮 | `查看详情 ▼` |

### 通话详情展开面板

```
┌─────────────────────────────────────────────────────────────────┐
│ Austin Family Dental  ·  (512) 555-0101  ·  Apr 1, 09:14 AM    │
│ 时长: 2m 34s  ·  外呼号: +15125550000  ·  INTERESTED ●         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎙️ 通话录音                                                     │
│  ▶  ──────────────○────────────────── 2:34  [↓下载]            │
│                                                                 │
│  ❌ 挂断原因                                                     │
│  customer-ended-call — 客户主动结束通话                          │
│                                                                 │
│  📝 通话摘要                                                     │
│  客户对产品有兴趣，表示需与合伙人商量后回复。询问了定价和免费试用期  │
│  情感倾向：积极（0.82）                                           │
│                                                                 │
│  🔑 关键点                                                       │
│  ● 询问定价，希望有免费试用                                       │
│  ● 需要和合伙人商量，预计本周内回复                               │
│                                                                 │
│  📋 下一步行动                                                   │
│  发送定价方案 PDF + 免费试用邀请链接                               │
│                                                                 │
│  💬 语音转文本（完整转录）               [展开 / 收起]            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  AI:  Hi, this is an AI assistant calling on behalf of... │  │
│  │  客户: Yes, hello?                                        │  │
│  │  AI:  We help dental practices automate follow-ups...     │  │
│  │  客户: That sounds interesting. What's the pricing?       │  │
│  │  ...                                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [✅ Confirm Lead]  [❌ Reject]  [📧 Send Follow-up]            │
└─────────────────────────────────────────────────────────────────┘
```

### 挂断原因枚举

| 原因值 | 说明 |
|--------|------|
| `customer-ended-call` | 客户主动挂断 |
| `assistant-ended-call` | AI 完成目标后主动结束 |
| `customer-did-not-answer` | 客户未接听 |
| `voicemail` | 转接语音信箱 |
| `customer-busy` | 占线 |
| `pipeline-error` | 技术错误 |
| `time-limit-exceeded` | 超出最大通话时长 |
| `silence-timed-out` | 长时间无响应 |

### 过滤 & 搜索

```
搜索框：按商家名 / 电话搜索
筛选器：Disposition / 通话状态 / 时间范围
排序：  开始时间倒序（默认）/ 时长降序 / Disposition
```

---

## STEP 5 — 自动二次跟进 ✅ 已有

**触发条件**：外呼结束后 Disposition 为 `INTERESTED` / `VOICEMAIL` / `CALLBACK_REQUESTED`

### 触发时机与渠道

| Disposition | 延迟 | 渠道 |
|-------------|------|------|
| `INTERESTED` | 24h 后 | Email |
| `CALLBACK_REQUESTED` | 立即 | Email + SMS |
| `VOICEMAIL` | 立即 | Email + SMS |
| `INTERESTED`（无邮箱） | 立即 | SMS |

### Email 跟进

```
触发
  → Claude Haiku 基于通话摘要生成个性化邮件
     主题 + 正文均针对通话中的具体关切定制
  → Resend API 发送
  → 写入 FollowUp（channel: EMAIL, status: SENT）
```

### SMS 跟进

```
VOICEMAIL / CALLBACK_REQUESTED → Twilio SMS（≤160字）
内容：简短行动号召（回复 / 预约 / 点击链接）
遵守：TCPA 规定，禁止欺骗性内容
```

### 跟进结果处理

| 场景 | 系统操作 |
|------|---------|
| 联系人回复有兴趣 | 在 `/leads` 人工标记 CONFIRMED |
| 联系人回复拒绝 | 点击 Reject → 标记 NOT_INTERESTED |
| 联系人点击取消订阅 | 自动标记 DNC，写入黑名单 |
| 无回复 | 保持 INTERESTED，下轮复盘决策 |

**跟进记录入口**：`/followups` — Email/SMS 发送历史、打开率、回复内容

---

## STEP 6 — 线索确认与销售转化 ✅ 已有

**系统入口**：`/leads`

### 线索状态看板

```
INTERESTED(42)   CONFIRMED(18)   CONVERTED(7)
┌────────────┐   ┌────────────┐  ┌───────────┐
│ 商家 A     │   │ 商家 D     │  │ 商家 G    │
│ 📞 有兴趣  │   │ 分配: John │  │ 已成交    │
│ [Confirm]  │   │ [Convert]  │  │           │
│ [Reject]   │   │ [Reassign] │  │           │
└────────────┘   └────────────┘  └───────────┘
```

### 操作流程

```
市场人员查看 INTERESTED 线索
    │
    ├─► 展开详情（通话录音 + 摘要 + 跟进记录）
    │
    ├─► 点击 "Confirm"
    │     → 标记 CONFIRMED + 记录 confirmedAt
    │     → 弹出分配弹窗 → 选择销售代表（assignedTo）
    │
    └─► 点击 "Reject" → 标记 NOT_INTERESTED

销售代表接手 CONFIRMED 线索
    │
    ├─► 查看通话摘要 / 录音 / Follow-up 往来
    ├─► 人工电话 / 线下对接
    ├─► 点击 "Converted" → 标记 CONVERTED + 记录 convertedAt
    └─► 点击 "Reassign" → 重新分配给其他销售代表
```

### 线索详情字段

| 字段 | 内容 |
|------|------|
| 商家名称 / 电话 / 邮箱 | 基本联系信息 |
| Disposition | 当前意向状态 |
| 所属 Campaign | 来源活动名称 |
| 分配销售 | assignedTo |
| 通话摘要 | Claude 生成，含 Key Points + Next Action |
| 跟进历史 | Email / SMS 发送 + 打开 + 回复记录 |

---

## STEP 7 — 每日复盘报告 ✅ 已有

**系统入口**：`/reports` → 点击 Generate Report / 每日 00:00 自动生成

### 报告内容

```
📊 核心指标（7 项）
  外呼总数    接通率      有效对话率   INTERESTED 率
  跟进转化率  Email打开率  今日总成本

🔁 转化漏斗
  外呼 → 接通 → 有效对话 → INTERESTED → CONFIRMED → CONVERTED

🤖 Claude 洞察（insights）
  示例："今日接通率 42%，低于均值，建议调整外呼时间段"
       "INTERESTED 中 60% 来自餐饮，验证 Niche 方向"

📋 优化建议（recommendations）
  示例："明日改为下午 2-4pm 外呼，避开餐饮午市"
       "开场白加入'1分钟了解'降低抵触感"
```

### 指标计算公式

| 指标 | 公式 |
|------|------|
| 接通率 | COUNT(disposition ≠ NO_ANSWER) / 外呼总数 |
| 有效对话率 | COUNT(NOT IN [NO_ANSWER, VOICEMAIL]) / 接通数 |
| INTERESTED 率 | COUNT(INTERESTED) / 有效对话数 |
| 跟进转化率 | COUNT(CONFIRMED) / COUNT(INTERESTED) |
| Email 打开率 | opened_count / sent_count |
| 总成本 | Vapi + Claude Token + Twilio + Resend |

**报告维度**：按单个 Campaign 或跨 Campaign 汇总，历史可追溯 30 天

---

---

# LINE B — 用户运营线（RFM 模型）

---

## STEP 1 — 导入存量用户数据 ❌ 待建

**目标**：将现有用户的交易 / 行为记录导入系统，作为 RFM 计算原料

**系统入口**：`/audience` → Import Users

### 导入方式

| 方式 | 说明 |
|------|------|
| CSV 上传 | 包含 user_id / 最近购买日期 / 消费次数 / 消费金额 / 邮件 / 手机号 |
| CRM 直连 | 对接 Salesforce / HubSpot 等，定期同步 |
| 数据库同步 | 通过 API 定时拉取用户行为数据 |

### 字段要求

```
必填：user_id, last_purchase_date, total_orders, total_spent
可选：email, phone, name, segment_tag
```

---

## STEP 2 — RFM 模型自动分层 ❌ 待建

**目标**：量化每个用户的价值，自动归入 6 大群组

### RFM 得分计算

```
R (Recency)   → 最近一次交互距今天数（越小越好）
F (Frequency) → 总交互 / 购买次数（越大越好）
M (Monetary)  → 累计消费金额（越大越好）

每个维度按分位数划分 1-5 档
综合得分 = R 权重 × R分 + F 权重 × F分 + M 权重 × M分
```

### 6 大用户群组

| 群组 | 标识 | 特征 | 规模预估 |
|------|------|------|---------|
| 🏆 Champions | 高R 高F 高M | 近期活跃、高频购买、高消费 | ~10% |
| 💛 Loyal | 高F 中M | 稳定复购，忠实用户 | ~15% |
| 🌱 Potential | 高R 低F | 新用户或偶发购买，有潜力 | ~20% |
| ⚠️ At Risk | 曾高F 但R下降 | 曾经活跃，近期沉默 | ~20% |
| 🚨 Can't Lose | 高M 但R极低 | 高价值用户但已长期沉默 | ~5% |
| 💤 Lost | 低R 低F 低M | 流失用户，低频触达或停止 | ~30% |

### RFM 群组状态流转

```
用户导入
  │
  └─► 每日 RFM 重算
        │
        ├─► Champions      ──► 转介绍活动 / 专属权益
        ├─► Loyal          ──► 新品推送 / 积分任务
        ├─► Potential      ──► 引导第二次购买
        ├─► At Risk  ◄─────── 从 Active 下滑时预警触发
        │     └─► 召回活动 → 成功 → 回升 Active
        ├─► Can't Lose ◄──── 高价值用户沉默预警
        │     └─► 强挽留 → 成功 → 回升 Loyal
        └─► Lost       ──► 低频唤醒 or 停止触达
```

---

## STEP 3 — 差异化触达策略配置 ❌ 待建 ← 🧑 运营配置

**目标**：按群组制定不同的营销目标、内容策略、触达频率

### 各群组策略

| 群组 | 营销目标 | 内容策略 | 触达渠道 | 频率 |
|------|---------|---------|---------|------|
| 🏆 Champions | 转介绍 / 维系关系 | 专属权益邀请、VIP 活动、感谢信 | Email | 月 1-2 次 |
| 💛 Loyal | 新品体验 / 积分激励 | 新品优先预览、积分翻倍活动 | Email | 双周 1 次 |
| 🌱 Potential | 引导第二次购买 | 首购感谢 + 推荐相关产品 + 优惠码 | Email + SMS | 周 1 次 |
| ⚠️ At Risk | 唤回活跃 | 限时折扣、"好久不见"关怀问候 | Email + SMS | 即时触发 |
| 🚨 Can't Lose | 强力挽留 | 专属客服跟进、最高折扣、个性化挽留 | Email + SMS + 电话 | 即时触发 |
| 💤 Lost | 低频唤醒 | 大促期间触达、告知新功能 | Email | 季度 1 次 |

### 内容生成

- Claude 根据群组特征 + 用户历史行为生成差异化 Email / SMS 文案
- 支持人工审核后发送，也支持全自动发送

---

## STEP 4 — 分层 Email / SMS 营销 ❌ 待建

**目标**：按群组批量发送定制化营销内容

```
运营人员配置活动（目标群组 + 内容策略 + 发送时间）
      │
      ▼
系统按群组筛选用户
      │
      ▼
Claude 生成每封邮件 / 每条短信的个性化内容
      │
      ├─► Email: Resend API 批量发送
      └─► SMS:   Twilio 批量发送
      │
      ▼
发送记录写入 FollowUp 表（含 rfm_segment 字段标记来源群组）
```

### 发送规则

- Email 遵守 CAN-SPAM：必须包含取消订阅链接
- SMS 遵守 10DLC 注册要求，不超过 160 字符
- `Lost` 群组每季度最多触达 1 次，避免骚扰

---

## STEP 5 — 响应追踪与效果评估 ❌ 待建

**目标**：全链路追踪营销效果，量化 ROI

### 追踪指标

| 指标 | 数据来源 |
|------|---------|
| Email 打开率 | Resend Webhook（`email.opened`） |
| Email 点击率 | Resend Webhook（`email.clicked`） |
| Email 回复率 | Resend Inbound Webhook |
| SMS 送达率 | Twilio Webhook |
| SMS 回复率 | Twilio Inbound |
| 复购转化率 | 用户再次购买事件回传 |
| 群组流转率 | At Risk → Active 的比率 |

### 效果报告

```
📊 群组维度报告
  各群组用户数 / 发送量 / 打开率 / 复购率

📈 群组流转分析
  本月 At Risk → Active: +23 人
  本月 Potential → Loyal: +41 人

🤖 Claude 运营洞察
  "Champions 群组转介绍率达 12%，建议加大专属权益投入"
  "At Risk 召回活动有效，建议提前 7 天触发"
```

---

## STEP 6 — 流失预警与自动触发 ❌ 待建

**目标**：系统主动识别潜在流失用户，在流失前完成干预

```
定时任务每日 00:00 重算所有用户 RFM 分层
      │
      ▼
检测群组变动
      │
      ├─► Active → At Risk    ──► 触发预警通知给运营负责人
      │                       ──► 自动将用户加入"召回 Campaign"
      │
      └─► At Risk → Lost      ──► 触发强挽留活动
                              ──► 高价值用户（Can't Lose）推送专属客服跟进
```

### 预警阈值配置

```
R 天数阈值：超过 N 天未购买则降级（默认 60 天）
F 频率下限：购买次数低于 M 次则降级（默认 2 次）
M 金额下限：消费金额低于 X 元则降级（按业务设定）
```

---

---

# 共用模块

---

## Disposition 状态机（外呼获客线完整）

```
                    ┌──────────────────────────────┐
                    │            PENDING            │
                    └──────────────┬───────────────┘
                                   │ 外呼触发
          ┌───────────┬────────────┼──────────┬────────────────┐
          ▼           ▼            ▼          ▼                ▼
   INTERESTED    NOT_INTERESTED  VOICEMAIL  NO_ANSWER       CALLED
   (自动跟进)    (归档停止)     (自动跟进)  (可重拨)      (人工判断)
          │                         │
          ▼                         ▼
   CONFIRMED ◄─── 人工确认     CALLBACK_REQUESTED
          │                    (自动跟进)
          ▼
   CONVERTED                   DNC（永久排除）
```

---

## 系统页面导航（双线完整）

| 页面 | 路径 | 功能 | 所属线 |
|------|------|------|-------|
| Dashboard | `/` | 双线关键指标 + 漏斗 + 活动概览 | 共用 |
| 活动列表 | `/campaigns` | 外呼活动列表，状态筛选，一键启动/暂停 | 获客线 |
| 新建活动 | `/campaigns/new` | AI 对话引导 → MapSearch → 配置卡片 | 获客线 |
| 活动详情 | `/campaigns/:id` | 统计概览 + 通话记录列表（含录音/转录/挂断原因） | 获客线 |
| 通话记录 | `/campaigns/:id/calls` | 录音播放 + 转录展开 + Disposition 筛选 | 获客线 |
| 线索管理 | `/leads` | INTERESTED → CONFIRMED → CONVERTED 看板 + 分配 | 获客线 |
| 跟进记录 | `/followups` | Email/SMS 发送历史，打开率，回复内容 | 共用 |
| 用户运营 | `/audience` | RFM 分层看板 + 群组管理 | 运营线 |
| RFM 活动 | `/audience/campaigns` | 分层触达活动配置与执行 | 运营线 |
| 每日报告 | `/reports` | 报告列表 + 指标图表 + AI 洞察 + 建议 | 共用 |
| 设置 | `/settings` | API Keys / 外呼号码 / Google Calendar / 邮件域名 | 共用 |

---

## 数据模型摘要

```
User
  └── Campaign (1:N)
        ├── ContactList (1:1)
        │     └── Contact (1:N)
        │           ├── disposition: Disposition
        │           ├── assignedTo: String?
        │           ├── confirmedAt: DateTime?
        │           └── convertedAt: DateTime?
        └── Call (1:N)
              ├── status: CallStatus
              ├── disposition: Disposition
              ├── startedAt / endedAt / duration
              ├── outboundNumber: String        ← 实际使用的外呼号码
              ├── endReason: String?            ← 挂断原因
              ├── costCents: Int?
              ├── Recording (1:1)              ← S3 录音文件
              ├── Transcript (1:1)             ← 语音转文本全文
              ├── CallSummary (1:1)            ← Claude 生成摘要
              │     ├── summary / keyPoints / sentiment
              │     ├── nextAction / extractedData
              ├── Appointment (1:1)            ← 日历预约
              └── FollowUp (1:N)              ← Email / SMS 跟进

AudienceUser (Line B 新增)               ← 存量用户
  ├── rfmScore: RFMScore (1:1)           ← R / F / M 得分
  ├── segment: RFMSegment                ← 所属群组
  └── FollowUp (1:N)                    ← 分层营销记录（含 rfm_segment 字段）
```

---

## Phase 实施进度

| Phase | 功能模块 | 所属线 | 状态 |
|-------|---------|-------|------|
| **Phase 1** | AI 外呼 + 录音 + 转录 + 摘要 + Disposition 打标 | A | ✅ 完成 |
| **Phase 1** | Email 跟进（Resend + Claude） | A | ✅ 完成 |
| **Phase 1** | SMS 跟进（Twilio） | A | ✅ 完成 |
| **Phase 2** | 每日复盘报告（定时 + 手动 + Claude 洞察） | 共用 | ✅ 完成 |
| **Phase 2** | 转化漏斗可视化 | A | ✅ 完成 |
| **Phase 3** | 线索管理工作台（/leads） | A | ✅ 完成 |
| **Phase 3** | 销售人员分配（AssignLeadModal） | A | ✅ 完成 |
| **Phase 3** | CONVERTED 线索重新分配（Reassign） | A | ✅ 完成 |
| **Phase 3** | Campaign 详情页（概览 + 通话记录列表） | A | ✅ 完成 |
| **Phase 3** | 通话详情展开（录音 + 转录 + 挂断原因） | A | ✅ 完成 |
| **Phase 4** | 邮件回复 Webhook 解析 + AI 自动建议（`analyze_reply()`） | A | ✅ 完成 |
| **Phase 4** | UTM 注册链接生成 + 事件回传 | A | ✅ 完成 |
| **Phase 4** | 话术自优化（复盘建议 → 人工确认 → `ScriptVersion` 表） | A | ✅ 完成 |
| **Phase 5** | 用户数据导入（CSV 解析 + 批量写库） | B | ✅ 完成 |
| **Phase 5** | RFM 评分计算引擎（`rfm_service.py`，分位数分层） | B | ✅ 完成 |
| **Phase 5** | 6 大群组管理 + 用户运营看板（/audience） | B | ✅ 完成 |
| **Phase 5** | 分层触达活动配置（`/audience/campaigns`） | B | ✅ 完成 |
| **Phase 5** | 群组批量 Email / SMS 发送 | B | ✅ 完成 |
| **Phase 6** | 营销效果追踪（open/click/reply 写入 AudienceFollowUp） | B | ✅ 完成 |
| **Phase 6** | 流失预警定时任务（APScheduler 每日 00:05 RFM 重算） | B | ✅ 完成 |
| **Phase 6** | 双线统一 Dashboard（`GET /api/v1/dashboard/stats`） | 共用 | ✅ 完成 |

---

## 环境变量清单

```bash
# AI & 外呼
ANTHROPIC_API_KEY=         # Claude API（摘要 / 内容生成 / 洞察）
VAPI_API_KEY=              # Vapi 外呼服务
VAPI_PHONE_NUMBER_ID=      # 外呼号码 ID
VAPI_WEBHOOK_SECRET=       # Webhook 签名验证密钥

# 联系人采集
GOOGLE_MAPS_API_KEY=       # Google Places API

# 通信
RESEND_API_KEY=            # Email 发送
RESEND_FROM_EMAIL=         # 发件人地址
TWILIO_ACCOUNT_SID=        # SMS 发送
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=        # Twilio 短信号码

# 存储
AWS_ACCESS_KEY_ID=         # 录音文件存储
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# 日历
GOOGLE_CLIENT_ID=          # Calendar OAuth2
GOOGLE_CLIENT_SECRET=

# 数据库
DATABASE_URL=              # PostgreSQL 连接串

# Line B — RFM 用户运营（Phase 5 新增）
RFM_RECENCY_DAYS=90        # R 计算窗口天数（默认 90 天）
RFM_SCORE_BINS=5           # RFM 分位数分层数（默认 5 档）
```

---

*文档维护：产品 & 运营团队联合维护，每 Sprint 同步更新。*
*MARKETING_FLOW_DESIGN.md 已并入本文档，原文件可归档删除。*
