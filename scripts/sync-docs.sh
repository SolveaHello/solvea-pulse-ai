#!/bin/bash
# =============================================================================
# Pulse AI — 文档同步检查脚本
# 用法：bash scripts/sync-docs.sh [--auto]
#
# 检测 MARKETING_FLOW.md 的变更，输出需要同步的文档和章节
# --auto 模式：直接调用 Claude CLI 执行同步（需要 claude 命令可用）
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FLOW_FILE="$ROOT_DIR/MARKETING_FLOW.md"
PRD_FILE="$ROOT_DIR/PRD.md"
FRONTEND_FILE="$ROOT_DIR/FRONTEND_FLOW.md"
BACKEND_FILE="$ROOT_DIR/BACKEND_FLOW.md"
SNAPSHOT_FILE="$ROOT_DIR/.doc-snapshots/MARKETING_FLOW.md.sha"
SNAPSHOT_DIR="$ROOT_DIR/.doc-snapshots"

# ── 颜色输出 ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Pulse AI — 文档一致性同步检查                          ${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 计算当前 hash ─────────────────────────────────────────────────────────────
CURRENT_HASH=$(shasum -a 256 "$FLOW_FILE" | awk '{print $1}')

mkdir -p "$SNAPSHOT_DIR"

# 首次运行：保存快照
if [ ! -f "$SNAPSHOT_FILE" ]; then
  echo "$CURRENT_HASH" > "$SNAPSHOT_FILE"
  echo -e "${GREEN}✅ 首次运行，已保存 MARKETING_FLOW.md 快照${NC}"
  echo -e "   Hash: ${CURRENT_HASH:0:16}..."
  echo ""
  echo "  下次运行时将对比变更。"
  exit 0
fi

SAVED_HASH=$(cat "$SNAPSHOT_FILE")

# ── 无变更 ────────────────────────────────────────────────────────────────────
if [ "$CURRENT_HASH" = "$SAVED_HASH" ]; then
  echo -e "${GREEN}✅ MARKETING_FLOW.md 无变更，文档状态一致。${NC}"
  echo ""
  exit 0
fi

# ── 有变更：分析影响域 ────────────────────────────────────────────────────────
echo -e "${YELLOW}⚠️  检测到 MARKETING_FLOW.md 已变更${NC}"
echo ""

# 用 diff 检查变更区域（如果有旧版本可对比则更精准，这里做关键词检测）
echo -e "${CYAN}📋 变更影响域分析：${NC}"
echo ""

NEED_PRD=false
NEED_FRONTEND=false
NEED_BACKEND=false

# 检测变更关键词 → 判断影响的文档
# （通过对比 snapshot 目录下的备份，若无备份则全量提示）
if [ -f "$SNAPSHOT_DIR/MARKETING_FLOW.md.bak" ]; then
  CHANGED_SECTIONS=$(diff "$SNAPSHOT_DIR/MARKETING_FLOW.md.bak" "$FLOW_FILE" | grep "^>" | head -60)

  # PRD 相关关键词
  if echo "$CHANGED_SECTIONS" | grep -qiE "STEP|Disposition|Phase|数据模型|API|状态机|功能|双线|Line A|Line B|RFM"; then
    NEED_PRD=true
  fi

  # Frontend 相关关键词
  if echo "$CHANGED_SECTIONS" | grep -qiE "页面|UI|组件|路由|看板|卡片|详情|列表|按钮|表单|操作|前端"; then
    NEED_FRONTEND=true
  fi

  # Backend 相关关键词
  if echo "$CHANGED_SECTIONS" | grep -qiE "API|数据模型|字段|接口|Webhook|服务|Service|Router|数据库|表|enum"; then
    NEED_BACKEND=true
  fi
else
  # 无备份，全量提示
  NEED_PRD=true
  NEED_FRONTEND=true
  NEED_BACKEND=true
fi

# ── 输出需要同步的文档 ────────────────────────────────────────────────────────
SYNC_COUNT=0

