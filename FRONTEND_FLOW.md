# 前端设计流程（React + Vite）

> **系统**：Pulse AI  
> **框架**：React 18 + Vite + TypeScript  
> **路由**：React Router v6  
> **状态管理**：Zustand（客户端状态） + TanStack Query（服务端状态）  
> **UI 库**：Tailwind CSS + shadcn/ui  
> **认证**：Clerk React SDK  

---

## 一、架构变更说明（对比原 Next.js）

| 维度 | 原 Next.js | 新 React + Vite |
|------|-----------|----------------|
| 渲染模式 | SSR / App Router | 纯 CSR（Single Page App） |
| 路由 | Next.js File-based Router | React Router v6 |
| BFF 层 | Next.js API Routes（含 Prisma） | **移除** — 全部直连 FastAPI |
| Webhook 接收 | `app/api/webhooks/vapi/route.ts` | **迁移到 FastAPI backend** |
| DB 访问 | Prisma（前端 BFF 直连） | **移除** — 仅 FastAPI 访问 DB |
| 数据获取 | `fetch` + 手动 loading 状态 | TanStack Query（缓存/重试/失效） |
| Auth | Clerk Next.js SDK | Clerk React SDK |
| 构建工具 | Next.js（Webpack/Turbopack） | Vite |

> **重要**：Vapi Webhook 签名验证 + 幂等性检查（`ProcessedWebhookEvent` 表）  
> 原在 `frontend/app/api/webhooks/vapi/route.ts` 处理，迁移后需移入  
> `backend/app/routers/webhooks.py`，FastAPI 直接接收 Vapi 回调。

---

## 二、目录结构

```
pulse-ai-frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
│
├── public/
│   └── favicon.ico
│
└── src/
    ├── main.tsx                       # React 入口，挂载 App
    ├── App.tsx                        # 路由根节点（BrowserRouter + ClerkProvider）
    │
    ├── routes/                        # 页面级组件（对应 URL）
    │   ├── DashboardPage.tsx          # /
    │   ├── CampaignsPage.tsx          # /campaigns
    │   ├── NewCampaignPage.tsx        # /campaigns/new
    │   ├── CampaignCallsPage.tsx      # /campaigns/:id/calls
    │   ├── LeadsPage.tsx              # /leads
    │   ├── FollowupsPage.tsx          # /followups
    │   ├── ReportsPage.tsx            # /reports
    │   ├── SettingsPage.tsx           # /settings
    │   └── TeamPage.tsx               # /team
    │
    ├── layouts/
    │   └── DashboardLayout.tsx        # 侧边导航 + 顶部 Header（保护路由）
    │
    ├── components/                    # 可复用功能组件
    │   ├── campaign/
    │   │   ├── CampaignWizard.tsx     # 多步骤向导主容器
    │   │   ├── steps/
    │   │   │   ├── SearchContactsStep.tsx
    │   │   │   ├── SetGoalStep.tsx
    │   │   │   ├── SetOutboundNumberStep.tsx
    │   │   │   ├── AgentConfigStep.tsx
    │   │   │   ├── ContactsReviewStep.tsx
    │   │   │   └── ReviewStep.tsx
    │   │   └── cards/
    │   │       ├── MapSearchCard.tsx
    │   │       └── OutboundNumberCard.tsx
    │   ├── calls/
    │   │   ├── CallDetailRow.tsx
    │   │   ├── CallSummaryCard.tsx
    │   │   └── TranscriptViewer.tsx
    │   ├── contacts/
    │   │   ├── GoogleMapsSearch.tsx
    │   │   ├── CSVUploader.tsx
    │   │   └── ManualEntry.tsx
    │   ├── leads/
    │   │   ├── LeadsTable.tsx
    │   │   └── AssignLeadModal.tsx
    │   ├── reports/
    │   │   └── GenerateReportButton.tsx
    │   ├── settings/
    │   │   ├── GoogleCalendarConnect.tsx
    │   │   ├── PhoneVerificationForm.tsx
    │   │   └── SettingsApiKeyRow.tsx
    │   └── ui/                        # shadcn/ui 基础组件
    │       ├── Button.tsx
    │       ├── Dialog.tsx
    │       ├── Badge.tsx
    │       └── ...
    │
    ├── hooks/                         # 自定义 React Hooks
    │   ├── useCallStatus.ts           # SSE 实时订阅
    │   ├── useCampaigns.ts            # TanStack Query: 活动列表/详情
    │   ├── useLeads.ts                # TanStack Query: 线索操作
    │   ├── useReports.ts              # TanStack Query: 报告
    │   └── useFollowups.ts            # TanStack Query: 跟进记录
    │
    ├── stores/                        # Zustand 客户端状态
    │   ├── campaignSetup.ts           # Campaign 创建向导多步骤状态机
    │   └── salesReps.ts               # 销售人员列表
    │
    ├── api/                           # API 请求层（直连 FastAPI）
    │   ├── client.ts                  # axios 实例 + 统一错误处理 + Auth Token 注入
    │   ├── campaigns.ts               # Campaign CRUD
    │   ├── contacts.ts                # 联系人导入/查询
    │   ├── leads.ts                   # 线索操作
    │   ├── followups.ts               # 跟进记录
    │   ├── reports.ts                 # 报告生成/查询
    │   └── settings.ts                # 设置（号码/Calendar）
    │
    └── types/
        └── index.ts                   # 全局 TypeScript 类型
```

