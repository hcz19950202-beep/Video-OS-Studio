# Video OS Studio V2.0 — AI Native Video Editor Master PRD Rev.2

> 定位：以真人口播为核心、以文本语义为一级编辑对象、以 Scene 为内容组织单元、以 Canvas / Timeline 为视觉编辑层、以 AI Director 为编排助手、以 Remotion 为最终 Master Composition Engine 的本地 AI 原生视频编辑器。
>
> 当前基线：Video OS Studio V1.1 已完成、真实 Windows 验收通过，并已 Squash Merge 到 `main`。
>
> 本 PRD 目标：在不重做 V1.1 已验证能力的前提下，把 Video OS 从“程序化视频工作台”升级为“内容语义驱动的 AI 原生视频编辑器”。

---

## 0. 当前基线

- Repository: `hcz19950202-beep/Video-OS-Studio`
- Default branch: `main`
- V1.1 baseline: `c3c026cd256d6ebfdced28b433112c1839347666`
- Local repo: `E:\Video-OS-Studio`
- Local data: `E:\Video-OS-Data`
- Runtime: Node 24
- Engines: video-use / Remotion / HyperFrames / FFmpeg

V1/V1.1 已真实验收：MP4 → video-use → EDL → 字幕 → 五轨 Timeline → Remotion / HyperFrames → Visual Planner → Preset → Final MP4 / VP9 Alpha WebM → 重启恢复。

### V1.1 已完成，V2 禁止重做

- 高密度专业工作台
- Dark / Light Studio Theme
- zh-CN / en-US UI 切换与持久化
- Adaptive Preview: 9:16 / 16:9 / 1:1
- Preview / Timeline splitter
- Assets / Effects / Captions / Project 左侧工作区
- Effect Search / Filter
- 五轨 frame-based Timeline 基础能力
- Motion Transform: X / Y / Scale / Opacity / 9-point Anchor
- Schema-driven Inspector
- Inspector Preset，复用 `VIDEO_OS_DATA_ROOT` Asset/Preset Library
- Remotion / HyperFrames Master Pipeline
- video-use Adapter
- Visual Planner V1
- Final H.264/AAC MP4
- VP9 Alpha WebM
- Project JSON Export

规则：**REUSE / EXTEND，不允许 REWRITE 已验收基线。**

---

# 1. V2 核心产品变化

当前主要抽象：

```text
Clip → Track → Timeline → Effect
```

V2 目标：

```text
Words → Meaning → Scene → Visual Decision → Clip → Render
```

Video OS V2 不做 AI Assisted Premiere Clone，而要成为 **AI Native Video Editor**。

北极星流程：

```text
导入口播视频
↓
自动转写
↓
Script Editor
↓
像改文章一样剪视频
↓
AI / 手动 Scene 分段
↓
AI Director 分析视觉强化点
↓
Review Recommendations
↓
Apply Selected
↓
Canvas / Timeline 微调
↓
Global Brand / Linked Style
↓
字幕 / B-roll / Motion / Audio
↓
Final MP4 / Alpha WebM
```

---

# 2. V2 Milestones

```text
M0  V2 Baseline Freeze
↓
M1  Project Schema 2.0 + Migration
↓
M2  Text-native Editing: Script + Scene
↓
M3  Editor V2: Context Inspector + Multi-select + Brand + Linked Style
↓
M4  Canvas + Timeline V2
↓
M5  AI Director V2
↓
V2 Acceptance
```

Multi-language Content、Project Package、AI Command Bar 属于 Core 后续，不阻塞 V2 Core。

---

# 3. Milestone 0 — Baseline Freeze

Branch: `chore/v2-baseline`

只做：

- README 与 V1.1 真实状态对齐
- GPT_WEB_HANDOFF 与 V1.1 / V2 状态对齐
- SYSTEM 增加 V2 semantic architecture
- 本文件成为 V2 authoritative PRD

不改业务代码，不改 Project Schema。

Gate:

```text
CODE COMPLETE
CLOUD VERIFIED
DOC BASELINE VERIFIED
```

---

# 4. Milestone 1 — Project Schema 2.0 + Migration

这是 V2 最关键的基础阶段。

## 4.1 Project Version

```ts
CURRENT_PROJECT_VERSION = "2.0.0"
```

## 4.2 ProjectV2

```ts
type ProjectV2 = {
  version: "2.0.0";
  project: ProjectMeta;
  canvas: CanvasConfig;
  assets: Asset[];
  tracks: Track[];

  script: ScriptDocument;
  scenes: Scene[];
  markers: Marker[];
  brand: BrandConfig;
  linkedStyles: LinkedStyle[];
  language: LanguageConfig;
  visualPlan?: VisualPlan;
};
```

## 4.3 Script

