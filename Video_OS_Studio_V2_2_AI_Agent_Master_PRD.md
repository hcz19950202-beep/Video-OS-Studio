# Video OS Studio V2.2 — AI Editing Agent Master PRD

> **产品定位**：在 V2.1 `AI-First Universal Video Workspace` 基础上，把 AI 从“给出视觉建议”升级为“能够理解当前项目、选择受控工具、生成可审查执行计划，并通过 Project Command / Transaction 安全地完成真实编辑”的视频编辑 Agent。
>
> **核心原则**：AI 可以思考、规划、调用 Video OS 工具，但 **AI 永远不能直接修改 Project**。所有 durable mutation 必须通过受验证的 `ProjectCommand` / `ProjectCommandTransaction`，并继续保留 `Review → Diff → Confirm → Apply → Undo/Redo` 的安全链。
>
> **V2.2 不是全自动无人值守剪辑器**。它首先解决的是：让用户用自然语言驱动一组专业、可见、可回滚的编辑动作，同时保持 Video OS 当前的 deterministic project model、Universal Canvas、Script / Scene、Timeline、Remotion、HyperFrames 和本地渲染体系。

---

# 0. 文档信息

- 文档名称：`Video OS Studio V2.2 — AI Editing Agent Master PRD`
- 文件：`Video_OS_Studio_V2_2_AI_Agent_Master_PRD.md`
- 文档状态：Draft Rev.1
- 产品目标版本：V2.2
- 稳定基线：Video OS Studio `v2.1.0`
- 基线 Main Commit：`fcfb341367b6ff5e8911693483c14196386c5a93`
- 基线 Main Tree：`0e6710128e50a5aaed83638e92304a47f3b5b9e2`
- 当前 Product Version：`2.1.0`
- 当前 Project Schema：`2.0.0`
- V2.1 Final Acceptance：34 test files / 125 tests PASS
- V2.1 产品事实：Universal Canvas、AI Composer、Canvas-aware rules Director、Safe Area、Scenario Starter、Export Profile、Selection-aware Inspector、Remotion / HyperFrames / B-roll / Audio、Command / Transaction、Undo / Redo 均已真实验收。

---

# 1. V2.2 产品重新定义

V2.1 的 AI 主要是：

```text
Analyze
→ Suggestions
→ Reason / Confidence / Alternatives
→ Diff
→ Apply
```

V2.2 要升级为：

```text
User Intent
+ Project Context
+ Selection References
        ↓
Real AI Provider
        ↓
Structured Agent Plan
        ↓
Validated Video OS Tools
        ↓
Dry Run / Diff
        ↓
User Review / Confirm
        ↓
ProjectCommandTransaction
        ↓
Validation
        ↓
Undo / Redo
```

V2.2 产品定义：

> **Selection-Aware AI Editing Agent**

用户不再只问：

> “这里该加什么动效？”

而可以说：

```text
把这一段做得更紧凑。
突出这三个数字。
把这个场景变成更像产品广告。
这一段字幕太抢了，弱一点。
把选中的 B-roll 提前 1 秒并缩短。
给这 20 秒做一个完整但克制的视觉节奏。
把这个 Scene 的字幕、动效和 B-roll 一起重新编排。
```

系统必须把自然语言转成：

```text
明确作用范围
明确工具调用
明确预期变化
明确风险
明确 Diff
明确 Transaction
```

而不是让模型自由修改 JSON。

---

# 2. 为什么现在做 V2.2

V2.1 已经完成 Agent 化所需的大部分“编辑器地基”：

1. Project 是明确、可验证的结构化状态；
2. Script / Scene 已提供语义层；
3. Selection Store 已能引用 Scene / Clip / Transcript range；
4. AI Workspace 已有 Prompt / References / Plan / Activity / Diff / Apply UI；
5. `VisualPlan` 已区分 `rules` / `provider` source；
6. Canvas / Safe Area / occupancy 已进入 AI planning context；
7. `ProjectCommand` 已覆盖大量常用编辑动作；
8. `ProjectCommandTransaction` 已提供原子 Apply；
9. Undo / Redo 已经过真实项目验收；
10. Remotion / HyperFrames / B-roll 已是可执行视觉引擎。

所以 V2.2 不应该重写编辑器，而应该把这些现有能力组合成一个真正的 Agent Runtime。

---

# 3. V2.2 核心目标

V2.2 必须完成以下 7 个目标：

## G1. Real AI Provider

接入真正的远程 reasoning provider，而不是继续只依赖 deterministic rules。

要求：

```text
Provider Adapter
Structured Output
Timeout / Cancel
Error normalization
Provider health/status
Rules fallback
No provider secret inside Project
```

---

## G2. Selection-aware Agent Context

Agent 必须明确知道用户当前在操作什么：

```text
@Project
@Scene
@Clip
@Transcript Range
@Current Frame
@Timeline Window
@Asset
@Brand
@Linked Style
@Canvas / Safe Area
```

