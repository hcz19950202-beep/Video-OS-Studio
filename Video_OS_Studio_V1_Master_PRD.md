# Video OS Studio V1.0 — Master PRD

> 产品定位：一个面向“真人口播视频”的本地 AI 视频工作台。  
> 核心技术栈：video-use + Remotion + HyperFrames + FFmpeg。  
> 目标：把“实拍口播 → 智能剪辑 → 动效规划 → 可视化编辑 → 成片导出 → 资产沉淀”做成一套长期可复用的视频生产系统。

---

# 0. 文档信息

- 文档名称：Video OS Studio V1.0 — Master PRD
- 版本：V1.0
- 形态：本地优先 Web App
- 主要使用者：内容创作者 / 营销视频团队 / 自媒体工作室
- 主要视频类型：真人口播、营销广告、知识口播、案例讲解、产品说明
- 首要输出比例：9:16
- 次要输出比例：16:9 / 1:1
- 默认帧率：30fps
- 产品核心原则：
  1. 真人口播是主叙事；
  2. AI 负责理解和辅助，而不是无脑加特效；
  3. Remotion 负责最终总装；
  4. HyperFrames 负责复杂动态图形；
  5. video-use 负责口播理解、粗剪、EDL 和最终 QA；
  6. 每次项目结束，都要沉淀可复用资产；
  7. REUSE > MODIFY > CREATE。

---

# 1. 产品背景

当前真人口播视频生产存在几个明显问题：

1. 每条视频都从零开始剪；
2. 动效样式无法长期复用；
3. AI 可以写代码，但缺乏统一项目结构；
4. Remotion、HyperFrames、video-use 各自能力强，但没有统一工作台；
5. 编辑逻辑、品牌样式、字幕样式、CTA、动效、音效没有形成资产库；
6. 传统剪辑软件适合手工剪辑，但不适合做“参数化、程序化、AI 编排”的长期生产系统；
7. 如果直接让 Codex 每次根据文案临时写一条视频，质量和风格会波动，代码也会越来越乱。

因此需要一个本地工作台，把三种能力统一起来：

- video-use：理解真人素材、转写、粗剪、EDL；
- HyperFrames：复杂动态视觉素材；
- Remotion：最终视频总装和参数化渲染。

---

# 2. 产品目标

## 2.1 V1.0 核心目标

完成一个真正可工作的本地视频工作台，使用户可以：

1. 创建视频项目；
2. 导入口播视频；
3. 导入/生成字幕；
4. 在 Remotion Player 中实时预览；
5. 在 Timeline 中看到视频、字幕、Motion、B-roll 等轨道；
6. 从 Effect Library 添加动效；
7. 在 Inspector 中修改动效参数；
8. 调整动效出现时间与持续时间；
9. 加载 Remotion 原生组件；
10. 加载 HyperFrames 输出的透明 WebM；
11. 导入/导出 Project JSON；
12. 导出 MP4；
13. 导出透明 Overlay；
14. 保存项目；
15. 把优秀 Effect 保存为长期资产。

## 2.2 V1.0 不追求

V1.0 不做：

- 完整替代 Premiere / 剪映；
- 多机位专业剪辑；
- 复杂音频混音台；
- 多人云端协作；
- 用户权限系统；
- 在线支付；
- 云端项目同步；
- SaaS 多租户；
- 专业 NLE 级磁性时间线；
- 节点式合成系统；
- AE 级关键帧编辑器。

V1.0 的目标是：

> 做一个“真人口播 + AI 动效 + 程序化视频”的专业工作台，而不是另一个 Premiere。

---

# 3. 产品核心工作流

