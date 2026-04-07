# Pulse AI — AI 驱动客户全生命周期管理平台  
# 后端设计流程

> **框架**：FastAPI (Python) + SQLAlchemy (Async ORM)  
> **数据库**：PostgreSQL  
> **入口**：`backend/app/main.py`，监听 `8000` 端口

---

## 一、目录结构

```
backend/app/
├── main.py                         # FastAPI 实例 + 中间件 + Router 注册
├── config.py                       # 环境变量（Settings/Pydantic BaseSettings）
│
├── db/
│   └── database.py                 # AsyncSession 工厂 + Base 声明
│
├── models/
│   ├── campaign.py                 # 核心数据模型（全部表）
│   └── user.py                     # User 模型（含 google_calendar_tokens）
│
├── routers/                        # HTTP 路由层（thin controller）
│   ├── campaigns.py                # Campaign CRUD + 启动/暂停/恢复
│   ├── contacts.py                 # 联系人导入 + 列表
│   ├── webhooks.py                 # Vapi / Resend / Twilio Webhook 处理
│   ├── followups.py                # 跟进记录 CRUD + 手动触发
│   ├── leads.py                    # 线索列表 + confirm/convert/reject/reassign
│   ├── reports.py                  # 报告生成 + 列表
│   ├── google_calendar.py          # OAuth2 鉴权 + 日历操作
│   └── audience.py                 # Line B：RFM 群组管理（Phase 5 待建）
│
├── services/                       # 业务逻辑层
│   ├── vapi_service.py             # Vapi REST 封装 + 并发外呼编排
│   │                               #   _prepare_phone_for_vapi(): 法国号末尾保护
│   ├── claude_service.py           # Anthropic API（摘要/邮件内容/洞察）
│   ├── email_service.py            # Resend API + 邮件内容生成
│   ├── sms_service.py              # Twilio SMS
│   ├── google_maps_service.py      # Google Places API
│   ├── google_calendar_service.py  # Google Calendar API
│   ├── contact_import_service.py   # CSV 解析 + 批量写库（含法国号特殊处理）
│   ├── report_service.py           # 指标聚合 + Claude 洞察生成
│   └── rfm_service.py              # RFM 评分计算引擎（Phase 5 待建）
│
├── schemas/                        # Pydantic 请求/响应 Schema（待补充）
│
└── utils/
    └── sse_manager.py              # Server-Sent Events 广播管理器
```

---

## 二、数据模型关系

```
User
 └── Campaign (user_id FK)
       ├── ContactList (campaign_id FK)
       │     └── Contact (contact_list_id FK)
       │           ├── Call (contact_id FK)
       │           │     ├── Recording
       │           │     ├── Transcript
       │           │     ├── CallSummary
       │           │     ├── Appointment
       │           │     └── FollowUp (call_id FK, nullable)
       │           └── FollowUp (contact_id FK)
       └── DailyReport (campaign_id FK, nullable)
```

### 核心枚举

| 枚举 | 值 |
|------|----|
| `CampaignStatus` | DRAFT / CONFIGURED / RUNNING / PAUSED / COMPLETED / CANCELLED |
| `CallStatus` | QUEUED / RINGING / IN_PROGRESS / COMPLETED / FAILED / BUSY / NO_ANSWER |
| `Disposition` | PENDING / CALLED / INTERESTED / NOT_INTERESTED / VOICEMAIL / NO_ANSWER / DNC / CALLBACK_REQUESTED / CONFIRMED / CONVERTED |
| `SourceType` | GOOGLE_MAPS / CSV_UPLOAD / MANUAL |
| `FollowUpChannel` | EMAIL / SMS |
| `FollowUpStatus` | PENDING / SENT / REPLIED / FAILED / SKIPPED |

---

## 三、API 路由清单

### Campaigns  `/api/v1/campaigns`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/campaigns` | 列表（含 call 统计） |
| POST | `/api/v1/campaigns` | 新建（DRAFT 状态） |
| GET | `/api/v1/campaigns/:id` | 详情 |
| PATCH | `/api/v1/campaigns/:id` | 更新配置（脚本/AgentConfig） |
| POST | `/api/v1/campaigns/:id/start` | 启动外呼（→ RUNNING） |
| POST | `/api/v1/campaigns/:id/pause` | 暂停 |
| POST | `/api/v1/campaigns/:id/resume` | 恢复 |
| GET | `/api/v1/campaigns/:id/calls` | 通话记录列表 |
| GET | `/api/v1/campaigns/:id/calls/stream` | SSE 实时事件流 |

### Contacts  `/api/v1/contacts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/contacts` | 列表（按 campaign_id / disposition 筛选） |
| POST | `/api/v1/contacts/search/google-maps` | 搜索（不写库，仅返回结果） |
| POST | `/api/v1/contacts/import/google-maps` | 搜索+写库（ContactList + Contact） |
| POST | `/api/v1/contacts/import/csv` | CSV 解析+写库 |
| DELETE | `/api/v1/contacts/:id` | 删除 |
| POST | `/api/v1/contacts/:id/dnc` | 标记 DNC |

