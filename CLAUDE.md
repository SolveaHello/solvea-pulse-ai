# Pulse AI — Claude Code 工作规范

## 文档体系与一致性规则

本项目有 4 份核心文档，存在严格的层级依赖关系：

```
MARKETING_FLOW.md   ← 单一事实来源（流程 + 需求）
       │
       ├─► PRD.md            功能需求层（What + Why）
       ├─► FRONTEND_FLOW.md  前端实现层（页面 / 组件 / 交互）
       └─► BACKEND_FLOW.md   后端实现层（API / 数据模型 / 服务）
```

### 强制规则：文档同步

**每次修改 `MARKETING_FLOW.md` 后，必须检查并同步以下内容：**

| MARKETING_FLOW 变更类型 | 需更新文档 | 具体章节 |
|------------------------|-----------|---------|
| 新增 / 删除流程步骤 | PRD + FRONTEND + BACKEND | PRD §四功能模块、FRONTEND §三路由、BACKEND §路由表 |
| 修改页面功能或 UI 设计 | FRONTEND | 对应页面组件描述、Zustand store、Hook |
| 新增 / 修改 API 接口 | BACKEND + PRD | BACKEND §路由、PRD §六API规范 |
| 新增 / 修改数据字段 | BACKEND + PRD | BACKEND §数据模型、PRD §五数据模型 |
| 修改 Disposition / 状态机 | PRD + BACKEND + FRONTEND | 各文档中状态机章节 |
| 新增业务线（如 Line B） | PRD + FRONTEND + BACKEND | 全文档同步扩充 |
| Phase 状态变更（待建→完成） | PRD + FLOW | 各文档 Phase/实施进度表 |

**操作规范**：
1. 修改 MARKETING_FLOW.md 后，主动询问用户是否立即同步其他文档
2. 同步时逐文档更新，每份完成后报告变更摘要
3. 不允许在三份实现文档中出现与 MARKETING_FLOW.md 矛盾的描述

---

## 代码与文档一致性规则

**每次新增或修改功能代码后，检查：**

- [ ] `MARKETING_FLOW.md` 的 Phase 进度表是否需要更新（待建 → 完成）
- [ ] `FRONTEND_FLOW.md` 的组件列表 / 路由是否反映最新实现
- [ ] `BACKEND_FLOW.md` 的 API 路由表是否与实际代码一致

---

## 项目基本信息

- **系统名称**：Pulse AI
- **前端**：Next.js 14 App Router + Tailwind CSS + shadcn/ui（`/frontend` 目录）
- **后端**：FastAPI (Python)
- **数据库**：PostgreSQL + Prisma ORM（前端 BFF）
- **AI**：Claude (Anthropic API)
- **外呼**：Vapi
- **邮件**：Resend
- **SMS**：Twilio
