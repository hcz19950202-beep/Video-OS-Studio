# 04 AI Agent 工作流

## Agent 是编辑工作台的一等区域

AI Panel 常驻编辑器，并与 Timeline、Assets、Transcript、Canvas 建立显式引用。Composer 支持文件附件、Skills、Agent Settings、Selection mode、Send/Stop。

模式：

- `Agent`：对话式理解、计划和编辑执行；
- `Video Gen`：直接进入视频生成管线，减少对话过程。

Evidence: `CONFIRMED_LOCAL_FILE`。

## 上下文引用

Selection tool 可以将以下对象加入 prompt：

- Timeline item / clip；
- My Assets asset；
- Timeline ruler time point；
- Transcript text selection；
- Canvas region。

Bundle 事件包括 `chatcut:items-clicked`、`chatcut:assets-clicked`、`chatcut:time-marked`、`chatcut:transcript-selected`、`chatcut:canvas-region-marked`。这些引用最终表现为 composer 内的 @ mention / reference chip。

## Agent State Machine

```text
IDLE
  ↓ user prompt / scenario / skill
PROMPT_DRAFT
  ↓ optional selection references
CONTEXT_BOUND
  ↓ send
SESSION_CREATING / SESSION_RECOVERING
  ↓
SENDING_PROMPT
  ↓
THINKING / PLAN
  ↓
TOOL_CALLING
  ├── read project / transcript / assets / timeline
  ├── propose or perform timeline mutations
  ├── generation request
  └── inspection / preview
       ↓ when paid generation is involved
       AWAITING_USER
       ├── Allow once
       ├── Allow all in project
       └── Deny / adjust
  ↓
RUNNING / GENERATING
  ↓
REVIEWING_RESULTS
  ├── COMPLETED → ordinary asset/item/timeline state
  ├── CANCELLED
  ├── ERROR → Retry / recreate session
  └── STALE_TARGET → ask user to reselect/retry
```

Evidence: `CONFIRMED_LOCAL_FILE` from agent bundle states, generation guard IPC and ACP events.

## Plan 与 Tool Call 表达

Local bundle 中存在：

- `acp-plan-card`；
- Thinking / Tool calls / Failed tool calls sections；
- `ai_tool_called`、`reviewing_results`、`agent_execution_error`；
- queued prompt、steering、session recovery；
- result/error/retry UI states。

这说明 Agent UX 不是只显示最终一句回答，而是把计划、工具调用、等待用户和恢复状态做成可见流程。具体卡片视觉和逐步展开方式未直接截图，标为 `UNKNOWN`。

## Agent 修改结果

产品说明和 bundle 均表明生成结果会登记为普通 Asset，编辑结果会落入普通 Timeline item / Caption / Motion Graphic / Audio。用户随后可在 Timeline、Transcript、Canvas、Inspector 中继续手调，并通过全局 Undo/Redo 或 Version snapshot 恢复。

- 生成结果进入 Asset Pool：`CONFIRMED_LOCAL_FILE`
- Agent 结果可手调：`CONFIRMED_LOCAL_FILE`
- 每个工具调用是否对应单一事务：`UNKNOWN`
- Agent 修改与 Undo 栈的原子边界：`UNKNOWN`

## Agent / Plugin / MCP

本地安装包含 ACP 和 MCP 双层集成：

- Codex、Claude Code、Trae、WorkBuddy host identifiers；
- MCP tools list/call、progress notifications；
- set active project、navigate project、open Agent chat；
- inspect asset capture、preview timeline frames；
- local tool call telemetry；
- bundled workflow Skills。

这允许“ChatCut 内 Agent”与“外部 Codex/Claude Agent”共享同一项目编辑能力，但运行时权限、工具完整清单和远端 hosted MCP 差异未登录态验证。

## 值得 Video OS 复用的模式

1. AI Panel 常驻，而不是把 AI 作为一次性按钮。
2. 所有编辑对象都能转化为 prompt reference。
3. Plan / Tool / Progress / Result / Error 形成可观察状态机。
4. 生成动作在真正消耗资源前有明确 guard。
5. Agent 输出回到普通编辑对象，不形成不可编辑的“AI 黑盒结果”。