默认原则：

> **有 Selection 时，Agent 优先在 Selection scope 内工作。**

不允许用户选中一个 Caption，却让 Agent 默认改整条视频。

---

## G3. Tool Registry

把 Video OS 已有编辑能力整理成 AI 可调用但严格受控的 Tool Registry。

Agent 不能获得：

```text
shell
arbitrary filesystem
raw project.json write
arbitrary network
unvalidated command injection
```

Agent 只能调用已注册工具。

---

## G4. Plan → Tool Calls → Diff → Transaction

模型输出不能直接成为 Project。

正确链路：

```text
Provider Output
→ AgentPlanSchema.parse()
→ Tool Registry validate
→ Dry Run
→ Diff
→ User Confirm
→ Commands
→ Transaction
→ Repository Save
```

---

## G5. Multi-turn Editing Session

Agent Workspace 要支持连续修改：

```text
用户：把这段做得更有冲击力。
AI：Plan A...
用户：数字可以强一点，但字幕弱一点。
AI：基于上一轮 Plan / Selection 调整。
```

多轮上下文必须是：

```text
Project-scoped Agent Session
```

而不是不可控的全局聊天记忆。

---

## G6. Generated Visual Assets

V2.2 的 Generated Assets 采用**受控范围**：

### 必须支持

AI 可以自动规划并生成 / 准备现有可信引擎支持的视觉资产，例如：

```text
HyperFrames motion visual
Remotion motion visual
已有素材派生的 B-roll placement
```

### 架构预留

```text
GeneratedAssetAdapter
```

允许未来接：

```text
Image generation
Video generation
Other media providers
```

但 V2.2 不做“生成媒体 Provider Marketplace”。

---

## G7. Agent Evals / Safety / Durability

Agent 功能不能只靠“聊天看起来聪明”。

必须可测试：

```text
作用范围是否正确
工具是否正确
参数是否合法
Diff 是否真实
Transaction 是否原子
Undo 是否完整
Provider failure 是否零 mutation
Project revision conflict 是否阻止错误 Apply
Restart 后是否可恢复
Final Render 是否真实一致
```

---

# 4. 明确 Non-goals

V2.2 不做：

```text
完全无人确认的 Autonomous Editing
任意 Shell / Terminal Agent
任意文件系统 Agent
Cloud Collaboration
Multi-user editing
Multi Timeline
Arbitrary Docking
Full Crop / Mask Engine
Transition Suite
HDR / Advanced Color
Project Package
Generated Media Provider Marketplace
AI Voice / Avatar / Lip Sync
Local LLM Hosting Platform
Plugin Marketplace
Remote Render Farm
```

这些不能因为“Agent 顺手可以做”而塞进 V2.2。

---

# 5. 不可破坏的产品 Invariants

## 5.1 AI Never Mutates Project Directly

禁止：

```text
model → project.json
model → repository.save(raw model output)
```

必须：

```text
model
→ structured intent
→ registered tool
→ validated ProjectCommand
→ Transaction
```

---

## 5.2 One Confirm = One Logical Transaction

用户一次确认一个 Agent Plan：

```text
1 Confirm
=
1 ProjectCommandTransaction
=
1 Undo
```

即使内部有：

```text
12 tool calls
18 commands
```

只要属于同一次逻辑 Apply，就应该一次 Undo 完整恢复。

---

## 5.3 Read Before Write

Agent 在任何 mutation 前必须先构建最新 Context Snapshot。

不得依赖：

```text
过期的上一轮 Project 对象
```

---

## 5.4 Base Revision Guard

所有 Agent Plan 必须记录：

```text
baseProjectRevision
```

Apply 前重新读取 Project。

如果：

```text
currentRevision != baseProjectRevision
```

默认：

```text
Reject Apply
→ Context Changed
→ Re-plan / Refresh Diff
```

不能静默覆盖用户在计划生成后做的编辑。

---

## 5.5 Source Media Immutable

Agent 不能修改或覆盖原始素材。

任何媒体派生仍遵守：

```text
Original Source
!=
Working Media
!=
Generated / Derived Asset
```

---

## 5.6 Universal Canvas Continues

Agent 工具不得重新引入：

```text
9:16-first
portrait-first
1080×1920 hardcode
```

所有 layout tool 必须读取当前 Project Canvas 和 Safe Area。

---

# 6. Agent Runtime 总体架构

```text
┌────────────────────────────────────────────────────────────┐
│ AI AGENT WORKSPACE                                         │
│ Prompt · References · Plan · Activity · Diff · Confirm     │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ AgentSessionController                                     │
│ session / cancellation / current plan / follow-up          │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ AgentContextBuilder                                        │
│ project + selection + scene + transcript + timeline + ...  │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ AIProviderAdapter                                          │
│ rules / remote provider                                    │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ AgentPlanSchema                                            │
│ structured steps / tool intents / confidence / rationale   │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ AgentToolRegistry                                          │
│ resolve → validate → dry-run                               │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ AgentDiff                                                  │
│ commands / timeline changes / style changes / generated    │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
                 User Confirm
                       ↓
┌────────────────────────────────────────────────────────────┐
│ ProjectCommandTransaction                                  │
└──────────────────────┬─────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────────┐
│ ProjectRepository.save + validation                        │
└────────────────────────────────────────────────────────────┘
```

