# Pulse AI — AI 驱动客户全生命周期管理平台

> **版本**：v2.1  
> **日期**：2026-04-01  
> **状态**：迭代中  

---

## 一、产品概述

### 1.1 产品定位

Pulse AI 是一个面向**销售团队与用户运营团队**的 AI 驱动客户全生命周期管理平台。

名字取自"脉搏"——实时感知每一个客户的活跃状态、意向强度与价值变化，在正确的时机、用正确的方式触达，推动从陌生线索到高价值客户的完整转化。平台覆盖两条并行业务线：

```
┌──────────────────────────────────────────────────────────────┐
│                        Pulse AI                              │
│                                                              │
│   ┌─────────────────────────┐  ┌──────────────────────────┐ │
│   │   外呼获客线（销售团队）  │  │  用户运营线（运营团队）   │ │
│   │                         │  │                          │ │
│   │  搜索潜在 Leads          │  │  导入存量用户数据         │ │
│   │  → AI 外呼 / 邮件营销    │  │  → RFM 模型分层          │ │
│   │  → 确认意向              │  │  → 分层触达策略           │ │
│   │  → 二次跟进              │  │  → Email / SMS 营销      │ │
│   │  → 高意向分配给销售       │  │  → 召回 / 复购 / 流失预警 │ │
│   └─────────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**外呼获客线**：帮助销售团队系统化地搜索潜在商机，通过 AI 自动外呼或邮件营销完成意向确认，再经智能二次跟进筛选出高意向客户，最终精准分配给销售人员完成成交。

**用户运营线**：帮助运营团队对存量用户进行 RFM 价值分层，针对"冠军用户（Champions）""即将流失（At Risk）""已流失（Lost）"等不同群体制定差异化的 Email / SMS 触达策略，提升复购、唤醒沉默、降低流失。

### 1.2 核心价值

#### 外呼获客线

| 团队痛点 | Pulse AI 解法 |
|---------|-------------|
| 手动搜索潜在客户联系方式效率低 | Google Maps API 关键词批量抓取，自动标准化去重 |
| 人工外呼成本高、话术不一致 | Vapi AI 并发外呼（max 10），话术脚本统一管理 |
| 通话结果靠人工记忆和笔记 | 通话录音 + 自动转录 + Claude 生成结构化摘要 |
| 跟进邮件/短信耗时且模板化 | Claude 基于通话摘要生成个性化跟进内容 |
| 线索意向强弱无法量化 | Sentiment 分析 + Disposition 状态机自动分级 |
| 销售拿到的线索质量参差不齐 | 仅将 CONFIRMED 高意向线索推送至销售工作台 |

#### 用户运营线

| 团队痛点 | Pulse AI 解法 |
|---------|-------------|
| 用户分层靠直觉，缺乏数据依据 | 内置 RFM 模型自动计算用户价值分层 |
| 对所有用户发同一套营销内容 | 按 RFM 群组生成差异化 Email/SMS 内容 |
| 不知道哪些用户即将流失 | At Risk / Can't Lose 群组预警，优先触达 |
| 营销效果无从追踪 | 打开率、点击率、回复率、复购率全链路追踪 |
| 用户运营和获客数据割裂 | 统一客户 Profile，获客与运营共用一张数据视图 |

### 1.3 目标用户

| 角色 | 所在团队 | 核心使用场景 |
|------|---------|------------|
| **销售经理** | 销售团队 | 创建外呼活动、配置话术、查看高意向线索、分配给 SDR |
| **SDR / 销售代表** | 销售团队 | 处理 CONFIRMED 线索，跟进成交，标记 CONVERTED |
| **用户运营负责人** | 运营团队 | 配置 RFM 策略、创建分层触达活动、查看复盘报告 |
| **内容运营** | 运营团队 | 审核 AI 生成的邮件/短信内容，维护模板库 |
| **系统管理员** | IT / 技术 | 管理 API 密钥、外呼号码、Calendar、邮件域名 |

### 1.4 两条业务线对比

| 维度 | 外呼获客线 | 用户运营线 |
|------|-----------|----------|
| 目标人群 | 尚未建立关系的潜在客户 | 已有交互记录的存量用户 |
| 数据来源 | Google Maps / CSV 导入 | CRM 导入 / 用户行为数据 |
| 触达方式 | AI 外呼（首选）+ Email | Email + SMS（主） |
| 分层逻辑 | Disposition 意向状态机 | RFM 价值模型 |
| 核心目标 | 意向确认 → 销售转化 | 复购提升 / 流失召回 |
| 关键指标 | 接通率、INTERESTED 率、CONVERTED 率 | 打开率、复购率、流失率变化 |

---

## 二、流程架构

### 2.1 主流程（Line A 外呼获客线，7 步闭环）

```
STEP 1  →  STEP 2  →  STEP 3A/3B  →  STEP 4  →  STEP 5  →  STEP 6  →  STEP 7
采集        配置         外呼+邮件     查看详情    二次跟进     线索转化    复盘报告
```

### 2.2 流程详述

#### STEP 1 — Google Maps 批量采集 SMB 联系人

- 输入关键词（如 `nail salon NYC`）触发 Google Places Search
- 返回字段：店名、电话、邮箱、地址、网站、评分、评论数
- 自动去重（按电话 E.164 标准化后比对）
- 写入 `ContactList`，`source = GOOGLE_MAPS`，初始 `disposition = PENDING`

#### STEP 2 — 定义外呼任务（Campaign 配置）

- AI 对话引导 + MapSearchCard 一站式配置：联络文件 + 外呼号码 + 活动目标 + 执行时间
- 配置 AI Agent 参数：语气（professional/friendly/casual/energetic）、语速、语音、开场白
- 设置并发数上限（1-10）和外呼时间窗口（遵守 TCPA 09:00-18:00 本地时区）
- 配置自动跟进触发条件（哪些 Disposition 触发 Email/SMS）
- 人工审批后 Campaign 状态变更为 `CONFIGURED`，可启动外呼

#### STEP 3A — AI 外呼

- Vapi AI 按并发限制批量外呼联系人（max 10）
- 实时 SSE 推送通话状态到前端
- 通话结束后自动：录音上传 S3、转录文本、Claude 生成摘要
- Sentiment 分析 → 自动打 Disposition 标签，置信度 < 0.6 时降级为 `CALLED`

#### STEP 3B — Email Blast

- 对 `ContactList` 中有邮箱的联系人并发发送营销邮件
- Claude 基于联系人行业 / 地区 / 简介生成个性化内容
- 通过 Resend API 发送，结果写入 `FollowUp` 表

#### STEP 4 — 查看活动详情（Campaign Detail Page）

- `/campaigns/:id` 展示统计概览：总外呼数、接通率、INTERESTED 数、今日成本、Disposition 分布
- 通话记录列表：外呼号码、开始时间、通话时长、通话状态、Disposition Badge、任务结果
- 通话详情展开：录音播放（进度条 + 下载）、挂断原因、通话摘要、Key Points、完整转录
- 行内操作：Confirm Lead / Reject / Send Follow-up

#### STEP 5 — 智能二次跟进

| 触发条件 | 延迟 | 渠道 |
|---------|------|------|
| `INTERESTED` | 24h 后 | Email |
| `CALLBACK_REQUESTED` | 立即 | Email + SMS |
| `VOICEMAIL` | 立即 | Email + SMS |

- Email 内容由 Claude 基于通话摘要生成
- SMS 为简短行动号召（Twilio 发送，遵守 TCPA / 10DLC）
- 收到回复或点击后：人工标记 `CONFIRMED` 或 `NOT_INTERESTED`
- 点击取消订阅链接 → 自动标记 `DNC`

#### STEP 6 — 线索确认与销售转化

- `CONFIRMED` 线索推入销售工作台（`/leads`）
- 销售查看线索详情（通话录音 + 摘要 + 邮件往来）
- 销售完成对接后标记 `CONVERTED`；可 Reassign 给其他销售代表
- 注册链接带 UTM 参数追踪，注册事件回传 → 自动 `CONVERTED`（Phase 4 待建）

#### STEP 7 — 每日复盘报告

- 每日 00:00 自动生成，或手动触发
- 统计 7 项指标：外呼数、接通率、有效对话率、INTERESTED 率、跟进转化率、Email 打开率、成本
- Claude 生成「今日洞察 + 明日建议」自然语言摘要

---

## 三、Disposition 状态机

```
                    ┌──────────────────────────────┐
                    │            PENDING            │
                    └──────────────┬───────────────┘
                                   │ 外呼触发
          ┌────────────────────────┼─────────────────────────┐
          ▼                        ▼                          ▼
   INTERESTED               NOT_INTERESTED              VOICEMAIL
   (自动跟进)               (归档停止)                 (自动跟进)
          │                                                   │
          ▼                                                   ▼
   CONFIRMED ◄─── 人工确认                           NO_ANSWER
          │                                          (可重新外呼)
          ▼
   CONVERTED                    DNC (永久排除)
                                CALLBACK_REQUESTED (自动跟进)
                                CALLED (待处理)
