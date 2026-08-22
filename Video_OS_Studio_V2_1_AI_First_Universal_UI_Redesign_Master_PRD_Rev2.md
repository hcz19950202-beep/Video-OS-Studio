# Video OS Studio V2.1 — AI-First Universal Canvas UI Redesign Master PRD Rev.2

> **产品定位**：一个支持任意横屏、竖屏、方形、超宽、自定义尺寸与多种媒体格式的 AI 原生视频编辑工作台。  
> **核心原则**：OpenCut 提供专业编辑器壳的参考；ChatCut 提供 AI-first Workspace / Agent UX 的参考；Video OS 保留并强化自己的 Script / Scene / AI Director / Command Transaction / Remotion / HyperFrames 核心。
>
> **本版本最重要修订**：Video OS 不再以 9:16、竖屏口播或任何固定比例作为产品默认假设。所有 Viewer、Canvas、Inspector、Timeline、AI、字幕、Effect 与 Render UI 都必须由 Project Canvas 动态驱动。

---

# 0. 文档信息

- 文档名称：`Video OS Studio V2.1 — AI-First Universal Canvas UI Redesign Master PRD Rev.2`
- 产品目标版本：V2.1
- 基线版本：Video OS Studio V2.0.0
- V2.0.0 Tag：`v2.0.0`
- V2.0.0 Main Commit：`64da5ec6539a787f4d2f3750b3c5cea0273255ce`
- 当前 Project Schema：`2.0.0`
- 核心目标：
  1. UI 信息架构重构；
  2. Universal Canvas；
  3. AI Workspace；
  4. Resizable Workspace；
  5. Selection-aware Inspector；
  6. Script / Scene / Media / AI 的连续工作流；
  7. 横屏、竖屏、方形、超宽、自定义比例一等支持；
  8. 媒体格式与画布比例解耦；
  9. 保持 V2.0 Core 业务引擎不重写。

---

# 1. 产品重新定义

Video OS 不是：

> 9:16 真人口播编辑器

也不是：

> Remotion Effect Editor

也不是：

> OpenCut / ChatCut Clone

Video OS V2.1 的产品定义是：

> **AI-First Universal Video Workspace**

它必须同时支持：

```text
横屏视频
竖屏视频
方形视频
社交媒体比例
电影宽银幕
演示视频
广告
口播
产品视频
知识视频
Motion Graphics
自定义比例视频
```

编辑器不能因为用户制作：

```text
16:9
21:9
4:3
1:1
4:5
3:4
9:16
```

中的任何一种而进入“非标准路径”。

---

# 2. 三个必须彻底分开的概念

以后 Video OS UI、Schema、Importer、Render 讨论时必须严格区分：

## 2.1 Source Media Format

原素材是什么：

```text
MOV
MP4
WebM
MKV
M4V
AVI
Image
Audio
...
```

以及：

```text
3840×2160
1920×1080
1080×1920
4096×2160
1080×1080
任意其它分辨率
```

这是素材属性。

---

## 2.2 Project Canvas

用户最终正在制作的画布：

```ts
canvas.width
canvas.height
canvas.fps
```

它决定：

```text
Viewer Aspect
Canvas Coordinate System
Safe Area
Effect Layout
Caption Layout
Render Dimension
```

这是项目事实。

---

## 2.3 Export Profile

最终导出的：

```text
Container
Codec
Resolution
FPS
Bitrate
Audio
```

默认：

```text
Export Resolution = Project Canvas
```

但 Export Profile 不应该反向污染编辑器布局。

---

# 3. Universal Canvas 原则

V2.1 开始禁止：

```text
portrait-only
vertical-only
9:16-first
```

架构假设。

正确模型：

```text
Project Canvas
width × height
        ↓
derive aspect ratio
        ↓
Viewer automatically fits available region
```

---

# 4. Canvas Ratio Presets

New Project / Project Inspector 提供快捷预设：