---

# 7. Provider Architecture

定义统一接口：

```ts
interface AIProviderAdapter {
  id: string;
  capabilities: ProviderCapabilities;
  health(): Promise<ProviderHealth>;
  plan(input: AgentProviderInput, signal?: AbortSignal): Promise<AgentProviderOutput>;
}
```

Provider 只负责：

```text
理解意图
基于 Context 规划
输出结构化 Agent Plan
```

Provider 不负责：

```text
直接写 Project
直接执行工具
直接访问 filesystem
直接运行 ffmpeg
直接操作浏览器
```

Provider-specific request / response 必须封装在 Adapter 内。

Video OS 的业务层只看统一 Schema。

---

# 8. Rules Provider 的角色

V2.1 Rules Director 不删除。

V2.2 中它成为：

```text
Fallback Provider
Deterministic Evaluation Baseline
Offline / No-Key Mode
Regression Oracle for focused cases
```

UI 应显示当前来源：

```text
Remote AI
Rules
Fallback
```

如果远程 Provider 不可用：

```text
明确提示
→ 可以切 Rules
```

不能悄悄把失败伪装成 AI 成功。

---

# 9. Agent Context Snapshot

建议定义：

```ts
AgentContextSnapshot = {
  projectId;
  projectRevision;
  canvas;
  safeArea;
  currentFrame;
  workflow;
  brandSummary;
  selection;
  scenes;
  transcriptWindow;
  timelineWindow;
  assetsSummary;
  effectsSummary;
  linkedStylesSummary;
  visualDensity;
  occupancy;
  toolAvailability;
}
```

原则：

> 给模型的是完成当前任务所需的最小充分上下文，不是把整个 project.json 无脑塞给 Provider。

---

# 10. Selection Reference Model

V2.2 References 必须成为第一等输入。

支持：

```text
@Project
@Scene
@Clip
@Caption
@Motion
@B-roll
@Audio
@Transcript Range
@Asset
@Current Frame
@Timeline Window
```

每个 Reference 包含：

```text
id
kind
label
range / frame
summary
capabilities
```

UI 必须让用户知道：

> AI 当前到底在改谁。

---

# 11. Context Scope 规则

默认 scope 优先级：

```text
Explicit Reference
>
Current Selection
>
Current Scene
>
Visible Timeline Window
>
Whole Project
```

如果用户明确说：

> “整条视频”

才扩大到 Whole Project。

如果意图和 Selection 冲突：

```text
选中一个 Caption
用户却说“重做整条视频”
```

Agent 必须在 Plan 中明确说明 scope expansion。

高影响 scope expansion 必须 Confirm。

---

# 12. Tool Registry 设计

每个 Tool 都必须有：

```ts
AgentToolDefinition = {
  id;
  version;
  category;
  description;
  inputSchema;
  permission;
  dryRun;
  execute;
}
```

禁止 Provider 自己拼：

```text
ProjectCommand
```

Provider 只能选择 Tool + arguments。

Tool Runtime 再转换成真实 Commands。

---

# 13. Tool Permission Levels

## L0 — READ_AUTO

无 mutation，可自动执行：

```text
get_project_summary
get_selection_context
get_scene_context
get_transcript_range
get_timeline_window
list_assets
get_brand
list_linked_styles
list_effects
get_visual_density
get_canvas_context
```

---

## L1 — PREVIEW_REQUIRED

可以生成 Dry Run，但必须用户 Review 后 Apply：

```text
update_clip_timing
update_visual_transform
update_caption_style
update_audio_properties
update_broll_properties
update_scene_metadata
add_marker
add_remotion_visual
add_hyperframes_visual
remove_clip
```

---

## L2 — EXPLICIT_CONFIRM

影响范围较大的操作：

```text
bulk_retime_scene
bulk_remove_visuals
replace_scene_visual_plan
apply_style_to_many
whole_project_visual_pass
```

Plan UI 必须显示风险和影响数量。

---

## L3 — DISALLOWED

V2.2 Agent 永远不能调用：

```text
shell
arbitrary_command
raw_fs_write
raw_project_write
delete_source_media
force_git
network_fetch_any_url
```

---

# 14. V2.2 首批编辑 Tools

V2.2.0 至少必须提供：

### Timeline / Timing

```text
move_clip
trim_clip
split_clip
duplicate_clip
remove_clip
set_clip_layer
```

### Canvas / Transform

```text
set_visual_transform
fit_video
fit_broll
```

### Caption

```text
set_caption_style
set_caption_emphasis
set_caption_keywords
```

### Motion