```ts
type TranscriptWord = {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  confidence?: number;
};

type ScriptSegment = {
  id: string;
  sceneId?: string;
  speaker?: string;
  words: TranscriptWord[];
  status: "active" | "removed";
  semanticTags: string[];
};

type ScriptDocument = {
  transcriptAssetId?: string;
  segments: ScriptSegment[];
};
```

内部时间全部使用 Frame。

## 4.4 Scene

```ts
type SceneSemanticType =
  | "hook"
  | "pain"
  | "problem"
  | "reframe"
  | "solution"
  | "proof"
  | "process"
  | "comparison"
  | "cta"
  | "custom";

type Scene = {
  id: string;
  name: string;
  semanticType: SceneSemanticType;
  startFrame: number;
  endFrame: number;
  summary?: string;
  styleId?: string;
  visualStrategy?: {
    intensity: "low" | "medium" | "high";
    preferredEngines: Array<"remotion" | "hyperframes" | "broll">;
  };
};
```

## 4.5 Marker

```ts
type Marker = {
  id: string;
  frame: number;
  label?: string;
  color?: string;
  type?: "note" | "beat" | "cta" | "visual";
};
```

## 4.6 Generated Video Brand

Studio UI Theme 与 Generated Video Brand 必须分离。

```ts
type BrandConfig = {
  mode: "dark" | "light" | "custom";
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    data: string;
    success: string;
    danger: string;
    text: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    captionFont: string;
  };
  motion: {
    speed: number;
    scale: number;
    intensity: "minimal" | "balanced" | "strong";
  };
  captionStyleId?: string;
};
```

## 4.7 Linked Style

Preset = Copy-on-create。Linked Style = Live Reference。

```ts
type LinkedStyle = {
  id: string;
  name: string;
  target: "motion" | "caption" | "text" | "cta";
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
```

## 4.8 Content Language

UI Language 不进入 Project。Content Language 进入 Project：

```ts
type LanguageConfig = {
  sourceLanguage: string | "unknown";
  captionTracks: Array<{
    language: string;
    role: "original" | "translation";
  }>;
};
```

## 4.9 V1 → V2 Migration

必须实现真实：

```text
1.0.0 → 2.0.0
```

旧项目迁移默认加入：

```json
{
  "script": {"segments": []},
  "scenes": [],
  "markers": [],
  "linkedStyles": [],
  "language": {"sourceLanguage": "unknown", "captionTracks": []}
}
```

Brand 使用明确默认值。

Migration 必须保证以下数据完全保留：

- Video
- Caption
- Remotion Motion
- HyperFrames Motion
- Motion Transform
- B-roll
- Audio
- Assets
- Project ID / Revision
- Canvas
- 相对路径安全边界

必须用真实 V1.1 项目 `v1-rough-cut-validation-98c8f21e` 做 Windows 本地迁移验证。

## 4.10 Selection Model V2

```ts
type SelectionState = {
  selectedClipIds: string[];
  selectedSceneId: string | null;
  selectedScriptRange?: {
    startWordId: string;
    endWordId: string;
  };
};
```

优先级：

```text
Script Range > Clip Multi-select > Scene > Project
```

保留兼容 API 仅用于过渡，不允许长期维护两套 Selection Truth。

## 4.11 History Transaction

```ts
type CommandTransaction = {
  id: string;
  label: string;
  commands: ProjectCommand[];
};
```

目标：AI/批量操作一次 Apply = 一次 Undo。

### M1 禁止开发

不做 Script UI、Scene UI、Canvas UI、Timeline V2、AI Director UI。

Gate:

```text
CODE COMPLETE
CLOUD VERIFIED
MIGRATION VERIFIED
LOCAL VERIFIED
PRD ACCEPTED
```

---

# 5. Milestone 2 — Text-native Editing

包含 Script Editor + Scene System。

## 5.1 Script Editor

核心目标：**像修改文章一样剪视频。**

支持：

- 点击 Word/Sentence → Player Seek
- Player Seek → Script 自动滚动
- 拖选文字
- Delete / Restore
- Keep
- Motion
- B-roll
- Quote
- CTA
- Comment

删除文字不能 destructive edit 原始媒体。必须生成 Canonical Edit Command。

唯一剪辑事实：

```text
Script
↓
Canonical Edit Structure
↓
Video Track
```

禁止 Script 与 Timeline 各有一套不一致的剪辑事实。

Removed Text 保留可恢复状态，例如：

```text
~~这段被删除~~
```

必须双向同步：

```text
Script ↔ Player
Script ↔ Timeline
```

## 5.2 Scene System

Scene 是内容意义明确、视觉策略相对一致的视频段落，不是素材 Clip。

语义类型：HOOK / PAIN / PROBLEM / REFRAME / SOLUTION / PROOF / PROCESS / COMPARISON / CTA / CUSTOM。

Script 示例：