```text
RAW TALKING HEAD
      │
      ▼
  video-use
      │
      ├── ffprobe
      ├── transcription
      ├── takes_packed
      ├── rough cut
      └── EDL
      │
      ▼
 AI Visual Planner
      │
      ├── 找数字
      ├── 找对比
      ├── 找流程
      ├── 找结构
      ├── 找因果
      └── 找 CTA
      │
      ▼
 Visual Slots
      │
      ├──────── Remotion Native Effects
      │
      ├──────── HyperFrames Effects
      │
      ├──────── B-roll
      │
      └──────── None
      │
      ▼
 Video OS Studio
      │
      ├── Library
      ├── Player
      ├── Inspector
      └── Timeline
      │
      ▼
 Remotion Master Composition
      │
      ├── A-roll
      ├── Captions
      ├── Motion
      ├── B-roll
      ├── CTA
      ├── Logo
      ├── BGM
      └── SFX
      │
      ▼
 Render
      │
      ├── final.mp4
      └── overlay.webm
      │
      ▼
 video-use QA
      │
      ▼
 Asset Promotion
```

---

# 4. 技术架构

## 4.1 推荐技术栈

### Frontend

- Next.js
- React
- TypeScript
- Zustand
- Zod
- CSS Modules / Tailwind（二选一，建议先用 CSS Modules 或 Tailwind 统一）
- @remotion/player

### Video Engine

- Remotion
- FFmpeg
- HyperFrames
- video-use

### Local Backend

- Node.js
- Next.js Route Handlers 或独立 Node Service
- child_process / execa
- fs
- path

### Local Storage

V1.0 不强制数据库。

使用：

- JSON
- 本地目录
- project.json
- asset-registry.json

后续 V2 再考虑 SQLite。

---

# 5. 系统职责边界

## 5.1 video-use

负责：

- 视频探测；
- 视频转写；
- word-level transcription；
- takes_packed；
- 识别重复；
- 识别 false starts；
- 生成粗剪；
- EDL；
- 最终 QA。

video-use 不负责：

- 长期 UI；
- Effect Library；
- 品牌设计系统；
- 最终项目数据模型；
- 长期资产管理。

---

## 5.2 HyperFrames

负责：

- 数字动画；
- 数据动画；
- 地图路线；
- 流程图；
- 复杂文字动画；
- 复杂 GSAP 动画；
- UI 演示；
- 网页式动画；
- 复杂 SVG；
- 信息结构动画。

输出优先：

```text
transparent WebM
```

每个 HyperFrames Effect 独立存在。

禁止把整条视频都塞进一个 HyperFrames Composition。

---

## 5.3 Remotion

Remotion 是 Master Composition Engine。

负责：

- 真人视频；
- 字幕；
- B-roll；
- Remotion Effects；
- HyperFrames WebM；
- CTA；
- Logo；
- 音乐；
- 音效；
- 转场；
- 最终 Render。

最终成片必须由 Remotion 输出。

---

# 6. UI 布局

## 6.1 总体布局

```text
┌───────────────────────────────────────────────────────────┐
│ Video OS Studio      Project        Preview        Export │
├──────────────┬──────────────────────────┬─────────────────┤
│              │                          │                 │
│ Asset Library│                          │    Inspector    │
│              │      Remotion Player     │                 │
│ Search       │                          │ Content         │
│ Favorites    │                          │ Timing          │
│ Remotion     │                          │ Animation       │
│ HyperFrames  │                          │ Style           │
│ B-roll       │                          │ Sound           │
│ CTA          │                          │ Advanced        │
│              │                          │                 │
├──────────────┴──────────────────────────┴─────────────────┤
│ Timeline                                                  │
│                                                          │
│ Video      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│ Captions   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│ Motion          ███     █████      ███                  │
│ B-roll               ███████                            │
│ Audio      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                         ▲                                │
│                      Playhead                            │
└───────────────────────────────────────────────────────────┘
```

---

# 7. 功能模块

# 7.1 Project Manager

功能：

- 新建项目；
- 打开项目；
- 最近项目；
- 删除项目；
- 项目重命名；
- 项目封面；
- 自动保存；
- 手动保存；
- 项目导入；
- 项目导出。

项目目录：

```text
projects/
└── project-id/
    ├── project.json
    ├── input/
    ├── proxy/
    ├── transcripts/
    ├── edit/
    ├── captions/
    ├── animations/
    ├── broll/
    ├── audio/
    ├── preview/
    ├── render/
    └── project.md
```

---