```text
add_remotion_visual
update_motion_props
update_motion_transform
add_hyperframes_visual
```

### B-roll

```text
place_existing_broll
update_broll_timing
update_broll_transform
```

### Audio

```text
set_audio_role
set_audio_volume
set_audio_fades
```

### Scene / Structure

```text
update_scene
add_marker
```

### Analysis-only

```text
analyze_scene
analyze_density
find_proof_moments
find_numeric_moments
find_visual_gaps
```

---

# 15. Tool 实现原则：REUSE > MODIFY > CREATE

所有 Agent Tool 优先映射到已有 `ProjectCommand`。

例如：

```text
Agent Tool: move_clip
        ↓
ProjectCommand:
update-clip-timing
```

```text
Agent Tool: set_visual_transform
        ↓
update-motion-transform
or
update-video-properties
or
update-broll-properties
```

只有现有 Command 无法表达一个真正必要、稳定的编辑语义时，才新增 ProjectCommand。

不能为了 AI 方便而复制第二套 mutation engine。

---

# 16. Agent Plan Schema

建议：

```ts
AgentPlan = {
  version: 1;
  sessionId: string;
  planId: string;
  projectId: string;
  baseProjectRevision: number;
  provider: {
    id: string;
    mode: "remote" | "rules" | "fallback";
  };
  intent: string;
  scope: AgentScope;
  references: AgentReference[];
  summary: string;
  rationale: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  steps: AgentPlanStep[];
  expectedOutcome: string;
}
```

每个 Step：

```ts
AgentPlanStep = {
  id;
  title;
  reason;
  toolId;
  arguments;
  permission;
  expectedTargets;
}
```

Provider 输出必须经过 Zod parse。

Parse 失败：

```text
Project mutation = 0
```

---

# 17. Tool Call Result Schema

每个 Dry Run Tool 返回：

```ts
AgentToolPreview = {
  toolCallId;
  toolId;
  targets;
  commands;
  warnings;
  generatedAssets;
  impact;
}
```

最终合并成：

```text
AgentDiff
```

而不是直接 Apply。

---

# 18. Agent Diff

V2.2 Diff 不只显示数字。

至少分：

```text
Add
Remove
Move
Trim
Style
Transform
Audio
Scene
Generated Asset
```

并显示：

```text
Affected clips
Affected scenes
Affected duration
Before → After
Risk
Warnings
```

如果是 Canvas 可视修改：

尽可能提供：

```text
Before Preview
After Preview
```

---

# 19. Agent Session State Machine

```text
IDLE
  ↓
CONTEXT_READY
  ↓
PLANNING
  ↓
PLAN_READY
  ↓
DRY_RUNNING
  ↓
REVIEW_READY
  ↓
AWAITING_CONFIRMATION
  ↓
APPLYING
  ↓
VALIDATING
  ↓
COMPLETED
```

异常状态：

```text
CANCELLED
PROVIDER_ERROR
TOOL_ERROR
REVISION_CONFLICT
VALIDATION_ERROR
```

所有状态必须在 Activity UI 可见。

---

# 20. Cancel / Retry

用户必须能：

```text
Cancel Provider Request
Cancel before Apply
Retry Plan
Re-run with same References
Edit Prompt then Re-plan
```

Cancel 在 Apply 前：

```text
Project mutation = 0
```

Apply 一旦进入 Transaction：

不能留下 half-applied Project。

---

# 21. Multi-turn Session

Session 可以保留：

```text
prior user prompts
prior plan summaries
prior tool outcomes
last diff
last transaction ID
current references
```

但不要把每次完整 Project Snapshot 永久复制到聊天历史。

下一轮重新读取最新 Project Context。

正确逻辑：

```text
Conversation Context
+
Fresh Project Snapshot
```

---

# 22. Session Persistence

建议位置：

```text
projects/<id>/edit/agent/
```

例如：

```text
session-<id>.json
plan-<id>.json
activity-<id>.json
```

Agent session files：

```text
不是 Project Schema
不增加 project revision
```

Project 事实仍然只在：

```text
project.json
```

---

# 23. Generated Assets Scope

V2.2 先把“Agent 可以生成视觉资产”做成受控工具，而不是开放式生成平台。

## 23.1 HyperFrames

Agent 可以：

```text
选择合适的 HyperFrames effect
生成 props
prepare asset
Preview
Apply
```

沿用当前：

```text
HyperFramesRenderService
```

---

## 23.2 Remotion

Remotion 仍优先作为 deterministic visual generation：

```text
Effect Catalog
Compatibility Metadata
Zod Props
Universal Canvas
```

Agent 只在 catalog 允许范围内选择。

---

## 23.3 Future GeneratedAssetAdapter

预留接口：

```ts
interface GeneratedAssetAdapter {
  id: string;
  capabilities: string[];
  generate(request, signal?): Promise<GeneratedAssetResult>;
}
```

但 V2.2 Release Gate 不要求构建 Provider Marketplace。

---