```

### 状态说明

| Disposition | 含义 | 后续动作 |
|------------|------|---------|
| `PENDING` | 待外呼 | 加入外呼队列 |
| `INTERESTED` | 有兴趣 | 自动发跟进邮件（24h） |
| `NOT_INTERESTED` | 无兴趣 | 归档，停止所有跟进 |
| `VOICEMAIL` | 留言 | 自动发 Email + SMS |
| `NO_ANSWER` | 未接听 | 可重新加入下批次 |
| `CALLBACK_REQUESTED` | 要求回拨 | 自动发 Email + SMS + 约定时间 |
| `CALLED` | 已接通无明确意向 | 人工判断后续 |
| `DNC` | 拒绝联系 | 永久排除，写入黑名单 |
| `CONFIRMED` | 已确认意向 | 分配给销售 |
| `CONVERTED` | 已注册/成交 | 计入转化漏斗 |

---

## 四、功能模块详细需求

### 4.1 联系人采集模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| Google Maps 关键词搜索 | P0 | ✅ |
| 联系人去重（电话 E.164） | P0 | ✅ |
| CSV 批量导入 | P1 | ✅ |
| 联系人列表展示与筛选 | P1 | ✅ |
| DNC 排除名单管理 | P1 | ✅ |

**业务规则**

- 电话号码统一标准化为 E.164 格式（`+1XXXXXXXXXX`）
- 同一电话号码在同一 Campaign 中只允许出现一次
- `source` 字段区分来源：`GOOGLE_MAPS` / `CSV_IMPORT` / `MANUAL`
- **法国号码特殊规则**：Vapi 对 E.164 国际号码会去掉本地前导 `0`，但法国（`+33`）国家码后的 `0` 必须保留。系统在存储和传递给 Vapi 前强制校验：法国号码应为 13 位（`+33` + 10 位），标准 E.164 的 12 位格式（`+33` + 9 位）会自动补回前导 `0`，确保格式为 `+330XXXXXXXXX`（如 `+330671950548`）

### 4.2 Campaign 管理模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| 新建 Campaign（Wizard 引导） | P0 | ✅ |
| 话术脚本编写与预览 | P0 | ✅ |
| AI Agent 参数配置 | P0 | ✅ |
| 并发数 & 时间窗口设置 | P0 | ✅ |
| Campaign 状态管理（DRAFT/CONFIGURED/RUNNING/PAUSED/COMPLETED） | P0 | ✅ |
| 关联联系人列表 | P0 | ✅ |

**Campaign 状态机**

```
DRAFT → CONFIGURED → RUNNING ⇄ PAUSED → COMPLETED
```

- `DRAFT`：创建中，未完成配置
- `CONFIGURED`：配置完成，等待启动
- `RUNNING`：外呼进行中
- `PAUSED`：手动暂停
- `COMPLETED`：全部联系人已处理

### 4.3 AI 外呼模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| Vapi 并发外呼（max 10） | P0 | ✅ |
| 实时通话状态 SSE 推送 | P0 | ✅ |
| 通话录音上传 S3 | P0 | ✅ |
| 通话转录 | P0 | ✅ |
| Claude 通话摘要生成 | P0 | ✅ |
| Sentiment 分析 + 自动 Disposition 打标 | P0 | ✅ |
| 通话记录列表（含录音播放） | P1 | ✅ |

**Disposition 自动识别规则**

- AI 通话结束 → Webhook 回调 → Claude Haiku 分析转录文本
- 输出结构化 JSON：`{ "disposition": "INTERESTED", "summary": "...", "sentiment_score": 0.8 }`
- 置信度 < 0.6 时降级为 `CALLED`，等待人工判断

### 4.4 邮件跟进模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| Email Blast（活动级批量发送） | P0 | ✅ |
| 基于通话摘要个性化内容生成（Claude） | P0 | ✅ |
| Resend API 发送 + 状态追踪 | P0 | ✅ |
| 自动跟进触发（Disposition 触发） | P0 | ✅ |
| 邮件回复 Webhook 解析 | P1 | ❌ 待建 |
| AI 判断回复意向（自动建议 confirm/reject） | P1 | ❌ 待建 |

**邮件触发时机**

```
通话结束 Webhook → 判断 Disposition
  INTERESTED       → 延迟 24h → 发个性化跟进邮件
  CALLBACK_REQUESTED → 立即发邮件（含约定回拨说明）
  VOICEMAIL        → 立即发邮件（含语音留言提醒）