### Leads  `/api/v1/leads`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/leads` | INTERESTED 以上线索列表（含跟进记录） |
| POST | `/api/v1/leads/:id/confirm` | → CONFIRMED + assignedTo |
| POST | `/api/v1/leads/:id/convert` | → CONVERTED |
| POST | `/api/v1/leads/:id/reject` | → NOT_INTERESTED |
| POST | `/api/v1/leads/:id/reassign` | 重新分配销售代表（更新 assignedTo） |

### FollowUps  `/api/v1/followups`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/followups` | 列表（按 channel / status 筛选） |
| POST | `/api/v1/followups/trigger` | 手动触发跟进（Email 或 SMS） |

### Reports  `/api/v1/reports`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/reports` | 报告列表 |
| POST | `/api/v1/reports/generate` | 手动生成（指定 date / campaign_id） |
| GET | `/api/v1/reports/:id` | 报告详情 |

### Webhooks  `/api/v1/webhooks`

| 方法 | 路径 | 来源 | 说明 |
|------|------|------|------|
| POST | `/api/v1/webhooks/vapi/process` | Vapi（经 BFF 转发） | 通话转录/录音/函数调用 |

---

## 四、核心异步流程

### 4.1 外呼启动流程

```
POST /api/v1/campaigns/:id/start
         │
         ├─ 查询 Campaign（验证状态 = CONFIGURED）
         ├─ 查询关联 ContactList 中 disposition=PENDING 的 Contact 列表
         ├─ 调用 vapi_service.create_assistant(script, agent_config, webhook_url)
         │         → Vapi API: POST /assistant → 返回 assistant_id
         │         → Campaign.vapi_assistant_id = assistant_id
         │
         ├─ Campaign.status → RUNNING
         │
         └─ 调用 vapi_service.batch_create_calls(assistant_id, contacts)
                   │
                   ├─ asyncio.Semaphore(10)  并发控制
                   ├─ 每个联系人：
                   │     Vapi API: POST /call
                   │     → 返回 vapi_call_id
                   │     → 写 Call 记录（status=QUEUED, contact_id, campaign_id）
                   │     → Contact.disposition = CALLED（标记已进入队列）
                   └─ asyncio.gather(*) 并发执行
```

### 4.2 通话结束 Webhook 处理流程

```
Vapi 回调 → Next.js BFF（签名验证）→ POST /api/v1/webhooks/vapi/process
         │
         ├─ event_type = "transcript-ready"
         │         │
         │         ├─ detect_language(transcript[:500])
         │         ├─ translate_to_english(transcript) [如非英文]
         │         ├─ 写 Transcript 表
         │         ├─ claude_service.summarize_call(text, objective)
         │         │         → Anthropic API（claude-haiku）
         │         │         → 返回 { summary, keyPoints, sentiment,
         │         │                   nextAction, disposition, extractedData }
         │         ├─ 写 CallSummary 表
         │         ├─ Call.disposition = summary.disposition
         │         ├─ await db.commit()
         │         │
         │         ├─ 判断 disposition ∈ {INTERESTED, VOICEMAIL, CALLBACK_REQUESTED}
         │         │         └─ _trigger_auto_followup(call, db)
         │         │               │
         │         │               ├─ 有 email → generate_email_content(Claude)
         │         │               │             → send_email(Resend)
         │         │               │             → 写 FollowUp（EMAIL）
         │         │               │
         │         │               └─ VOICEMAIL/CALLBACK 或无 email → send_sms(Twilio)
         │         │                                                   → 写 FollowUp（SMS）
         │         │
         │         └─ sse_manager.publish(campaign_id, { type:"call-updated", ... })
         │
         ├─ event_type = "recording-ready"
         │         ├─ 下载录音（httpx）
         │         ├─ 上传 S3（boto3）
         │         └─ 写 Recording 表（vapi_url + s3_key + s3_url）
         │
         └─ event_type = "function-call"
                   └─ name = "bookAppointment"
                         ├─ get_next_available_slot(user.google_tokens)
                         ├─ create_event(Google Calendar API)
                         ├─ 写 Appointment 表
                         ├─ Call.disposition = INTERESTED
                         ├─ sse_manager.publish("appointment-booked")
                         └─ 返回确认文本给 Vapi（AI 朗读给用户）
```

### 4.3 每日报告生成流程