# 24. Generated Asset Provenance

现有 Asset Schema 已能表达：

```text
video
image
overlay
audio
```

V2.2 优先不升级 Project Schema。

生成来源元数据可放 Agent sidecar：

```text
edit/agent/generated-assets.json
```

Project 中只保存正常 Asset。

如果后续发现 durable provenance 必须成为 Project 事实：

再单独做 Schema proposal + migration gate。

禁止为了 V2.2 Agent 先把 Project Schema 随意升版。

---

# 25. Revision / Concurrency

Agent Plan 生成：

```text
baseRevision = 42
```

用户同时手动移动 Clip：

```text
Project revision = 43
```

此时 Agent 点 Apply：

```text
BLOCK
```

UI：

> Project changed after this plan was created. Refresh context and re-plan.

不能自动覆盖。

---

# 26. Idempotency

每个 Agent plan / tool call 必须有 stable ID。

同一个：

```text
planId + toolCallId
```

重复提交不能生成两份相同 visual。

API 层必须能识别：

```text
already applied
```

或通过 deterministic target IDs 防重复。

---

# 27. Provider Secret / Privacy

Provider credential：

```text
ENV / secure runtime config
```

禁止写入：

```text
Project
Agent Session JSON
logs
Git
browser localStorage
```

Agent Context 默认只发送任务所需文本和结构数据。

本地媒体文件不能因为 Agent Planning 被自动上传给 remote provider。

如果未来需要上传图像 / 视频给模型：

必须成为独立、明确的产品能力，并在 UI 说明。

---

# 28. Provider Failure

以下任何失败：

```text
timeout
network error
invalid structured output
rate limit
provider unavailable
cancel
```

都必须满足：

```text
Project revision unchanged
Project files unchanged
```

用户可以：

```text
Retry
Switch Provider
Use Rules Fallback
```

---

# 29. AI Agent Workspace UI

V2.1 AI Workspace 不推倒重做。

升级为：

```text
┌─────────────────────────────────────────────────────────────┐
│ AI AGENT                                                    │
│                                                             │
│ [ Prompt _____________________________________________ ]     │
│                                                             │
│ References                                                  │
│ @Scene Proof  @Clip motion-4  @Transcript 12.2–18.0s        │
│                                                             │
│ Scope                                                       │
│ Selected / Scene / Timeline Window / Whole Project          │
│                                                             │
│ Plan                                                        │
│ 1. Analyze proof moment                                     │
│ 2. Add numeric visual                                       │
│ 3. Reduce caption emphasis                                  │
│ 4. Shift B-roll                                             │
│                                                             │
│ Activity                                                    │
│ ✓ Context                                                   │
│ ✓ Provider                                                  │
│ ✓ Tool dry-run                                              │
│ ● Awaiting review                                           │
│                                                             │
│ Diff                                                        │
│ +1 Motion   1 Style change   1 B-roll timing change         │
│                                                             │
│ [ Cancel ]                       [ Apply 3 changes ]         │
└─────────────────────────────────────────────────────────────┘
```

---

# 30. Tool Call Transparency

Activity UI 不展示模型内部推理链。

展示的是可审计执行事实：

```text
Reading Scene 3
Reading timeline 12s–20s
Checking Safe Area
Planning with Remote AI
Dry-running add_remotion_visual
Dry-running set_caption_style
Diff ready
Waiting for confirmation
Applied transaction AI-AGENT-...
```

用户不需要看到 hidden chain-of-thought。

但必须看到：

```text
AI 做了什么
用了什么工具
准备改什么
最终改了什么
```

---

# 31. Follow-up UX

Apply 后 Composer 保留：

```text
Result Summary
Transaction ID
Undo
Follow-up Prompt
```

用户可以继续：

> “数字再大一点。”

下一轮默认 References 包含：

```text
上一次 Apply 产生的主要对象
+
当前 Selection
```

但仍重新读取最新 Project revision。

---

# 32. Agent Scope Risk

定义：

### LOW

```text
1–2 selected items
style / transform / small timing
```

### MEDIUM

```text
one Scene
multiple clips
visual re-orchestration
```

### HIGH

```text
whole project
bulk removal
large retime
many scenes
```

High-risk Plan：

```text
必须显式 Confirm
必须显示 affected count
默认不自动勾选 destructive steps
```

---

# 33. Destructive Operation Policy

以下工具默认：

```text
remove_clip
bulk_remove_visuals
replace_scene_visual_plan
```

必须显示：

```text
Destructive
```

Agent 可以建议，但不能悄悄删除。

如果 Plan 同时：

```text
Add 5
Remove 8
```

Diff 必须明确区分。

---

# 34. Validation after Apply

Transaction Apply 后自动执行 focused validation：

```text
ProjectSchema.parse
Clip ranges valid
Scene ranges valid
Asset references valid
Effect compatibility valid
No unsupported canvas effect
No clip beyond project duration
No invalid linked style
```

若 validation 失败：