if [ "$NEED_PRD" = true ]; then
  SYNC_COUNT=$((SYNC_COUNT+1))
  echo -e "  ${RED}→ PRD.md${NC}  需要同步"
  echo "     章节：§一产品概述、§四功能模块、§五数据模型、§六API规范、§十实施计划"
  echo ""
fi

if [ "$NEED_FRONTEND" = true ]; then
  SYNC_COUNT=$((SYNC_COUNT+1))
  echo -e "  ${RED}→ FRONTEND_FLOW.md${NC}  需要同步"
  echo "     章节：§三路由设计、§七Campaign向导、§十待接入项"
  echo ""
fi

if [ "$NEED_BACKEND" = true ]; then
  SYNC_COUNT=$((SYNC_COUNT+1))
  echo -e "  ${RED}→ BACKEND_FLOW.md${NC}  需要同步"
  echo "     章节：API路由表、数据模型、服务模块、待建模块列表"
  echo ""
fi

if [ "$SYNC_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}无需同步其他文档${NC}"
  echo "$CURRENT_HASH" > "$SNAPSHOT_FILE"
  cp "$FLOW_FILE" "$SNAPSHOT_DIR/MARKETING_FLOW.md.bak"
  exit 0
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Auto 模式：调用 Claude CLI 执行同步 ───────────────────────────────────────
if [ "$1" = "--auto" ]; then
  if ! command -v claude &> /dev/null; then
    echo -e "${RED}错误：未找到 claude 命令，请先安装 Claude Code CLI${NC}"
    exit 1
  fi

  echo -e "${CYAN}🤖 Auto 模式：调用 Claude 执行文档同步...${NC}"
  echo ""

  PROMPT="请根据最新的 MARKETING_FLOW.md，同步更新以下文档，确保内容一致："

  if [ "$NEED_PRD" = true ];      then PROMPT="$PROMPT\n- PRD.md（功能模块、数据模型、API规范、实施计划）"; fi
  if [ "$NEED_FRONTEND" = true ]; then PROMPT="$PROMPT\n- FRONTEND_FLOW.md（路由、组件、页面功能描述）"; fi
  if [ "$NEED_BACKEND" = true ];  then PROMPT="$PROMPT\n- BACKEND_FLOW.md（API路由表、数据模型、服务模块）"; fi

  PROMPT="$PROMPT\n\n请逐文档更新，每份完成后输出变更摘要，保持与 MARKETING_FLOW.md 完全一致。"

  echo -e "$PROMPT" | claude --print

else
  # ── 手动模式：输出给 Claude Code 的 prompt ────────────────────────────────
  echo -e "${YELLOW}📝 请将以下 prompt 发送给 Claude Code 执行同步：${NC}"
  echo ""
  echo "─────────────────────────────────────────────────────"
  echo ""

  echo "请根据最新的 MARKETING_FLOW.md，同步更新以下文档，确保内容一致："
  echo ""
  if [ "$NEED_PRD" = true ];      then echo "- PRD.md（功能模块、数据模型、API规范、实施计划）"; fi
  if [ "$NEED_FRONTEND" = true ]; then echo "- FRONTEND_FLOW.md（路由、组件、页面功能描述）"; fi
  if [ "$NEED_BACKEND" = true ];  then echo "- BACKEND_FLOW.md（API路由表、数据模型、服务模块）"; fi
  echo ""
  echo "请逐文档更新，每份完成后输出变更摘要。"

  echo ""
  echo "─────────────────────────────────────────────────────"
fi

# ── 更新快照 ──────────────────────────────────────────────────────────────────
echo ""
read -p "同步完成后，按 Enter 更新快照（标记为已同步）..." _
echo "$CURRENT_HASH" > "$SNAPSHOT_FILE"
cp "$FLOW_FILE" "$SNAPSHOT_DIR/MARKETING_FLOW.md.bak"
echo ""
echo -e "${GREEN}✅ 快照已更新。文档状态：已同步${NC}"
echo ""