# 7.2 Media Import

V1 支持：

- MP4
- MOV
- WebM
- WAV
- MP3
- PNG
- JPG
- WEBP
- SRT
- VTT

导入后：

- 复制到项目 input；
- 生成 metadata；
- ffprobe；
- 读取 duration；
- 读取 resolution；
- 读取 fps；
- 生成 thumbnail；
- 可选生成 proxy。

---

# 7.3 Remotion Player

中心播放器必须支持：

- 播放；
- 暂停；
- Seek；
- 当前时间显示；
- 总时长；
- frame 精确；
- 9:16；
- 16:9；
- 1:1；
- 缩放；
- Fit；
- 100%；
- Safe Zone；
- Caption Safe Zone；
- Face Safe Zone。

必须做到：

修改 Inspector 参数时无需整条视频重新 Render，即可实时 Preview。

---

# 7.4 Timeline

## V1 轨道

至少支持：

1. Video
2. Captions
3. Motion
4. B-roll
5. Audio

功能：

- Playhead；
- Seek；
- Clip 点击；
- Clip 拖动；
- 修改 start；
- 修改 end；
- 修改 duration；
- 删除；
- Duplicate；
- Timeline zoom；
- 自动滚动；
- Snap 到 playhead；
- Snap 到 clip boundary；
- 当前时间；
- 轨道锁定；
- 轨道隐藏。

V1 不做：

- 专业 Ripple Edit；
- Slip Edit；
- Roll Edit；
- 多层磁性剪辑。

---

# 7.5 Effect Library

分类：

```text
Text
Data
Number
Comparison
Process
Timeline
Map
CTA
Brand
Utility
HyperFrames
Favorites
My Assets
```

Effect Card 显示：

- thumbnail；
- 名称；
- 类型；
- Engine；
- tags；
- 收藏；
- preview；
- Add to Timeline。

---

# 7.6 Effect Registry

所有 Effect 必须统一注册。

目录：

```text
shared/effects/
├── registry.ts
│
├── remotion/
│   ├── BigNumber/
│   ├── MetricFocus/
│   ├── Comparison/
│   ├── LowerThird/
│   ├── CTA/
│   └── ...
│
└── hyperframes/
    ├── MapRoute/
    ├── FlowDiagram/
    └── ...
```

统一 metadata：

```json
{
  "id": "big-number",
  "name": "Big Number",
  "engine": "remotion",
  "category": "number",
  "version": "1.0.0",
  "tags": ["number", "metric", "days"],
  "thumbnail": "thumbnail.png",
  "component": "BigNumber",
  "schema": "schema.ts",
  "reusable": true
}
```

---

# 7.7 Schema Driven Inspector

这是 V1 最关键的工程能力之一。

目标：

> 新增 Effect 时，不允许每次重新写右侧控制面板。

所有 Effect 通过 Schema 描述参数。

示例：

```ts
export const BigNumberSchema = {
  title: {
    type: "text",
    label: "标题"
  },

  value: {
    type: "text",
    label: "核心数字"
  },

  suffix: {
    type: "text",
    label: "单位"
  },

  accentColor: {
    type: "color",
    label: "强调色"
  },

  animationStyle: {
    type: "select",
    options: [
      "count",
      "slide",
      "scale"
    ]
  },

  fontSize: {
    type: "number",
    min: 24,
    max: 240
  }
}
```

Inspector 自动映射：

```text
text → Input
textarea → Textarea
number → Number Input
slider → Slider
color → Color Picker
select → Dropdown
boolean → Switch
file → Asset Picker
```

---

# 7.8 HyperFrames Integration

每个 HyperFrames Asset 目录：

```text
shared/hyperframes/
└── map-route/
    ├── DESIGN.md
    ├── index.html
    ├── schema.json
    ├── metadata.json
    ├── preview.mp4
    ├── thumbnail.png
    └── render/
```

工作台支持：

- 浏览 HyperFrames Effect；
- 输入参数；
- Preview；
- Render；
- 添加到 Timeline；
- 生成透明 WebM；
- 缓存输出。