```text
Transaction must not persist partial invalid state
```

---

# 35. Agent Evaluation Framework

V2.2 必须建立一套固定 Eval Fixtures。

至少：

### E1 Numeric Proof

输入：

> “90%以上在工厂完成”

预期：

```text
识别 numeric proof
推荐合适 visual
Safe Area 内 placement
```

### E2 Selection Scope

选中 Caption A：

> “字幕弱一点”

预期：

```text
只修改 Caption A
```

### E3 Scene Re-orchestration

选中一个 Scene：

> “这段更像产品广告，但不要太满”

预期：

```text
Scene scoped plan
density-aware
multiple tools
one Transaction
```

### E4 Revision Conflict

Plan 后手动改 Project。

预期：

```text
Apply blocked
```

### E5 Provider Failure

模拟 provider timeout。

预期：

```text
0 mutation
```

### E6 Undo

Agent Apply 产生多个 edits。

预期：

```text
one Undo restores all
```

### E7 Universal Canvas

同一个 Prompt 在：

```text
16:9
9:16
1:1
21:9
```

预期：

```text
valid tool plan
valid visual placement
```

### E8 Restart

Apply → Save → Restart → Reopen。

预期：

```text
Project durable
Agent sidecar readable
```

---

# 36. Provider Evals 与 Product Evals 分离

Provider 智能表现：

```text
semantic accuracy
plan usefulness
scope accuracy
```

Product Runtime 表现：

```text
schema validity
tool validity
transaction correctness
durability
render correctness
```

即使 Provider 输出不完美，Runtime 也必须保证 Project 不坏。

---

# 37. Performance Targets

V2.2 首版目标：

### Context Build

```text
P95 < 500ms
```

对于普通短视频项目。

### UI First Feedback

用户点击 Run 后：

```text
< 300ms
```

必须进入 visible activity 状态。

### Remote Plan

不强制 provider 固定延迟，但：

```text
有 timeout
有 cancel
有 progress state
```

### Apply

不包含外部媒体 generation 时：

```text
应接近当前 Command Transaction latency
```

不允许 Provider latency 阻塞已确认的本地 Transaction。

这些是产品目标，需要通过真实项目测量校准。

---

# 38. Observability

记录：

```text
sessionId
planId
providerId
provider mode
latency
cancelled
parse success
number of tool calls
number of commands
risk level
base revision
apply revision
transaction ID
validation result
```

禁止记录：

```text
API Key
Authorization Header
secret
```

日志默认 local-first。

---

# 39. Project Schema Strategy

V2.2 默认目标：

```text
Project Schema remains 2.0.0
```

原因：

Agent session / plan / activity 不是 Project durable truth。

现有 ProjectCommand 已覆盖多数工具。

只有出现以下情况才考虑 Schema upgrade：

```text
一个 Agent 生成的新事实必须永久存在于 Project
且现有 Asset / Clip / Scene / Brand / Linked Style 无法表达
```

如果发生：

```text
单独 PRD Amendment
Migration
Backward Compatibility Test
MIGRATION VERIFIED Gate
```

---

# 40. 推荐代码结构

建议新增：

```text
lib/agent/
  schema.ts
  context.ts
  session.ts
  service.ts
  diff.ts
  validation.ts
  permissions.ts

lib/agent/providers/
  contracts.ts
  rules-provider.ts
  remote-provider.ts

lib/agent/tools/
  registry.ts
  read-tools.ts
  timeline-tools.ts
  caption-tools.ts
  motion-tools.ts
  broll-tools.ts
  audio-tools.ts
  scene-tools.ts
  generated-visual-tools.ts

app/api/projects/[id]/agent/
  plan/route.ts
  preview/route.ts
  apply/route.ts
  cancel/route.ts

components/agent/
  AgentComposer.tsx
  AgentReferences.tsx
  AgentPlanView.tsx
  AgentActivity.tsx
  AgentDiff.tsx
  AgentApplyBar.tsx
```

原则：

```text
复用现有 VisualPlanner
逐步抽象
不要大爆炸重构
```

V2.1 `VisualPlanService` 可以逐步成为 Agent 的一个 specialized planner / tool，而不是一次性删除。

---

# 41. V2.2 开发阶段

## A0 — Contract / Architecture

只做：

```text
Agent Schema
Provider Contract
Tool Contract
Permission Model
Context Contract
Revision Guard Contract
Eval Fixtures
```

不接真实 Provider。

Gate：

```text
AGENT CONTRACT ACCEPTED
```

---

## A1 — Agent Runtime + Rules Bridge

实现：

```text
AgentSessionController
ContextBuilder
Tool Registry
Dry Run
Agent Diff
Transaction Apply
Revision Guard
```

先用 Rules / deterministic fake provider 验证 Runtime。

Gate：

```text
AGENT RUNTIME VERIFIED
```

---

## A2 — Real Provider

实现：

```text
Remote Provider Adapter
Structured Plan
Timeout
Cancel
Error normalization
Health
Rules fallback
```