| Preset | Width × Height |
| --- | --- |
| Landscape 16:9 | 1920×1080 |
| Portrait 9:16 | 1080×1920 |
| Square 1:1 | 1080×1080 |
| Social 4:5 | 1080×1350 |
| Portrait 3:4 | 1080×1440 |
| Classic 4:3 | 1440×1080 |
| Ultrawide 21:9 | 2560×1080 |
| UHD Landscape | 3840×2160 |
| UHD Portrait | 2160×3840 |
| Match Source | From source media |
| Custom | Width × Height |

这些只是：

```text
SHORTCUTS
```

不是：

```text
SUPPORTED FORMAT LIST
```

真正底层是：

```text
Custom Width × Height
```

---

# 5. 任意比例验收原则

项目创建后至少必须支持：

```text
width > height
width < height
width = height
very wide
very tall
```

不允许：

```text
if portrait
  use real editor
else
  use degraded mode
```

---

# 6. Viewer / Canvas 自适应模型

Viewer 区域永远是一个可调整容器。

内部 Canvas：

```text
CanvasFit = min(
  availableWidth / projectWidth,
  availableHeight / projectHeight
)
```

因此：

### 横屏

```text
┌───────────────────────┐
│                       │
│   ┌───────────────┐   │
│   │     16:9      │   │
│   └───────────────┘   │
│                       │
└───────────────────────┘
```

### 竖屏

```text
┌───────────────────────┐
│       ┌───────┐       │
│       │       │       │
│       │  9:16 │       │
│       │       │       │
│       └───────┘       │
└───────────────────────┘
```

### 方形

```text
┌───────────────────────┐
│      ┌──────────┐     │
│      │   1:1    │     │
│      └──────────┘     │
└───────────────────────┘
```

Viewer 面板本身不因比例重建。

---

# 7. 禁止 Portrait Viewer 常量成为产品规则

ChatCut 本地研究里存在 Portrait Viewer width 等实现常量。

Video OS 可以参考它的：

```text
Resizable
Dockable
Workspace persistence
```

但不能复制：

```text
Portrait Viewer = primary layout
```

Video OS 的 Viewer：

```text
Universal Viewer
```

---

# 8. Canvas Coordinate System

所有可视元素继续使用 Project Canvas 坐标。

不能使用：

```text
Browser px
Panel px
Portrait px
```

作为 durable layout。

Canvas Overlay 只负责：

```text
Project Coordinate
↔
Display Coordinate
```

转换。

所以：

```text
X/Y
Scale
Rotation
Anchor
Snap
Guides
Bounding Box
```

必须在所有比例保持相同语义。

---

# 9. Safe Area 也必须比例无关

禁止写死：

```text
9:16 safe area
```

设计：

```ts
SafeAreaProfile = {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

值建议使用：

```text
percentage / normalized coordinate
```

而不是固定像素。

系统可以提供平台 Preset：

```text
Generic
YouTube
TikTok
Instagram Reels
Instagram Feed
Facebook
Custom
```

但平台预设不改变 Project Canvas。

---

# 10. Effect / Motion 必须 Universal Canvas

Remotion / HyperFrames Effect 不得默认：

```text
1080×1920
```

Effect Layout 必须读取：

```text
composition width
composition height
aspect ratio
```

分类：

### A. Relative Layout Effect

推荐。

```text
x = percentage
y = percentage
maxWidth = percentage
```

天然兼容不同 Canvas。

### B. Responsive Effect

根据：

```text
landscape
portrait
square-ish
ultrawide
```

选择不同布局。

### C. Fixed Design Effect

如果 Effect 明确只适合某比例：

必须在 Effect Metadata 标记：

```text
recommendedAspect
unsupportedAspect
```

UI 必须提前提示。

不能渲染后才发现跑出画面。

---

# 11. AI Director 必须理解 Canvas

AI Director Context 增加：

```text
canvas.width
canvas.height
canvas.aspectRatio
canvas.orientation
safeArea
existing visual occupancy
```

同一句：

> 90%以上在工厂完成

在：

```text
16:9
```

和：

```text
9:16
```

不一定推荐同一种视觉布局。

AI Director 应决定：

```text
what visual
+
where
+
how large
+
how dense
```

而不是只决定：

```text
effectId
```

---

# 12. AI Composer Universal Context

未来 Composer 的 Context Header 应显示：

```text
Project
1920×1080 · 30 fps · 01:12