V1 可以先采用：

> 参数修改 → HyperFrames render → WebM 更新

不要求实现 HyperFrames 的真正实时 DOM 内嵌编辑。

---

# 7.9 Caption System

字幕必须是一级公民。

支持：

- 导入 SRT；
- 导入 VTT；
- JSON Caption；
- 修改字体；
- 大小；
- 行高；
- 位置；
- 背景；
- 描边；
- 阴影；
- 关键词强调；
- 数字强调；
- 当前词强调；
- 安全区；
- 最大行数；
- 最大字数。

V1 预设：

- Primary
- Minimal
- Bold
- Marketing
- Knowledge

字幕层必须始终位于大部分视觉 Overlay 上层，避免被遮挡。

---

# 7.10 B-roll

V1 支持：

- 导入 B-roll；
- 添加到 Timeline；
- Fit / Fill；
- opacity；
- position；
- scale；
- simple fade；
- mute；
- duration。

后续 V2 再做 AI B-roll 推荐。

---

# 7.11 CTA

内置 CTA：

- 私信咨询；
- 发送图纸；
- 预约；
- 获取报价；
- WhatsApp；
- Learn More；
- Download；
- Contact Us。

CTA 是独立 Effect 类型。

必须支持：

- 标题；
- 副标题；
- 按钮；
- Logo；
- 联系方式；
- QR；
- duration；
- entrance；
- exit。

---

# 7.12 Brand System

全局 Brand Config：

```json
{
  "theme": "dark",
  "primary": "#F5B800",
  "secondary": "#FFFFFF",
  "danger": "#E5484D",
  "positive": "#30A46C",
  "fontHeading": "Inter",
  "fontBody": "Inter",
  "captionPreset": "marketing",
  "motionPreset": "technical"
}
```

全局修改后：

- Remotion Effect 自动继承；
- 新 Effect 自动继承；
- CTA 自动继承；
- Caption 自动继承。

允许单个 Effect Override。

---

# 7.13 Global Controls

支持：

- Canvas Ratio；
- Theme；
- Global Font；
- Accent Color；
- Motion Speed；
- Effect Scale；
- Caption Scale；
- Video Scale；
- Background；
- Default Transition；
- Global Sound Level。

---

# 8. AI Visual Planner

V1 可以先作为独立按钮：

```text
AI Visual Plan
```

输入：

- transcript；
- SRT；
- EDL；
- project context；
- available effect registry。

输出：

```json
[
  {
    "id": "slot_001",
    "start": 12.4,
    "end": 16.2,
    "spokenText": "15天可以完成工厂生产",
    "purpose": "强化生产周期",
    "visualType": "number",
    "engine": "remotion",
    "effectId": "big-number",
    "confidence": 0.96,
    "props": {
      "value": "15",
      "suffix": "DAYS"
    }
  }
]
```

---

# 9. AI Visual Planner 规则

优先动画：

- 数字；
- 金额；
- 日期；
- 时间；
- 比例；
- 对比；
- 因果；
- 流程；
- 结构；
- 地理位置；
- Before / After；
- 产品核心能力；
- CTA。

避免动画：

- 普通过渡句；
- 情绪性句子；
- 无信息量的口播；
- 每句话都做 Effect；
- 纯装饰性动画。

规则：

```text
每 10 秒不建议超过 2 个强视觉事件。
```

真人脸必须拥有足够屏幕时间。

---

# 10. Project JSON Schema

核心 Project JSON：

```json
{
  "version": "1.0.0",

  "project": {
    "id": "aus-builder-001",
    "name": "Australia Builder Ad"
  },

  "canvas": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },

  "source": {
    "video": "input/talking-head.mp4"
  },

  "brand": {
    "theme": "construction-dark",
    "accentColor": "#F5B800"
  },

  "captions": {
    "source": "captions/master.srt",
    "preset": "marketing"
  },

  "tracks": [
    {
      "id": "video-main",
      "type": "video",
      "clips": []
    },

    {
      "id": "captions-main",
      "type": "caption",
      "clips": []
    },

    {
      "id": "motion-main",
      "type": "motion",
      "clips": []
    },

    {
      "id": "broll-main",
      "type": "broll",
      "clips": []
    },

    {
      "id": "audio-main",
      "type": "audio",
      "clips": []
    }
  ]
}
```