---

## 三、路由设计

```tsx
// src/App.tsx
<BrowserRouter>
  <ClerkProvider>
    <Routes>
      {/* 公开路由 */}
      <Route path="/sign-in" element={<SignInPage />} />

      {/* 保护路由（需登录） */}
      <Route element={<DashboardLayout />}>
        <Route path="/"                          element={<DashboardPage />} />
        <Route path="/campaigns"                 element={<CampaignsPage />} />
        <Route path="/campaigns/new"             element={<NewCampaignPage />} />
        <Route path="/campaigns/:id/calls"       element={<CampaignCallsPage />} />
        <Route path="/leads"                     element={<LeadsPage />} />
        <Route path="/followups"                 element={<FollowupsPage />} />
        <Route path="/reports"                   element={<ReportsPage />} />
        <Route path="/settings"                  element={<SettingsPage />} />
        <Route path="/team"                      element={<TeamPage />} />
      </Route>
    </Routes>
  </ClerkProvider>
</BrowserRouter>
```

---

## 四、API 层设计（直连 FastAPI）

```typescript
// src/api/client.ts
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // http://localhost:8000
  timeout: 15000,
});

// 每次请求自动注入 Clerk JWT
client.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 统一错误处理
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message;
    throw new Error(msg);
  }
);
```

### API 模块示例

```typescript
// src/api/campaigns.ts
export const campaignApi = {
  list:    ()                        => client.get("/api/v1/campaigns"),
  get:     (id: string)              => client.get(`/api/v1/campaigns/${id}`),
  create:  (data: CampaignCreate)    => client.post("/api/v1/campaigns", data),
  update:  (id: string, data: any)   => client.patch(`/api/v1/campaigns/${id}`, data),
  start:   (id: string)              => client.post(`/api/v1/campaigns/${id}/start`),
  pause:   (id: string)              => client.post(`/api/v1/campaigns/${id}/pause`),
  resume:  (id: string)              => client.post(`/api/v1/campaigns/${id}/resume`),
  calls:   (id: string)              => client.get(`/api/v1/campaigns/${id}/calls`),
};

// src/api/leads.ts
export const leadsApi = {
  list:    ()              => client.get("/api/v1/leads"),
  confirm: (id: string, assignedTo?: string) =>
                             client.post(`/api/v1/leads/${id}/confirm`, { assignedTo }),
  convert: (id: string)   => client.post(`/api/v1/leads/${id}/convert`),
  reject:  (id: string)   => client.post(`/api/v1/leads/${id}/reject`),
};
```

---

## 五、TanStack Query 数据获取