Selected
@Scene PROOF
@Transcript “90%以上...”
@Asset factory.mp4
```

而不是：

```text
9:16 Project
```

除非当前项目确实是 9:16。

---

# 13. Home / New Project 重构

首页：

```text
Recent Projects

Create New
```

进入 New Project：

第一步问：

> 你想制作什么？

例如：

```text
Talking Head
Product Ad
Explainer
Educational
Motion Video
Long → Short
Blank
```

第二步：

# Canvas

```text
Match Source

16:9
9:16
1:1
4:5
3:4
4:3
21:9

Custom
Width [     ]
Height[     ]

FPS
24
25
30
50
60
Custom
```

Scenario 不能强制比例。

例如：

```text
Talking Head
```

只可以建议：

```text
Suggested:
9:16 / 16:9
```

用户可以直接选：

```text
21:9
```

系统仍然必须工作。

---

# 14. OpenCut + ChatCut + Video OS 最终融合

## OpenCut 借鉴

```text
Resizable Editor Shell
Media
Viewer
Inspector
Timeline
Professional density
Simple Top Bar
```

---

## ChatCut 借鉴

ChatCut 本地调研确认的：

```text
AI Panel as first-class workspace
AI + Transcript simultaneously visible
Assets / Library / Transcript panel group
Selection references
Agent plan/tool/progress/result
Workspace persistence
Scenario starters
```

---

## Video OS 保留

```text
Project Schema
Command / Transaction
Script
Scene
AI Director
Review / Diff / Apply
Brand
Linked Style
Canvas
Timeline
Remotion
HyperFrames
video-use
local render
```

---

# 15. V2.1 最终 Desktop Shell

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ VIDEO OS   Project Name       ↶ ↷     Saved      Workspace   AI  Export │
├────┬──────────────────┬────────────────────────────┬────────────────────┤
│    │                  │                            │                    │
│    │                  │                            │                    │
│Rail│ Content Panel    │     UNIVERSAL VIEWER       │ Context Inspector  │
│    │                  │                            │                    │
│    │                  │   Project Canvas Fits      │                    │
│    │                  │   Available Viewer Area    │                    │
│    │                  │                            │                    │
├────┴──────────────────┴────────────────────────────┴────────────────────┤
│ Scene Strip                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ Timeline                                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

这里没有：

```text
Portrait Viewer
Landscape Viewer
```

只有：

```text
Universal Viewer
```

---

# 16. Left Rail

建议：

```text
Script
Scenes
AI
Media
Captions
Effects
Brand
Project
```

但为了避免入口继续膨胀：

Content Panel 内进一步分组：

### Media

```text
Assets
Transcript
Library
```

### Effects

```text
Remotion
HyperFrames
Presets
```

### Project

```text
Canvas
Brand
Workspace
Settings
```

---

# 17. AI Workspace

点击 AI 后：

```text
┌────────────────┬──────────────────┬─────────────────────────────┐
│ AI Composer    │ Context Panel    │ Universal Viewer            │
│                │                  │                             │
│ References     │ Script           │                             │
│ Plan           │ Scenes           │                             │
│ Activity       │ Assets           │                             │
│ Diff           │                  │                             │
│ Apply          │                  │                             │
├────────────────┴──────────────────┴─────────────────────────────┤
│ Timeline                                                       │
└────────────────────────────────────────────────────────────────┘
```

Viewer 仍然按当前 Project Canvas Fit。

AI Workspace 不假设 portrait。

---

# 18. Workspace Presets

先做官方 Preset，不做完全自由 Dock。

## EDIT

```text
Media | Viewer | Inspector
Timeline
```

## AI

```text
AI Composer | Context | Viewer
Timeline
```

## SCRIPT

```text
Script Wide | Viewer
Compact Timeline
```

## MOTION

```text
Effects | Viewer | Inspector
Tall Timeline
```

Workspace Preset 与 Canvas Ratio 完全独立。

例如：

```text
MOTION Workspace
+
21:9 Project
```

必须正常。

---

# 19. Resizable Shell

建议尺寸使用：

```text
Icon Rail
48px