---

# 11. Motion Clip Schema

```json
{
  "id": "motion_001",

  "engine": "remotion",

  "effectId": "big-number",

  "start": 21.2,

  "duration": 3.8,

  "layer": 10,

  "enabled": true,

  "props": {
    "title": "FACTORY PRODUCTION",
    "value": "15",
    "suffix": "DAYS"
  },

  "style": {
    "x": 0,
    "y": 0,
    "scale": 1,
    "opacity": 1
  }
}
```

HyperFrames：

```json
{
  "id": "motion_002",

  "engine": "hyperframes",

  "effectId": "china-australia-route",

  "start": 35.2,

  "duration": 5.4,

  "renderedAsset": "animations/motion_002.webm",

  "props": {
    "from": "China",
    "to": "Australia",
    "days": 30
  }
}
```

---

# 12. Asset Registry

建立：

```text
ASSET_REGISTRY.md
asset-registry.json
```

示例：

```json
{
  "id": "HF-002",

  "name": "China Australia Route",

  "engine": "hyperframes",

  "category": "map",

  "status": "production-ready",

  "useCases": [
    "物流",
    "跨境",
    "运输周期"
  ],

  "inputs": [
    "from",
    "to",
    "days"
  ],

  "path": "shared/hyperframes/china-australia-route",

  "createdAt": "2026-08-19"
}
```

原则：

项目内验证成功的 Effect 才允许晋升到 Shared Library。

---

# 13. 本地目录结构

建议项目最终目录：

```text
video-os-studio/
│
├── README.md
├── SYSTEM.md
├── DESIGN.md
├── EDITING.md
├── CONTENT_RULES.md
├── ASSET_REGISTRY.md
│
├── package.json
├── next.config.ts
├── tsconfig.json
│
├── app/
│   ├── page.tsx
│   ├── studio/
│   └── api/
│
├── components/
│   ├── studio/
│   ├── player/
│   ├── timeline/
│   ├── inspector/
│   ├── library/
│   └── common/
│
├── store/
│   ├── project-store.ts
│   ├── timeline-store.ts
│   └── ui-store.ts
│
├── schemas/
│   ├── project.ts
│   ├── clip.ts
│   ├── effect.ts
│   └── asset.ts
│
├── remotion/
│   ├── Root.tsx
│   ├── MasterComposition.tsx
│   ├── tracks/
│   └── effects/
│
├── hyperframes/
│   ├── runner/
│   └── adapter/
│
├── video-use/
│   ├── adapter/
│   └── jobs/
│
├── lib/
│   ├── ffmpeg/
│   ├── filesystem/
│   ├── render/
│   ├── project/
│   └── registry/
│
├── shared/
│   ├── brand/
│   ├── remotion/
│   ├── hyperframes/
│   ├── captions/
│   ├── cta/
│   ├── transitions/
│   ├── sfx/
│   ├── music/
│   ├── broll/
│   └── icons/
│
├── templates/
│   ├── talking-head-ad/
│   ├── knowledge-video/
│   ├── product-demo/
│   └── case-study/
│
└── projects/
```

---

# 14. Remotion Component 规范

每个 Remotion Effect：

```text
BigNumber/
├── Component.tsx
├── schema.ts
├── defaults.ts
├── metadata.ts
├── thumbnail.png
└── README.md
```

禁止：

- 将业务数据写死；
- 将项目路径写死；
- 将品牌颜色写死；
- 每个项目复制一份 Component。

必须参数化。

---

# 15. HyperFrames Asset 规范

每个 HyperFrames Asset：

```text
MapRoute/
├── DESIGN.md
├── index.html
├── metadata.json
├── schema.json
├── thumbnail.png
├── preview.mp4
└── README.md
```

必须支持参数化输入。

禁止：