```typescript
// src/hooks/useCampaigns.ts
export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn:  campaignApi.list,
    staleTime: 30_000,
  });
}

export function useStartCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignApi.start(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

// src/hooks/useLeads.ts
export function useConfirmLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo?: string }) =>
      leadsApi.confirm(id, assignedTo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
```

---

## 六、SSE 实时通话状态

```typescript
// src/hooks/useCallStatus.ts
export function useCallStatus(campaignId: string, onEvent: (e: CallEvent) => void) {
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const es = new EventSource(
      `${API}/api/v1/campaigns/${campaignId}/calls/stream`,
      { withCredentials: true }
    );

    es.onmessage = (e) => onEvent(JSON.parse(e.data));
    es.onerror   = ()  => es.close();

    return () => es.close();
  }, [campaignId]);
}

// 在 CampaignCallsPage 中使用
useCallStatus(campaignId, (event) => {
  if (event.type === "call-updated") {
    queryClient.setQueryData(["calls", campaignId], (old) =>
      old?.map((c) => c.id === event.callId ? { ...c, ...event } : c)
    );
  }
});
```

---

## 七、Campaign 创建向导（Zustand 驱动）

```
campaignSetup store（src/stores/campaignSetup.ts）
─────────────────────────────────────────────────
step: "search-contacts" | "set-goal" | "set-outbound-number"
    | "agent-config" | "contacts" | "review"

CampaignWizard.tsx（根据 step 渲染对应步骤组件）
│
├─ SearchContactsStep
│     → 输入关键词 → POST /api/v1/contacts/search/google-maps
│     → 展示结果 → 勾选 → store.setSelectedContacts()
│     → 下一步
│
├─ SetGoalStep
│     → 填写名称 + 目标 → store.setCampaignName/setCampaignGoal()
│
├─ SetOutboundNumberStep
│     → 选择已验证的外呼号码 → store.setOutboundPhone()
│
├─ AgentConfigStep
│     → 语气 / 语速 / voice provider / 话术脚本
│     → store.setAgentConfig() + store.setScript()
│
├─ ContactsReviewStep
│     → 追加 CSV 上传 / 手动录入
│     → 最终联系人预览（去重后数量）
│
└─ ReviewStep
      → 汇总展示所有配置
      → 点击「创建活动」
      → POST /api/v1/campaigns（含 contacts 批量）
      → 成功 → navigate("/campaigns/:id/calls")
      → store.reset()
```

---

## 八、环境变量

```bash
# .env（Vite 约定：VITE_ 前缀才暴露给浏览器）
VITE_API_BASE_URL=http://localhost:8000      # FastAPI 地址
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...      # Clerk 认证
```

---

## 九、Webhook 迁移说明

原 `frontend/app/api/webhooks/vapi/route.ts` 承担：
1. Vapi 签名验证（`x-vapi-signature` HMAC）
2. 幂等性检查（`ProcessedWebhookEvent` Prisma 表）
3. 通话状态即时更新（`call-started` / `call-ended`）
4. 转发到 FastAPI 重处理

**迁移后全部由 FastAPI `routers/webhooks.py` 接管**：

```
Vapi ──► POST /api/v1/webhooks/vapi（直接回调 FastAPI 8000 端口）
              │
              ├─ 签名验证（移入 FastAPI）
              ├─ 幂等性（ProcessedEvent 表移入 PostgreSQL）
              ├─ call-started / call-ended → 更新 Call 表
              └─ transcript-ready / recording-ready → 原有处理逻辑不变
```

---

## 十、待接入项

| 功能 | 位置 | 说明 |
|------|------|------|
| Dashboard 真实数据 | `DashboardPage.tsx` | 接 `GET /api/v1/dashboard/stats`（后端待建） |
| 团队管理 | `TeamPage.tsx` | 接 `GET /api/v1/team/members`（后端待建） |
| 邮件回复解析 | 后端 Webhook | Phase 4 — Resend Inbound Webhook |
| UTM 注册链接 | `LeadsPage.tsx` | Phase 4 — `/leads/:id/registration-link` |
| 注册事件回传 | 后端 Webhook | Phase 4 |