```

### 4.5 SMS 跟进模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| Twilio SMS 发送 | P0 | ✅ |
| 自动触发（配合 Email 同步发送） | P0 | ✅ |
| SMS 内容模板管理 | P2 | ⚠️ 部分 |

**SMS 内容规范**

- 不超过 160 字符（单条 SMS）
- 包含明确行动号召：回复、预约、点击链接
- 禁止包含欺骗性内容，遵守 TCPA 规定

### 4.6 复盘报告模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| 每日自动报告（00:00 定时） | P0 | ✅ |
| 手动触发报告生成 | P1 | ✅ |
| 7 项核心指标统计 | P0 | ✅ |
| Claude 洞察 + 建议文本生成 | P0 | ✅ |
| 报告历史列表 | P1 | ✅ |
| 话术优化建议 → 人工确认更新话术 | P2 | ⚠️ 部分 |

**核心指标定义**

| 指标 | 计算公式 |
|------|---------|
| 外呼总数 | COUNT(calls) |
| 接通率 | COUNT(disposition != NO_ANSWER) / 外呼总数 |
| 有效对话率 | COUNT(disposition NOT IN [NO_ANSWER, VOICEMAIL]) / 接通数 |
| INTERESTED 率 | COUNT(INTERESTED) / 有效对话数 |
| 跟进转化率 | COUNT(CONFIRMED) / COUNT(INTERESTED) |
| Email 打开率 | opened_count / sent_count（Resend 回调） |
| API 成本 | Vapi 费用 + Claude Token 费用 + Twilio 费用 + Resend 费用 |

### 4.7 线索管理与转化模块

**功能列表**

| 功能 | 优先级 | 状态 |
|------|:------:|:----:|
| CONFIRMED 线索列表（销售工作台） | P0 | ✅ |
| 线索详情（通话录音 + 摘要 + 跟进记录） | P0 | ✅ |
| confirm / convert / reject 一键操作 | P0 | ✅ |
| 销售人员分配（assignedTo） | P1 | ✅ |
| UTM 注册链接生成 | P1 | ❌ 待建 |
| 注册事件回传 → 自动 CONVERTED | P1 | ❌ 待建 |
| 漏斗可视化（4 阶段） | P1 | ✅ |

**漏斗阶段**

```
INTERESTED → CONFIRMED → CONVERTED → 注册
    (有意向)   (已确认)    (已成交)   (已注册)