- 一个 Composition 绑定某一个项目；
- 文案写死；
- 时间写死；
- 色彩与 Brand System 完全脱离。

---

# 16. Render Pipeline

## Final Render

```text
project.json
      ↓
validate schema
      ↓
prepare assets
      ↓
render HyperFrames missing assets
      ↓
Remotion Composition
      ↓
audio mix
      ↓
render mp4
      ↓
video-use QA
      ↓
final.mp4
```

---

# 17. Overlay Render

支持：

```text
transparent WebM
```

输出：

- Remotion Motion；
- HyperFrames；
- CTA；
- Graphics；
- Caption（可选）。

不输出：

- A-roll；
- B-roll；
- Background。

用途：

- 剪映；
- Premiere；
- Final Cut。

---

# 18. video-use 集成

建立统一 Adapter。

输入：

```json
{
  "projectId": "",
  "videoPath": "",
  "mode": "rough-cut"
}
```

输出：

```json
{
  "duration": 0,
  "transcript": "",
  "wordTimings": [],
  "takes": [],
  "edl": []
}
```

Studio 不直接依赖 video-use 内部文件结构。

统一通过 Adapter。

这样未来 video-use 更新时，工作台无需重构。

---

# 19. HyperFrames Adapter

统一接口：

```ts
renderHyperFrame({
  effectId,
  props,
  width,
  height,
  fps,
  duration,
  output
})
```

Studio 不直接散落执行 HyperFrames CLI。

所有调用通过 Adapter。

---

# 20. Remotion Adapter

统一接口：

```ts
renderVideo({
  projectJson,
  output,
  quality
})
```

Preview 使用 Player。

Final 使用 Render API / CLI。

---

# 21. 状态管理

建议 Zustand。

核心 Store：

```text
projectStore
timelineStore
selectionStore
playerStore
uiStore
assetStore
renderStore
```

禁止把整个 Studio 所有状态都写进一个 Store。

---

# 22. Undo / Redo

V1 必须考虑基础 Undo / Redo。

支持：

- 修改 Effect；
- 移动 Clip；
- 删除 Clip；
- 添加 Clip；
- 修改全局样式。

可以使用 action history。

V1 不要求跨应用重启后的 Undo。

---

# 23. Auto Save

每次结构变化：

```text
500-1000ms debounce
```

写入：

```text
project.json
```

同时保留：

```text
project.backup.json
```

防止文件损坏。

---

# 24. 错误处理

必须覆盖：

- 文件不存在；
- Effect 不存在；
- HyperFrames render 失败；
- FFmpeg 失败；
- Remotion render 失败；
- JSON schema 不兼容；
- 项目版本过旧；
- 素材丢失；
- 视频格式异常；
- 字体丢失；
- Timeline 越界。

所有错误显示：

```text
错误原因
+
可能解决方案
+
Retry
```

禁止只显示：

```text
Unknown Error
```

---

# 25. V1 内置 Effect

第一版不要做 100 个。

先完成 12 个高频 Effect：

## Remotion

1. Big Number
2. Metric Focus
3. Keyword Impact
4. Comparison
5. Lower Third
6. Progress Bar
7. Quote
8. CTA
9. Punch In
10. Chapter Title

## HyperFrames

11. Process Flow
12. Map Route

这 12 个完成后再扩充。

---

# 26. V1 内置模板

至少 2 个：

## Talking Head Marketing

适合：

- 获客；
- 产品；
- 服务；
- B2B。

## Knowledge Talking Head

适合：

- 知识分享；
- 教程；
- 分析。

---

# 27. 开发阶段

# Phase 0 — Foundation

完成：

- 项目脚手架；
- 目录结构；
- Zod Schema；
- Project JSON；
- Store；
- Remotion 基础 Composition；
- 基础设计系统。

验收：

项目能启动。

---

# Phase 1 — Player

完成：

- Remotion Player；
- 视频导入；
- 视频播放；
- Seek；
- Ratio；
- Current Time；
- Project 保存。

验收：

导入任意 MP4 可以在 Studio 中播放。

---

# Phase 2 — Timeline

完成：