Gate：

```text
REAL PROVIDER VERIFIED
```

---

## A3 — Selection-aware Editing Tools

完成首批 Tool Set：

```text
Timeline
Transform
Caption
Motion
B-roll
Audio
Scene
```

Gate：

```text
TOOL REGISTRY VERIFIED
SELECTION SCOPE VERIFIED
```

---

## A4 — Generated Visuals

实现：

```text
Remotion generation tool
HyperFrames generation tool
Generated asset sidecar provenance
```

Gate：

```text
GENERATED VISUAL VERIFIED
```

---

## A5 — Agent UX / Multi-turn

实现：

```text
Prompt
References
Scope
Plan
Activity
Tool calls
Diff
Confirm
Result
Follow-up
Cancel
Retry
```

Gate：

```text
AGENT UX ACCEPTED
```

---

## A6 — Cloud Regression / Evals

要求：

```text
lint
typecheck
unit tests
build
agent eval fixtures
legacy V2.1 regression
```

Gate：

```text
CLOUD VERIFIED
```

---

## L1 — Windows Agent UI

本地真实验证：

```text
Agent Workspace
Selection references
Provider states
Cancel
Retry
Diff
Confirm
Undo / Redo
```

---

## L2 — Real Media / Tools

真实素材验证：

```text
Caption
Motion
B-roll
Audio
HyperFrames
Remotion
Timeline
```

---

## L3 — Cross-aspect Agent Render

至少：

```text
16:9
9:16
1:1
21:9
```

每种：

```text
Agent Plan
Apply
Preview
Final Render
Visual Compare
```

---

## L4 — Full Agent Durability

```text
Plan
Apply
Save
Restart
Reopen
Follow-up Agent edit
Second Apply
Second Render
Undo / Redo
```

Gate：

```text
WINDOWS AGENT VERIFIED
DURABILITY VERIFIED
VISUAL ACCEPTED
```

---

# 42. GPT Web / GitHub 与 Local Codex 分工

继续沿用既有开发模式。

## GPT Web + GitHub

负责：

```text
PRD
Schema / contracts
Provider abstraction
Tool Registry
API
UI architecture
Unit tests
Deterministic fixtures
CI
PR review
```

---

## Local Codex / Windows

负责：

```text
真实 Provider credential environment
真实网络/provider behavior
Windows UI acceptance
真实媒体
FFmpeg
HyperFrames runtime
Remotion runtime
Browser interaction
real render
restart/reopen
audio/video visual compare
```

原则：

> Cloud 能证明结构正确；Local 必须证明真实工作流可用。

---

# 43. Git Branch / PR Strategy

建议：

```text
main
  ↓
feature/v2.2-ai-agent
```

一个主 Draft PR 承载 V2.2 集成。

阶段 commit 清晰区分：

```text
A0 contracts
A1 runtime
A2 provider
A3 tools
A4 generated visuals
A5 UX
A6 regression
```

本地修复回到同一个 feature branch。

最终：

```text
Cloud PASS
+
Local PASS
+
PRD PASS
→ merge main
→ release/v2.2.0
```

---

# 44. CI Requirements

V2.2 PR 必须持续运行：

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

新增 Agent focused tests：

```text
provider output parse
invalid tool rejection
permission rejection
selection scope
revision conflict
cancel = no mutation
provider failure = no mutation
dry-run = no mutation
confirm = one transaction
undo = full rollback
idempotency
generated visual compatibility
cross-aspect placement
```

---

# 45. Minimum E2E User Stories

## Story 1 — Selected Caption

用户选中 Caption：

> “这句字幕弱一点，只突出数字。”

必须：

```text
Reference = selected caption
Plan = caption style only
Diff visible
Apply one Transaction
Other captions unchanged
```

---

## Story 2 — Selected Scene

用户选中 Proof Scene：

> “这段更像广告，突出数据和证明，但不要堆太多卡片。”

Agent：

```text
读取 Scene
读取字幕
读取 occupancy
读取 density
读取 Canvas
调用多个 tools
dry-run
Diff
Confirm
one Transaction
```

---

## Story 3 — Timeline Clip

用户选中 B-roll：

> “提前一秒出现，缩短一点，画面靠右。”

Agent 必须生成精确 timing + transform changes。

---

## Story 4 — Multi-turn

第一轮：

> “这段更有冲击力。”

Apply 后：

> “刚才的数字可以保留，但 B-roll 弱一点。”

第二轮必须基于最新 Project 和上一轮结果继续。

---

## Story 5 — Provider Failure

远程 Provider timeout。

结果：

```text
Activity shows failure
Project unchanged
Retry available
Rules fallback available
```

---

## Story 6 — Revision Conflict

AI Plan 已完成。

用户手动编辑 Timeline。

再点 Apply。

结果：

```text
BLOCK
Refresh context
Re-plan
```

---

## Story 7 — Generated Motion

用户：