```

---

## 五、数据模型

### 5.1 核心实体

#### Contact（联系人）

```typescript
{
  id: string                    // UUID
  campaignId: string            // 所属 Campaign
  name: string                  // 商家名称
  phone: string                 // E.164 格式
  email?: string                // 可选
  address?: string
  website?: string
  rating?: number               // Google 评分
  reviewCount?: number          // 评论数
  source: "GOOGLE_MAPS" | "CSV_IMPORT" | "MANUAL"
  disposition: Disposition      // 当前状态
  assignedTo?: string           // 销售人员 ID
  confirmedAt?: Date
  convertedAt?: Date
  dncAt?: Date                  // DNC 时间
  createdAt: Date
  updatedAt: Date
}
```

#### Campaign（活动）

```typescript
{
  id: string
  name: string
  goal: string                  // 活动目标描述
  script: string                // 话术脚本
  agentConfig: {
    tone: "professional" | "friendly" | "casual"
    speed: number               // 0.8 - 1.2
    language: string            // "en-US", "zh-CN"
  }
  maxConcurrent: number         // 1-10
  callWindowStart: string       // "09:00"
  callWindowEnd: string         // "18:00"
  timezone: string
  followUpTriggers: Disposition[] // 触发自动跟进的 Disposition
  status: "DRAFT" | "CONFIGURED" | "RUNNING" | "PAUSED" | "COMPLETED"
  createdAt: Date
  updatedAt: Date
}
```

#### Call（通话记录）

```typescript
{
  id: string
  contactId: string
  campaignId: string
  vapiCallId: string
  duration: number              // 秒
  recordingUrl: string          // S3 URL
  transcription: string
  summary: string               // Claude 生成
  sentimentScore: number        // -1 to 1
  disposition: Disposition
  dispositionConfidence: number // 0-1
  cost: number                  // USD
  createdAt: Date
}
```

#### FollowUp（跟进记录）

```typescript
{
  id: string
  contactId: string
  callId?: string               // 关联通话
  channel: "EMAIL" | "SMS"
  status: "PENDING" | "SENT" | "OPENED" | "REPLIED" | "FAILED"
  subject?: string              // Email 主题
  content: string               // 发送内容
  replyContent?: string         // 回复内容（邮件回复解析后填入）
  sentAt?: Date
  openedAt?: Date
  repliedAt?: Date
  createdAt: Date
}
```

#### DailyReport（每日报告）

```typescript
{
  id: string
  date: string                  // "2026-03-31"
  campaignId?: string           // null = 全平台统计
  metrics: {
    totalCalls: number
    answerRate: number
    effectiveRate: number
    interestedRate: number
    followUpConversionRate: number
    emailOpenRate: number
    totalCost: number
  }
  insights: string              // Claude 生成的洞察文本
  suggestions: string           // Claude 生成的建议文本
  createdAt: Date
}
```

---

## 六、API 接口规范

### 6.1 联系人

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/contacts` | 列表（支持 campaignId / disposition 筛选） |
| `POST` | `/api/contacts/import/google-maps` | Google Maps 批量导入 |
| `POST` | `/api/contacts/import/csv` | CSV 批量导入 |
| `DELETE` | `/api/contacts/:id` | 删除联系人 |
| `POST` | `/api/contacts/:id/dnc` | 加入 DNC |