```text
[HOOK]
如果你是澳大利亚建筑商……

[PAIN]
人工成本越来越高……

[REFRAME]
把现场施工搬到工厂……

[PROOF]
15天……90%以上……30天……4个人一天……

[CTA]
把项目地址和图纸发给我们……
```

Timeline 上方增加 Scene Strip：

```text
| HOOK | PAIN | REFRAME | PROOF | CTA |
```

Scene 支持 Add / Rename / Split / Merge / Delete / Semantic Type / Note / Style / AI Reclassify。

### M2 Acceptance

真实 60–90 秒口播：Transcribe → Script → Seek → Delete → Preview/Render 删除 → Restore → 自动 Scene → 手动 Split/Merge。

---

# 6. Milestone 3 — Editor V2

包含：Context-aware Inspector / Multi-select / Generated Video Brand / Linked Style。

## 6.1 Context Inspector

```text
Nothing     → Project Inspector
Video       → Video Inspector
Caption     → Caption Inspector
Remotion    → Motion Inspector
HyperFrames → HyperFrames Inspector
B-roll      → B-roll Inspector
Audio       → Audio Inspector
Scene       → Scene Inspector
Multi       → Common Properties
```

现有 Motion Inspector 的 Timing / Content / Style / Layout / Preset 必须继续复用，只扩展能力。

Video Inspector：Position / Scale / Opacity / Fit-Fill / Volume / Mute / Source Start / Start / Duration / Replace Media。

Caption Inspector：Preset / Font / Size / Weight / Line Height / Position / Width / Alignment / Fill / Stroke / Shadow / Background / Number/Keyword/Current-word Highlight / Linked Style。

B-roll：Fit-Fill / Position / Scale / Opacity / Volume / Mute / Fade / Timing。

Audio：Volume / Mute / Fade / Role(Voice/BGM/SFX)，不做 DAW。

## 6.2 Multi-select

支持 Shift+Click、Rectangle Select、Timeline Multi-select。

Common Properties 只显示公共属性；值不一致显示 `Mixed`。

## 6.3 Brand Inheritance

```text
Global Brand
↓
Scene Style
↓
Linked Style
↓
Clip Override
```

优先级：

```text
Clip Override > Linked Style > Scene Style > Brand > Effect Default
```

## 6.4 Linked Style

多个 Card 引用同一 Style。修改 Style 后所有绑定对象同步更新。

### M3 Acceptance

选择各 Clip/Scene 自动切换 Inspector；多选 3 张 Motion 出现 Common Properties；创建一个 Linked Style 绑定至少 4 张 Card，改一次后全部同步，并通过真实 Render。

---

# 7. Milestone 4 — Canvas + Timeline V2

## 7.1 Canvas

必须复用 V1.1 MotionTransform。兼容扩展：

```ts
type MotionTransformV2 = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  anchor: MotionAnchor;
  rotation?: number;
};
```

除非明确必要，不增加 `scaleX/scaleY`。

Canvas 支持：Select / Drag / Resize / Rotate / Nudge / Shift 等比例 / Center Snap / Safe-zone Snap / Alignment Guides / Layer Forward/Backward。

Canvas 与 Inspector 必须双向同步，并最终通过 Project Command 进入 Project State。

## 7.2 Timeline V2

只补高频能力：

- Snap：Playhead / Clip start/end / Scene boundary / Marker / Caption boundary
- Marker：`M`
- Multi-select
- Shortcuts
- Waveform：预计算 peaks
- Scene Strip

核心快捷键：Space、方向键、Shift+方向键、M、Delete、Ctrl/Cmd+D、Undo/Redo、S、Esc。

### M4 Acceptance

Canvas Drag/Resize/Rotate/Snap 与 Inspector 一致；Timeline Snap/Marker/Multi-select/Shortcut/Waveform/Scene Strip 可用；Preview 与真实 Render 一致。

---

# 8. Milestone 5 — AI Director V2

AI 不直接改 Project：

```text
Analyze → Suggest → Explain → Preview Diff → User Confirm → Command Transaction
```

## 8.1 VisualSuggestion

```ts
type VisualSuggestion = {
  id: string;
  sceneId: string;
  startFrame: number;
  endFrame: number;
  spokenText: string;
  semanticType: "number" | "percentage" | "comparison" | "process" | "map" | "proof" | "cta" | "keyword";
  recommendation: {
    engine: "remotion" | "hyperframes" | "broll" | "none";
    effectId?: string;
    props?: Record<string, unknown>;
  };
  reason: string;
  confidence: number;
  alternatives: Array<{engine: string; effectId?: string; reason?: string}>;
};
```

## 8.2 Explainability

每条建议必须展示 Scene、Spoken Text、Recommendation、Reason、Confidence、Alternatives。

## 8.3 Visual Density

AI 必须读取 Motion cards/min、并发峰值、Scene intensity、视觉事件间隔，避免每句话一个动画。