> “这里做一个 3 步流程图。”

Agent：

```text
识别 process
选择 HyperFrames process-flow
生成 props
prepare
preview
confirm
apply
```

---

# 46. Local Acceptance Matrix

V2.2 最终至少真实验证：

| Capability | Windows UI | Real Provider | Real Media | Restart | Render |
| --- | --- | --- | --- | --- | --- |
| Selection Caption edit | PASS | PASS | PASS | PASS | PASS |
| Scene multi-tool edit | PASS | PASS | PASS | PASS | PASS |
| B-roll timing/transform | PASS | PASS | PASS | PASS | PASS |
| Audio property edit | PASS | PASS | PASS | PASS | PASS |
| Remotion generated visual | PASS | PASS | PASS | PASS | PASS |
| HyperFrames generated visual | PASS | PASS | PASS | PASS | PASS |
| Revision conflict | PASS | PASS | N/A | N/A | N/A |
| Provider failure | PASS | PASS | N/A | N/A | N/A |
| Cancel | PASS | PASS | N/A | N/A | N/A |
| Undo / Redo | PASS | PASS | PASS | PASS | PASS |

---

# 47. Universal Canvas Acceptance

Agent 至少必须在：

```text
1920×1080
1080×1920
1080×1080
2560×1080
```

真实完成：

```text
Prompt
References
Plan
Tool Calls
Diff
Apply
Preview
Final Render
```

同一个语义任务不能因比例变化出现：

```text
invalid transform
overflow
unsupported effect silently inserted
portrait-only behavior
```

---

# 48. Security / Boundary Tests

必须测试 Provider 尝试输出：

```text
unknown tool
raw filesystem path
shell command
invalid clip ID
invalid track ID
out-of-range frame
unsupported effect
negative duration
oversized scale
```

Runtime 必须拒绝。

结果：

```text
0 Project mutation
clear error
```

---

# 49. V2.1 Non-regression

V2.2 不能破坏：

```text
New Project
Scenario Starter
Universal Media Import
MOV/WebM/MKV/AVI normalize
Script
Scenes
Captions
AI Rules Director
Canvas
Safe Area
Effect Library
Inspector
Timeline
Brand
Linked Style
B-roll
Audio
Export Profile
zh-CN / en-US
Dark / Light
Save / Restart / Reopen
Final Render
```

特别要求：

> 没有配置 Remote Provider 时，Video OS 仍然必须作为 V2.1 编辑器完整可用。

---

# 50. V2.2 Release Definition of Done

只有以下全部 PASS，才能说 V2.2 完成：

```text
AGENT CONTRACT ACCEPTED: PASS
AGENT RUNTIME VERIFIED: PASS
REAL PROVIDER VERIFIED: PASS
TOOL REGISTRY VERIFIED: PASS
SELECTION SCOPE VERIFIED: PASS
GENERATED VISUAL VERIFIED: PASS
AGENT UX ACCEPTED: PASS
REVISION CONFLICT VERIFIED: PASS
PROVIDER FAILURE SAFETY: PASS
TRANSACTION SAFETY: PASS
UNDO / REDO VERIFIED: PASS
UNIVERSAL CANVAS AGENT VERIFIED: PASS
CLOUD VERIFIED: PASS
WINDOWS AGENT VERIFIED: PASS
DURABILITY VERIFIED: PASS
VISUAL ACCEPTED: PASS
USABILITY ACCEPTED: PASS
REGRESSION ACCEPTED: PASS
PRD ACCEPTED: PASS
```

并且：

```text
Remaining Failed Items: NONE
```

---

# 51. V2.2 不追求什么

V2.2 成功标准不是：

> “AI 能做所有 Premiere / CapCut 功能。”

也不是：

> “用户一句话，AI 直接改完整视频且不需要确认。”

真正成功标准是：

> **AI 可以可靠地理解一个明确编辑目标，把目标拆成 Video OS 已注册工具，生成可审查 Diff，并在用户确认后以一个原子 Transaction 完成真实编辑。**

只要这一条稳定成立，Video OS 才真正从：

```text
AI-assisted editor
```

跨到：

```text
Agentic video editor
```

---

# 52. 下一版本边界

以下建议留给 Post-V2.2：

```text
V2.3 Generated Media / Search Agent
V2.4 Advanced Timeline / Transitions / Crop-Mask
V3 Cloud / Collaboration / Project Package
```

具体版本号以后重新评估，不作为当前承诺。

---

# 53. 最终决策摘要

V2.2 的主线只有一条：

```text
Natural Language
→ Selection-aware Context
→ Real AI Provider
→ Structured Plan
→ Registered Tools
→ Dry-run Diff
→ User Confirm
→ ProjectCommandTransaction
→ Validation
→ Undo / Redo
```

V2.2 必须继续坚持：

```text
AI proposes.
Video OS validates.
User confirms.
Commands mutate.
Transaction persists.
Undo restores.
```

这条链是 V2.2 的产品与工程底线。