### 6.2 Campaign

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/campaigns` | 列表 |
| `POST` | `/api/campaigns` | 新建 |
| `GET` | `/api/campaigns/:id` | 详情 |
| `PATCH` | `/api/campaigns/:id` | 更新配置 |
| `POST` | `/api/campaigns/:id/start` | 启动外呼 |
| `POST` | `/api/campaigns/:id/pause` | 暂停 |
| `POST` | `/api/campaigns/:id/resume` | 恢复 |

### 6.3 通话

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/campaigns/:id/calls` | 通话列表 |
| `GET` | `/api/calls/:id` | 通话详情 |
| `GET` | `/api/calls/stream` | SSE 实时状态流 |

### 6.4 跟进

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/followups` | 列表（支持 channel/status 筛选） |
| `POST` | `/api/followups/trigger` | 手动触发跟进 |
| `POST` | `/api/webhooks/email-reply` | 入站邮件回复 Webhook |

### 6.5 线索

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/leads` | INTERESTED 以上线索列表 |
| `POST` | `/api/leads/:id/confirm` | 标记 CONFIRMED + 分配销售 |
| `POST` | `/api/leads/:id/convert` | 标记 CONVERTED |
| `POST` | `/api/leads/:id/reject` | 标记 NOT_INTERESTED |