Content Panel
min 240
default 300
max 480

AI Panel
min 320
default 380
max 560

Inspector
min 280
default 320
max 460

Timeline
min 220
default 300
max 60vh
```

注意：

不要定义：

```text
Portrait Viewer Width = 520
```

Viewer：

```text
flex: 1
```

Canvas 自己 fit。

---

# 20. Viewer Toolbar

统一：

```text
00:31:04 / 01:12:00

Play / Pause

Canvas Edit
Safe Area
Guides
Fit
25%
50%
100%
Fullscreen
```

可以显示：

```text
1920×1080
16:9
```

或：

```text
1080×1920
9:16
```

仅作为信息。

---

# 21. Inspector Registry

继续按 Selection / Capability：

```text
Selection
↓
Capability Resolver
↓
Inspector Registry
```

例如：

### Video

```text
Media
Transform
Crop
Audio
Timing
```

### Caption

```text
Content
Typography
Style
Transform
Timing
Linked
```

### Motion

```text
Content
Style
Transform
Animation
Timing
Linked
```

### Project

```text
Canvas
Brand
Workspace
Render
```

Project → Canvas Inspector 必须允许查看/修改：

```text
Width
Height
FPS
Aspect
Background
Safe Area
```

修改 Canvas 是高影响操作。

必须：

```text
Preview Changes
```

再 Apply。

---

# 22. Canvas Resize / Change Aspect

用户将：

```text
1080×1920
```

改成：

```text
1920×1080
```

不能直接悄悄改。

显示：

```text
CHANGE CANVAS

1080×1920  →  1920×1080

Affected:
38 Captions
8 Motion
3 B-roll
1 Video

Reflow Strategy:

○ Keep current transforms
○ Fit visual elements
○ Re-center safe elements

[Cancel] [Apply]
```

V2.1 初版可以只正式支持：

```text
Keep current transforms
```

其它作为未来能力。

但 UI 架构必须提前正确。

---

# 23. Media Import Universal UX

用户说的“什么格式都能做”不仅是尺寸，也涉及输入容器。

RC1 已经暴露：

```text
MOV 当前需要人工转换 MP4
```

这不符合最终产品定位。

正确产品行为：

```text
Import file
↓
Probe
↓
Can native pipeline read?
├ Yes → use source
└ No  → auto normalize
         ↓
       internal compatible media
```

用户 UI 只看到：

```text
Importing IMG_0948.MOV

Preparing media…
62%

Original preserved.
```

不能让普通用户自己：

```text
打开 FFmpeg
把 MOV 转 MP4
再导入
```

---

# 24. Universal Media Ingest Target

产品目标支持：

### Video Containers

```text
MP4
MOV
M4V
WebM
MKV
AVI
```

具体 codec 是否可直接编辑由 probe 决定。

不能直接编辑：

```text
Auto Normalize
```

### Images

```text
PNG
JPEG
WebP
GIF / animation — capability dependent
```

### Audio

```text
MP3
WAV
M4A
AAC
FLAC
```

原则：

```text
User-facing compatibility broad
Internal editing format controlled
```

---

# 25. Source ≠ Proxy ≠ Export

Asset 建议未来区分：

```ts
Asset {
  originalSource
  workingMedia
  proxy?
  mediaInfo
}
```

Project 永远保留：

```text
Original Source identity
```

内部可以生成：

```text
working copy
proxy
waveform
thumbnail
```

用户不需要知道 codec 工程细节。

---

# 26. Timeline Universal

Timeline 不关心：

```text
Canvas orientation
```

它只关心：

```text
frames
tracks
clips
```

因此：

```text
16:9
9:16
1:1
21:9
```

Timeline UI 完全相同。

---

# 27. Script / Scene Universal

Script 和 Scene 更不允许绑定比例。

同一 Script：

```text
可以制作：
YouTube 横版
TikTok 竖版
Square 广告
```

Scene 是：

```text
Meaning / semantic range
```

不是布局。

---

# 28. Caption Universal Layout

字幕不能用：

```text
y = 1650
```

这种只适合 1080×1920 的模板思路。

字幕布局应尽量：

```text
normalized position
safe area alignment
max width percentage
```

例如：

```text
position: bottom
safeBottom: 8%
maxWidth: 82%
```

这样所有比例可迁移。

---

# 29. Brand Universal

Generated Video Brand 不能包含固定画布假设。

Brand 定义：

```text
Color
Typography
Motion Character
Caption Style
Visual Density
```

Canvas 定义：

```text
Width
Height
Safe Area
```

两者独立。

---

# 30. Scenario Starter Universal

例如：

### Talking Head Ad

不再等于：

```text
1080×1920
```

而是：

```text
Workflow Starter
```

它初始化：

```text
AI prompt
Scene taxonomy
recommended caption style
recommended visual density
```

同时提示：

```text
Common canvas:
9:16
16:9
1:1
```

用户选择任何尺寸。

---

# 31. Export UI

Export：

```text
EXPORT