- 5 轨；
- Playhead；
- Clip；
- 拖动；
- resize；
- 删除；
- duplicate；
- zoom。

验收：

移动 Motion Clip 后 Player 对应位置实时变化。

---

# Phase 3 — Effect Registry

完成：

- Registry；
- 4 个 Remotion Effect；
- Library；
- Add to Timeline。

验收：

可以从左侧点击一个 BigNumber，插入当前 Playhead。

---

# Phase 4 — Inspector

完成：

- Schema Driven Inspector；
- Text；
- Number；
- Color；
- Select；
- Switch；
- Slider。

验收：

修改 BigNumber 内容，Player 实时刷新。

---

# Phase 5 — Captions

完成：

- SRT Import；
- Caption track；
- 3 个 Caption Preset；
- Keyword Highlight。

验收：

完整字幕与时间轴同步。

---

# Phase 6 — Render

完成：

- Remotion Final Render；
- Export UI；
- progress；
- success；
- failure；
- output directory。

验收：

输出可播放 MP4。

---

# Phase 7 — HyperFrames

完成：

- Adapter；
- HyperFrames Library；
- 2 个 Effect；
- render WebM；
- Timeline Overlay。

验收：

透明 WebM 正确覆盖在真人视频上。

---

# Phase 8 — video-use

完成：

- Adapter；
- ffprobe；
- transcription；
- rough cut；
- EDL import。

验收：

原始口播能够生成粗剪视频并进入项目。

---

# Phase 9 — AI Visual Planner

完成：

- transcript 输入；
- effect registry 输入；
- animation-slots.json；
- 自动加入 Timeline。

验收：

点击按钮后至少可以自动识别：
- 数字；
- 比例；
- 时间；
- CTA。

---

# Phase 10 — Asset Library

完成：

- Save As Preset；
- Promote to Shared；
- Favorites；
- Asset Registry。

验收：

一个项目中调整好的 Effect 可以在新项目直接使用。

---

# 28. MVP 验收用例

使用一条 60-90 秒真人口播视频。

必须完成：

1. 创建项目；
2. 导入口播；
3. 播放；
4. 导入 SRT；
5. 添加 Big Number；
6. 修改数字；
7. 调整位置；
8. 调整出现时间；
9. 添加 CTA；
10. 添加一个 HyperFrames Effect；
11. 添加 B-roll；
12. 导出 MP4；
13. 导出 Overlay；
14. 保存项目；
15. 重新打开项目；
16. 所有状态恢复。

---

# 29. 性能目标

V1：

- 1080x1920 预览流畅；
- Inspector 修改后 < 200ms 响应；
- Timeline 操作无明显卡顿；
- 项目 JSON < 10MB；
- 100 个 Clip 以内正常使用；
- Preview 不依赖 Final Render；
- Render 失败不能破坏项目。

---

# 30. UX 规则

必须：

- 不让用户接触代码；
- 所有复杂参数提供合理默认值；
- 高级参数折叠；
- Effect 拖入即可工作；
- 默认效果必须“能看”；
- 新项目 3 分钟内可以做出第一版视频。

禁止：

- 空白工作台；
- 首次打开几十个配置项；
- 所有设置都暴露；
- 把工程术语直接丢给普通用户。

---

# 31. Codex 开发规则

Codex 在开始任何开发任务前：

1. 阅读本 PRD；
2. 阅读 SYSTEM.md；
3. 阅读现有代码；
4. 检查已有组件；
5. 检查已有 Effect；
6. 检查现有 Schema；
7. 再决定是否新增。

开发原则：

```text
REUSE > MODIFY > CREATE
```

禁止：

- 大量重复组件；
- 巨型单文件；
- 写死路径；
- 写死品牌；
- 写死项目数据；
- 未验证直接引入复杂依赖；
- 修改已经稳定功能却没有回归测试。

---

# 32. Codex 每次开发输出

每次任务结束必须输出：

```text
完成内容
修改文件
新增文件
测试结果
已知问题
下一步
```

如果涉及 UI：

必须做浏览器验证。

如果涉及 Render：