### 6.6 报告

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/reports` | 报告列表 |
| `POST` | `/api/reports/generate` | 手动生成报告 |
| `GET` | `/api/reports/:id` | 报告详情 |

### 6.7 Webhook（外部回调）

| 方法 | 路径 | 来源 | 说明 |
|------|------|------|------|
| `POST` | `/api/webhooks/vapi` | Vapi | 通话状态 / 结束回调 |
| `POST` | `/api/webhooks/resend` | Resend | Email 打开/送达/回复 |
| `POST` | `/api/webhooks/twilio` | Twilio | SMS 送达状态 |

---

## 七、页面与 UI 规范

### 7.1 页面导航

| 页面 | 路径 | 主要功能 | 所属线 |
|------|------|---------|-------|
| Dashboard | `/` | 7 个指标卡 + 漏斗图 + 近期活动 | 共用 |
| 活动列表 | `/campaigns` | 所有活动，状态筛选，一键启动/暂停 | 获客线 |
| 新建活动 | `/campaigns/new` | AI 对话引导 → MapSearch → 一站式配置卡片 | 获客线 |
| **活动详情** | `/campaigns/:id` | 统计概览 + 通话记录列表（录音/转录/挂断原因） + 行内操作 | 获客线 |
| 通话记录 | `/campaigns/:id/calls` | 录音播放 + 转录展开 + Disposition 筛选 | 获客线 |
| 线索管理 | `/leads` | INTERESTED/CONFIRMED/CONVERTED 看板 + 分配 + Reassign | 获客线 |
| 跟进记录 | `/followups` | Email/SMS 发送历史，打开率，回复内容 | 共用 |
| 用户运营 | `/audience` | RFM 分层看板 + 群组管理（Phase 5 待建） | 运营线 |
| RFM 活动 | `/audience/campaigns` | 分层触达活动配置与执行（Phase 5 待建） | 运营线 |
| 每日报告 | `/reports` | 报告列表 + 指标图表 + AI 洞察文本 | 共用 |
| 设置 | `/settings` | API Keys / 电话号码 / Google Calendar OAuth / 邮件域名 | 共用 |

### 7.2 Dashboard 关键指标卡片

```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  今日外呼  │ │   接通率   │ │ 有效对话率 │ │ INTERESTED│
│   1,240   │ │   68.3%   │ │   45.1%   │ │   12.4%   │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐ ┌───────────┐
│ 跟进转化率 │ │ Email打开率│ │  今日成本  │
│   34.2%   │ │   21.0%   │ │  $24.80   │
└───────────┘ └───────────┘ └───────────┘
```

### 7.3 线索管理看板

```
INTERESTED(42)   CONFIRMED(18)   CONVERTED(7)
┌────────────┐   ┌────────────┐  ┌───────────┐
│ 商家 A     │   │ 商家 D     │  │ 商家 G    │
│ NYC Nails  │   │ LA Salon   │  │ Nail Pro  │
│ 📞 摘要    │   │ 分配: John │  │ 已成交    │
│ [Confirm]  │   │ [Convert]  │  │           │
│ [Reject]   │   │ [Reassign] │  │           │
└────────────┘   └────────────┘  └───────────┘
```

---

## 八、非功能性需求

### 8.1 性能

| 指标 | 要求 |
|------|------|
| 并发外呼上限 | 10 路同时通话 |
| API 响应时间 | P99 < 500ms（排除 AI 生成接口） |
| AI 内容生成 | < 5s（Claude 摘要/邮件内容） |
| SSE 推送延迟 | < 1s |
| CSV 导入 | 支持 10,000 条联系人批量导入 |

### 8.2 可靠性

| 场景 | 处理策略 |
|------|---------|
| Vapi Webhook 失败 | 队列重试，最多 3 次，指数退避 |
| Resend 发送失败 | 记录 FAILED 状态，支持手动重发 |
| Claude API 超时 | 降级为默认摘要模板，后台异步重试 |
| 定时报告任务失败 | 告警 + 下次执行时补生成 |

### 8.3 安全

- API 密钥存储在服务端环境变量，不下发给前端
- 录音 S3 URL 使用签名临时链接（有效期 1 小时）
- Webhook 端点验证签名（Vapi secret / Resend signature）
- DNC 名单写入后不可删除，只能查看

### 8.4 合规

- 遵守 TCPA：仅在 9:00-18:00（联系人本地时区）内外呼
- 遵守 CAN-SPAM：邮件包含取消订阅链接，点击后自动标记 DNC
- SMS 遵守 10DLC 注册要求

---

## 九、技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 | Next.js (App Router) + Tailwind CSS + shadcn/ui |
| 后端 | FastAPI (Python) |
| 数据库 | PostgreSQL（Prisma ORM） |
| AI | Claude (Anthropic API) — 摘要 / 内容生成 / 洞察 |
| 外呼 | Vapi |
| 邮件 | Resend |
| SMS | Twilio |
| 存储 | AWS S3 |
| 日历 | Google Calendar API (OAuth2) |
| 地图 | Google Maps Places API |

---

## 十、实施计划

| Phase | 功能模块 | 所属线 | 状态 |
|-------|---------|-------|------|
| **Phase 1** | AI 外呼 + 录音 + 转录 + 摘要 + Disposition 打标 | A | ✅ 完成 |
| **Phase 1** | Email 跟进（Resend + Claude） | A | ✅ 完成 |
| **Phase 1** | SMS 跟进（Twilio） | A | ✅ 完成 |
| **Phase 2** | 每日复盘报告（定时 + 手动 + Claude 洞察） | 共用 | ✅ 完成 |
| **Phase 2** | 转化漏斗可视化 | A | ✅ 完成 |
| **Phase 3** | 线索管理工作台 `/leads` | A | ✅ 完成 |
| **Phase 3** | 销售人员分配（AssignLeadModal） | A | ✅ 完成 |
| **Phase 3** | CONVERTED 线索重新分配（Reassign） | A | ✅ 完成 |
| **Phase 3** | Campaign 详情页（概览 + 通话记录列表） | A | ✅ 完成 |
| **Phase 3** | 通话详情展开（录音 + 转录 + 挂断原因） | A | ✅ 完成 |
| **Phase 4** | 邮件回复 Webhook 解析 + AI 自动建议 | A | ✅ 完成 |
| **Phase 4** | UTM 注册链接生成 + 事件回传 | A | ✅ 完成 |
| **Phase 4** | 话术自优化（复盘建议 → 人工确认 → 更新话术） | A | ✅ 完成 |
| **Phase 5** | 用户数据导入（CSV + CRM 直连） | B | ✅ 完成 |
| **Phase 5** | RFM 评分计算引擎 | B | ✅ 完成 |
| **Phase 5** | 6 大群组管理 + 用户运营看板 `/audience` | B | ✅ 完成 |
| **Phase 5** | 分层触达活动配置 `/audience/campaigns` | B | ✅ 完成 |
| **Phase 5** | 群组批量 Email / SMS 发送 | B | ✅ 完成 |
| **Phase 6** | 营销效果追踪（打开率 / 点击率 / 复购率） | B | ✅ 完成 |
| **Phase 6** | 流失预警定时任务（每日 RFM 重算） | B | ✅ 完成 |
| **Phase 6** | 双线统一 Dashboard | 共用 | ✅ 完成 |

---

## 十一、成功指标（OKR）

### 业务指标

| KR | 目标值 |
|----|-------|
| 接通率 | ≥ 65% |
| INTERESTED 率 | ≥ 10% |
| INTERESTED → CONFIRMED 转化率 | ≥ 30% |
| CONFIRMED → CONVERTED 转化率 | ≥ 50% |
| 每外呼成本 | < $0.05 |

### 产品指标

| KR | 目标值 |
|----|-------|
| Campaign 配置到首次外呼 | < 10 分钟 |
| 跟进邮件自动发送率 | ≥ 95%（触发后 24h 内） |
| 每日报告自动生成成功率 | ≥ 99% |
| P99 API 延迟 | < 500ms |

---

## 十二、风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:----:|:----:|---------|
| Vapi API 不稳定导致外呼中断 | 中 | 高 | 队列重试 + 暂停后可恢复 |
| Claude API 成本超预算 | 中 | 中 | 按 Token 用量告警，超限降级 Haiku |
| 垃圾邮件过滤导致 Email 送达率低 | 高 | 中 | 域名预热 + SPF/DKIM/DMARC 配置 |
| Google Maps API 配额限制 | 低 | 中 | 缓存结果 + 分批请求 |
| TCPA 合规风险 | 低 | 极高 | 时间窗口硬限制 + DNC 严格执行 |

---

*文档维护：运营团队 & 产品团队联合维护，每 Sprint 同步更新。*