Canvas
1920 × 1080
16:9

Video
H.264

Container
MP4

FPS
30

Audio
AAC

Quality
High

[Export]
```

支持 Custom Output：

```text
Use Project Canvas
Custom
```

但如果输出比例与 Project Canvas 不一致：

必须警告：

```text
Output aspect ratio differs from project canvas.

This may crop or letterbox content.
```

V2.1 不需要自动智能 Reframe。

---

# 32. UI Design System

继续 Video OS 品牌，不复制 ChatCut Cyan。

建议：

```text
Background  #0b0c0e
Surface     #101114
Surface 2   #141519
Border      #292a30
Text        #f3f3f1
Muted       #85868d
Accent      #ff4b20
```

橙色只用于：

```text
Selected
Active
Playhead
Primary AI Apply
Export
```

---

# 33. V2.1 UI 开发路线重新排序

## UI-0 — Universal UI Contract

先建立：

```text
Universal Canvas rules
Media/Canvas/Export distinction
UI Master PRD
Responsive acceptance matrix
```

---

## UI-1 — Resizable Universal Editor Shell

开发：

```text
Resizable Panels
Collapse
Workspace Presets
Layout Persistence
Reset Layout
Universal Viewer
```

验收至少：

```text
16:9
9:16
1:1
21:9
Custom
```

---

## UI-2 — Rail + Content Panel Group

```text
Script
Scenes
AI
Media
Captions
Effects
Brand
Project
```

重组：

```text
Assets
Transcript
Library
```

---

## UI-3 — Universal Viewer + Inspector Registry

```text
Canvas Fit
Canvas Metadata
Safe Area
Inspector Tabs
Canvas/Inspector Selection
```

---

## UI-4 — Timeline Visual Redesign

不重写 Timeline Engine。

只重做：

```text
Track Headers
Scene Strip
Toolbar
Zoom
Waveform visuals
Selection states
```

---

## UI-5 — AI Workspace / Composer

```text
Prompt
References
Plan
Activity
Reason
Confidence
Alternatives
Diff
Apply
```

现有 AI Director Engine 继续复用。

---

## UI-6 — Script / Scene UX

```text
Speaker-ready UI
Search
Removed state
Semantic chips
AI references
Scene cards
Density / AI status
```

---

## UI-7 — Home / Scenario Starter / Canvas Creation

完成：

```text
New Project
Scenario
Canvas presets
Match Source
Custom Width/Height
FPS
```

---

## UI-8 — Universal Media Import UX

解决：

```text
MOV manual transcode
```

目标：

```text
Probe
Auto Normalize
Progress
Error
Original preserved
```

---

## UI-9 — i18n / Accessibility / Polish

```text
zh-CN
en-US
keyboard
focus
tooltips
loading
error
empty state
responsive
```

---

# 34. V2.1 必须测试的 Canvas Matrix

至少：

| Ratio | Example |
| --- | --- |
| 16:9 | 1920×1080 |
| 9:16 | 1080×1920 |
| 1:1 | 1080×1080 |
| 4:5 | 1080×1350 |
| 4:3 | 1440×1080 |
| 21:9 | 2560×1080 |
| Custom Landscape | 1600×900 |
| Custom Portrait | 900×1600 |

所有都必须验证：

```text
Viewer Fit
Canvas Selection
Drag
Resize
Rotate
Snap
Caption
Motion
B-roll
AI Visual
Preview
Final Render
```

---

# 35. 不允许的验收方式

不能只验：

```text
1080×1920
```

然后说：

> “其它理论上支持。”

至少要真实 Render：

```text
一个横屏
一个竖屏
一个方形/非 16:9 自定义
```

---

# 36. V2.1 不应顺手开发的功能

即使 ChatCut 有，也先不要混：

```text
Cloud Collaboration
Marketplace
Multi Timeline
Advanced Transition Suite
Crop/Mask full engine
Keyframe Curve Editor
HDR
Professional Color
Real AI Provider
Full AI Command Bar Tool Surface
Generated Image/Video/Music Provider Marketplace
```

先把：

> **Universal AI Workspace UI**

做稳。

---

# 37. 最终产品 IA

```text
VIDEO OS