## 8.4 Change Preview

Apply 前展示 Add / Remove / Shorten / Style changes / Density before→after。

AI Apply 必须是一个可 Undo 的 Command Transaction。

### M5 Acceptance

Scene-aware Plan → Reason/Alternatives → 取消部分建议 → Change Preview → Apply → Undo → Redo → Final Render。

---

# 9. V2 Core 后续，不阻塞 Core

- Multi-language Content：多 Caption Language Track；不做 Voice Clone / Lip Sync
- Project Package：安全 ZIP import/export + migration + missing asset report
- AI Command Bar：仅安全结构化命令 + Preview/Apply

---

# 10. 当前不要优先开发

- 更多 Remotion Effects / HyperFrames Blocks
- 复杂 Audio Mixer
- Marketplace / Cloud Sync / 多人协作
- AI Avatar / Lip Sync / Text-to-video
- Color Grading / AE Keyframe clone

当前主线必须保持：

```text
V1.1 Baseline → Project V2 → Script → Scene → Editor Core → Canvas/Timeline → AI Director
```

---

# 11. Branch Strategy

```text
chore/v2-baseline
feature/v2-foundation
feature/v2-text-editing
feature/v2-editor-core
feature/v2-canvas-timeline
feature/v2-ai-director
```

不要用一个 `feature/v2-all` 开发到底。

---

# 12. GPT Web / GitHub / Local Codex 分工

GPT Web + GitHub 主做：Architecture / Schema / Migration / React / Commands / Selection / History / Script / Scene / Inspector / Brand / Linked Style / Canvas logic / Timeline algorithms / AI Director / Unit+Integration Tests / PR / CI。

Local Codex 主做：Windows / real MP4 / real transcript / video-use / mouse drag / keyboard / waveform / fonts / Chromium / FFmpeg / HyperFrames / Remotion / final MP4 / alpha WebM / performance / local regression。

同一个 Milestone 不允许网页 GPT 与本地 Codex 并发修改同一分支。

```text
GPT Web development
→ CODE COMPLETE / CLOUD VERIFIED
→ Handoff
→ Local Codex validation/fixes
→ Same PR
→ Final CI/review
→ Merge
```

本地问题编号：

```text
V2-M1-LV-001
V2-M2-LV-001
...
```

---

# 13. Gates

每个 Milestone 独立报告：

- CODE COMPLETE
- CLOUD VERIFIED
- LOCAL VERIFIED
- PRD ACCEPTED
- RENDER VERIFIED（涉及视频）
- VISUAL ACCEPTED（涉及重大 UI）
- MIGRATION VERIFIED（涉及版本迁移）

最小 CI：

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

GitHub CI 不能替代 Windows/Browser/Render 证据。

---

# 14. Performance / UX

目标：60–90 秒项目流畅；1000 transcript words 无明显卡顿；300 clips 内可用；Canvas/Timeline drag 接近 60fps；Inspector feedback <200ms；waveform 预计算；binary 不写 Project JSON。

UX 必须：完整双语、明确 destructive state、keyboard focus/tooltips、AI destructive batch 必须 preview、Studio Theme 与 Video Brand 分离。

---

# 15. V2 成功标准

```text
拍一条口播
↓
导入
↓
自动转写
↓
像改文章一样剪
↓
自动 Scene
↓
AI Director 做第一版视觉
↓
Canvas / Timeline 微调
↓
统一 Brand / Linked Style
↓
最终导出
```

用户不需要写代码、不需要理解 Remotion、不需要理解 EDL、不需要手工规划每个 Effect。

最终架构：

```text
SCRIPT / SCENE / ASSETS
          ↓
      AI DIRECTOR
          ↓
   VISUAL DECISIONS
       ↙       ↘
    CANVAS   TIMELINE
       ↘       ↙
   PROJECT COMMANDS
          ↓
      PROJECT V2
     ↙     ↓      ↘
video-use HyperFrames Remotion
                   ↓
                 Render
```

---

# 16. Immediate execution order

```text
STEP 1  chore/v2-baseline → CI → Merge
STEP 2  feature/v2-foundation → Project 2.0 + Migration → Local migration acceptance → Merge
STEP 3  feature/v2-text-editing → Script + Scene → real talking-head acceptance → Merge
STEP 4  feature/v2-editor-core → Inspector + Multi-select + Brand + Linked Style → local/render acceptance → Merge
STEP 5  feature/v2-canvas-timeline → Canvas + Timeline V2 → browser interaction acceptance → Merge
STEP 6  feature/v2-ai-director → Explain/Alternatives/Diff/Apply/Undo → real content acceptance → Merge
```

核心原则：

> V2 的价值不是更多工具，而是更正确的视频抽象。

```text
Words → Meaning → Scene → Visual Decision → Clip → Render
```