```
触发方式：
  ① cron 00:00 自动触发（APScheduler / Celery Beat）
  ② POST /api/v1/reports/generate 手动触发
         │
         ▼
report_service.generate_report(date, campaign_id)
         │
         ├─ 聚合 Call 表指标：
         │     total_calls, connected_calls, interested_count,
         │     voicemail_count, no_answer_count, callback_count,
         │     confirmed_count, converted_count, cost_cents
         │
         ├─ 聚合 FollowUp 表：follow_ups_sent, follow_ups_replied
         │
         ├─ 计算衍生指标：
         │     connection_rate = connected / total
         │     interest_rate   = interested / connected
         │
         ├─ claude_service.generate_insights(stats)
         │         → Anthropic API（claude-sonnet）
         │         → 返回 { insights: [], recommendations: [] }
         │
         └─ 写 DailyReport 表
```

### 4.4 SSE 实时推送

```
sse_manager（单例）
  │
  ├─ publish(campaign_id, event_data)
  │     → 向该 campaign 的所有 SSE 连接广播事件
  │
  └─ GET /api/v1/campaigns/:id/calls/stream
        → 返回 EventStream（text/event-stream）
        → 前端 useCallStatus Hook 监听
        → 事件类型：call-updated / appointment-booked
```

---

## 五、服务依赖关系

```
routers/
  campaigns  ──→ services/vapi_service
  webhooks   ──→ services/claude_service
             ──→ services/email_service  ──→ Resend API
             ──→ services/sms_service    ──→ Twilio API
             ──→ services/google_calendar_service ──→ Google Calendar API
             ──→ utils/sse_manager
  contacts   ──→ services/google_maps_service  ──→ Google Places API
             ──→ services/contact_import_service（CSV 解析）
  reports    ──→ services/report_service
             ──→ services/claude_service
```

---

## 六、待建模块

### Phase 4 — 获客线增强

| 模块 | 文件位置 | 说明 |
|------|---------|------|
| 邮件回复解析 | `routers/webhooks.py` 增加 `/webhooks/resend` | Resend Inbound Webhook → 解析回复 → 更新 FollowUp.reply_content → Claude 判断意向 |
| AI 意向自动建议 | `services/claude_service.py` 增加 `analyze_reply()` | 分析回复文本 → 返回 confirm/reject 建议 |
| UTM 注册链接 | `routers/leads.py` 增加 `GET /leads/:id/registration-link` | 生成带 utm_source / utm_campaign 参数的链接 |
| 注册事件回传 | `routers/webhooks.py` 增加 `/webhooks/registration` | 注册事件 → Contact.disposition = CONVERTED |
| 定时任务调度 | `main.py` 增加 APScheduler lifespan | 每日 00:00 自动调用 report_service |
| 话术版本管理 | `models/campaign.py` 增加 `ScriptVersion` 表 | 保存历史版本，人工确认后激活 |

### Phase 5 — 用户运营线 Line B

| 模块 | 文件位置 | 说明 |
|------|---------|------|
| AudienceUser 模型 | `models/audience.py` 新建 | 存量用户表：user_id / last_purchase_date / total_orders / total_spent / segment |
| RFM 评分引擎 | `services/rfm_service.py` 新建 | 按分位数计算 R/F/M 得分，自动归入 6 大群组 |
| Line B 路由 | `routers/audience.py` 新建 | `GET /api/v1/audience/segments`、`POST /api/v1/audience/import` |
| 分层触达活动 | `routers/audience.py` + `services/email_service.py` | 按 RFM 群组批量发 Email / SMS（含 rfm_segment 字段） |
| CSV 用户导入 | `services/contact_import_service.py` 扩展 | 解析行为数据字段，写入 AudienceUser |

### Phase 6 — 效果追踪

| 模块 | 文件位置 | 说明 |
|------|---------|------|
| 营销效果追踪 | `routers/reports.py` 扩展 | 群组维度打开率 / 点击率 / 复购率聚合 |
| 流失预警定时任务 | `main.py` APScheduler 扩展 | 每日 00:00 重算 RFM → 检测群组下滑 → 触发预警 |
| 双线 Dashboard 统计 | `routers/dashboard.py` 新建 | `GET /api/v1/dashboard/stats` 合并 Line A 漏斗 + Line B RFM 健康度 |

---

## 七、电话号码标准化说明

### 法国号码特殊规则（`vapi_service.py` + `contact_import_service.py`）

```
问题：Vapi 对 E.164 国际号码会去掉本地前导 0。
      法国号码（+33）国家码后的 0 必须保留，否则无法拨出。

标准 E.164（12位）：+33671950548   ← 前导 0 被去除，错误
Vapi 要求（13位）： +330671950548  ← 前导 0 保留，正确

两层保护机制：
  1. contact_import_service.py → normalize_phone()
       导入时处理：phonenumbers NATIONAL 格式保留前导 0
       保证写入 DB 的法国号格式为 +330XXXXXXXXX

  2. vapi_service.py → _prepare_phone_for_vapi()
       调用时最后防线：若传入 +33 + 9位（12字符），自动补回前导 0
       保证历史存量数据也能正确传给 Vapi API
```