HOME
├ Recent
├ Scenario Starter
└ New Project
   ├ Match Source
   ├ Canvas Preset
   └ Custom Canvas

EDITOR
│
├ WORKSPACES
│  ├ Edit
│  ├ AI
│  ├ Script
│  └ Motion
│
├ CONTENT
│  ├ Media
│  ├ Transcript
│  ├ Scenes
│  ├ Captions
│  ├ Effects
│  └ Library
│
├ AI COMPOSER
│  ├ Prompt
│  ├ References
│  ├ Plan
│  ├ Activity
│  ├ Diff
│  └ Apply
│
├ UNIVERSAL VIEWER
│  ├ Canvas
│  ├ Safe Area
│  ├ Guides
│  └ Fit / Zoom
│
├ CONTEXT INSPECTOR
│
├ SCENE STRIP
│
└ TIMELINE

PROJECT
├ Canvas
├ Brand
├ Linked Styles
├ Workspace
├ Render Jobs
├ Export
└ Settings
```

---

# 38. 三个平台的角色

最终仍然锁定：

```text
OpenCut
→ Professional Editor Shell

ChatCut
→ AI-first Workspace / Agent UX

Video OS
→ Universal semantic video engine
```

Video OS 的差异不是：

```text
我们也有 Timeline
```

而是：

```text
Words
↓
Meaning
↓
Scene
↓
AI Decisions
↓
Universal Canvas
↓
Professional Fine Editing
↓
Render
```

---

# 39. V2.1 最重要的产品原则

以后所有 PR 都必须回答：

> 这段代码是否假设了某个固定画布比例？

如果答案：

```text
YES
```

除非该功能本身就是特定比例模板，否则：

```text
PR SHOULD NOT MERGE
```

---

# 40. Definition of Done

V2.1 完成必须证明：

1. 用户可以新建横屏 Project；
2. 用户可以新建竖屏 Project；
3. 用户可以新建方形/自定义 Project；
4. 同一套 Editor Shell 正常；
5. 同一套 Script / Scene 正常；
6. AI Workspace 正常；
7. Inspector 正常；
8. Canvas 操作正常；
9. Timeline 正常；
10. Caption/Effect/B-roll 正常；
11. 至少三种不同 Canvas 实际 Final Render；
12. 不需要工程师手工修改 Project JSON；
13. MOV 等常见不兼容媒体可以自动进入内部可编辑格式；
14. 输入格式、Canvas、Export 三者不混淆；
15. V2.0 核心能力无回归。

---

# 41. 最终结论

V2.1 不是：

> “为竖屏口播重做一个更漂亮的 UI。”

V2.1 是：

> **把 Video OS V2.0 已经验证过的 AI 视频引擎，装进一个真正支持任意视频画布的专业 AI 工作台。**

核心公式：

```text
OpenCut Shell
+
ChatCut AI Workspace
+
Video OS Semantic Core
+
Universal Canvas
=
Video OS Studio V2.1
```