必须做真实 Render 测试。

如果涉及 Schema：

必须测试旧项目兼容。

---

# 33. 测试要求

至少：

## Unit

- Schema；
- Store；
- Project serialization；
- Effect registry；
- timeline calculations。

## Integration

- Add Effect；
- Modify Effect；
- Save；
- Reload；
- Render。

## E2E

- 新建项目；
- 导入视频；
- 加 Effect；
- 导出视频。

---

# 34. Git 规则

建议：

```text
main
develop
feature/*
```

每完成一个 Phase：

- commit；
- tag；
- 写 CHANGELOG。

例如：

```text
v0.1-player
v0.2-timeline
v0.3-effects
```

---

# 35. 未来 V2

V2 可以加入：

- SQLite；
- AI B-roll 推荐；
- 多种 AI 模型；
- 自动字幕；
- 自动剪辑；
- 自动视觉设计；
- Effect Marketplace；
- Prompt → Effect；
- AI 自动改动 Timeline；
- Scene Agent；
- Batch Render；
- 多语言；
- 云同步；
- 分享项目；
- SaaS。

---

# 36. 未来 V3

V3 可以成为：

> AI Video Production Operating System

输入：

```text
口播视频
+
产品
+
目标用户
+
投放平台
```

系统自动：

```text
剪辑
↓
内容分析
↓
视觉规划
↓
动效匹配
↓
B-roll
↓
字幕
↓
音效
↓
CTA
↓
多版本
↓
批量 Render
```

用户只负责最终审核。

---

# 37. 最终产品定义

Video OS Studio 不是：

> 一个 Remotion Demo。

也不是：

> 一个简单视频播放器。

它是：

> 一个以真人口播为核心、以 AI 为导演、以 video-use 为视频理解和剪辑层、以 HyperFrames 为复杂 Motion Engine、以 Remotion 为最终 Composition Engine 的本地视频生产工作台。

核心资产不是单条视频。

核心资产是：

```text
Editing System
+
Effect Library
+
Brand System
+
Remotion Components
+
HyperFrames Blocks
+
Templates
+
AI Visual Planning Rules
```

每做一条视频，这套系统都应该变得更强。

---

# 38. 第一阶段开发指令

把本文件放到项目根目录后，可以直接向 Codex 输入：

```text
阅读根目录中的 Video_OS_Studio_V1_Master_PRD.md。

现在按照 PRD 开始开发 Video OS Studio。

要求：

1. 不要跳过架构设计；
2. 先检查当前项目现状；
3. 如果是空项目，从 Phase 0 Foundation 开始；
4. 严格按照 PRD 中的目录结构、Schema、模块职责开发；
5. video-use、HyperFrames、Remotion 必须通过 Adapter 解耦；
6. Remotion 是最终 Master Composition；
7. 所有 Effect 必须进入 Effect Registry；
8. Inspector 必须 Schema Driven；
9. 所有长期资产必须考虑复用；
10. REUSE > MODIFY > CREATE；
11. 每完成一个 Phase 必须实际测试；
12. 不要做到一半停下来询问下一步；
13. 在当前可执行范围内持续开发，直到遇到真正的外部阻塞；
14. 如果某个外部依赖暂时不可用，先实现接口、Mock 和其余不受影响模块；
15. 每完成一个阶段，输出：
   - 完成内容
   - 修改文件
   - 测试结果
   - 剩余问题
   - 下一阶段

现在开始执行 Phase 0。
```

---

# 39. 产品成功标准

当下面这个流程可以稳定跑通时，V1 即算成功：

```text
实拍口播
↓
创建项目
↓
导入视频
↓
导入字幕
↓
Remotion Player
↓
Timeline
↓
添加 Remotion Effect
↓
添加 HyperFrames Effect
↓
Inspector 修改
↓
保存
↓
Render MP4
↓
重新打开项目
↓
继续编辑
```

下一步才是：

```text
video-use 自动剪
+
AI 自动配动效
```

不要反过来。

先让工作台本身稳定，再逐步加入 AI 自动化。

---

# END
