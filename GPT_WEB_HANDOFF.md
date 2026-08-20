# Video OS Studio — 网页 GPT 开发交接说明

> 更新时间：2026-08-20（Asia/Shanghai）
> 用途：把当前仓库的真实进度、已经发生的改动、未完成事项和下一步执行要求交给网页 GPT。
> 这份文件是当前执行交接，优先于旧的 `GPT_WEB_START.md`。

## 1. 先给网页 GPT 的结论

这是一个已经完成 Foundation 和 V1 Acceptance Closure 的 Video OS Studio 项目：真实 MP4 导入、video-use 粗剪、字幕、时间线、Remotion/HyperFrames 动效、Visual Planner、Preset Library、最终 MP4 和 Chromium 原生透明 Overlay WebM 都已经在 Windows 浏览器中执行并留存证据。

当前不要重新搭脚手架，也不要从 Phase 0 或 Phase 1 重做。`LV-005`、`LV-006`、`LV-007` 和此前未勾选的 V1 checklist 已经收口；先阅读 `LOCAL_VALIDATION_V1.md` 的 Acceptance Closure 证据，未经用户提出新需求不要扩展 V1 功能。

用户希望网页 GPT 直接开发和验证，而不是只给一份方案。每个后续修复都要实际改代码、跑测试、启动浏览器验证、更新文档并提交 commit；只有遇到真正的外部依赖阻塞时才停下来说明。

## 2. 仓库和 Git 状态

- GitHub 仓库：<https://github.com/hcz19950202-beep/Video-OS-Studio>
- 可见性：`PUBLIC`（公开仓库）
- 默认分支：`main`
- 当前开发分支：`feature/phase-0-foundation`
- 当前 PR：<https://github.com/hcz19950202-beep/Video-OS-Studio/pull/1>
- Acceptance Closure 基线：`c06a43f`；本轮代码/验收提交与最终 CI run 会在推送后写回本节。
- 当前 PR 不要擅自合并到 `main`；继续在现有 feature 分支开发并推送即可。

### 最近的重要提交

| Commit | 内容 |
| --- | --- |
| `30470f9` | 记录最新公开 CI 验收通过（lint/typecheck/tests/build） |
| `34e22fb` | 修复 Remotion CLI、Webpack alias、HyperFrames Map Route，并记录真实 V1 本地验收 |
| `5596bd3` | 记录公开仓库 CI 验收通过，`CLOUD VERIFIED` 更新为 `PASS` |
| `86ddcc4` | 让内存文件系统在 Windows / Linux 下使用统一的路径规范化规则 |
| `ee50820` | 修复 Linux runner 所需的跨平台可选依赖锁文件 |
| `9702da8` | 完成 Windows Node 24 本地验收、项目 ID 安全校验、锁文件和环境基线修复 |

## 3. 当前验收状态

验收记录在 [`LOCAL_VALIDATION_V1.md`](LOCAL_VALIDATION_V1.md)。目前状态如下：

| Gate | 状态 | 证据 |
| --- | --- | --- |
| `CODE COMPLETE` | PASS | V1 代码、真实渲染修复和回归已完成 |
| `CLOUD VERIFIED` | PENDING | Acceptance Closure commit 推送后等待新的 GitHub Actions run |
| `LOCAL VERIFIED` | PASS | `LV-005` 精确媒体同步、全部剩余 checklist 和最终真实渲染均通过 |
| `PRD ACCEPTED` | PASS | V1 Acceptance Closure 的必要项全部通过 |
| `RENDER VERIFIED` | PASS | final MP4 通过；VP9 Overlay WebM 已用 Chromium 原生 `<video>` 棋盘格验证透明度 |

已经通过的自动检查：

~~~text
npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm run test       # 19 个测试文件，54 个测试全部通过
npm run build      # Next.js 16.3.1 production build 通过
~~~

上一基线的公开 CI 已通过安装、Lint、TypeScript、测试和生产构建。本轮 Acceptance Closure 的 GitHub CI 在提交推送后等待并写回 run ID；项目运行基线仍为 Node 24。

## 4. 已经完成了什么

### 4.1 工具链和环境基线

- Next.js App Router + React + TypeScript 已建立。
- Zustand、Zod、Remotion Player、Remotion 已接入。
- Node 基线统一到 24：`.nvmrc`、`package.json.engines`、GitHub Actions 均使用 Node 24。
- `package-lock.json` 已按 Linux x64 和 Windows 的可选依赖重新整理，公开 CI 可用 `npm ci` 干净安装。
- `.env.example`、`.gitignore` 和 `VIDEO_OS_DATA_ROOT` 的本地数据边界已建立。

### 4.2 项目数据模型

- `schemas/project.ts`：Project、Canvas、Track、版本号和项目 ID 校验。
- `schemas/clip.ts`：video、caption、motion、broll、audio 五种 discriminated clip 类型。
- `schemas/asset.ts`：项目相对 POSIX 路径和媒体资产校验。
- `lib/timeline/frames.ts`：秒与帧的转换、范围重叠、clamp 等 frame-based 工具。
- 所有项目 JSON 的内部时间基准是 frame；只有在 adapter 边界才转成秒。

### 4.3 项目命令和持久化

- `lib/project/commands.ts`：rename、set-duration、add-asset、add-clip、update-clip-timing、remove-clip。
- 每个 command 都经过 Zod 校验、更新 revision 和 updatedAt。
- `lib/project/factory.ts`：创建默认 5 轨项目。
- `lib/project/serialization.ts`：Project JSON 的序列化和反序列化边界。
- `lib/project/migrations.ts`：显式项目版本迁移框架。
- `lib/project/repository.ts`：create/load/save、原子写入和 `project.backup.json`。
- `adapters/filesystem.ts`：Node 文件系统 adapter 和内存 mock；内存路径已修复为跨平台一致。
- 项目 ID 拒绝 `..`、斜杠、反斜杠、盘符和隐藏路径，避免越出 `VIDEO_OS_DATA_ROOT`。

### 4.4 Store 和基础 UI

- `store/project-store.ts`：Project 状态和 command dispatch。
- `store/player-store.ts`：当前 frame 和播放状态。
- `store/selection-store.ts`：选中 clip 状态。
- `app/page.tsx`：Asset Library、Remotion Player、Inspector、Timeline 的 Phase 0 shell。
- `components/player/StudioPreview.tsx`：嵌入 Remotion Player，支持实际 Play / Pause / Seek。
- `remotion/MasterComposition.tsx`：最小 Master Composition，显示项目名、画布、fps 和当前 frame。

### 4.5 外部引擎边界

`adapters/contracts.ts` 已定义小而稳定的接口：

- `FfmpegAdapter`
- `RemotionRenderAdapter`
- `HyperFramesAdapter`
- `VideoUseAdapter`

`adapters/mocks.ts` 提供 mock / unavailable 实现。当前没有把 HyperFrames、video-use、FFmpeg CLI 的真实执行散落到 UI 里；后续必须继续通过 adapter 解耦。

### 4.6 测试和验证

- Schema、commands、migration、serialization、timeline、filesystem integration、video-use、render、planner、asset-library 都有测试。
- 本地浏览器已经真实执行：项目新建/打开、MP4/SRT 导入、比例、Player 控件、Timeline 拖动/resize/duplicate/delete、Inspector、字幕、HyperFrames、Preset、保存和重启恢复。
- 本地已经验证 FFmpeg / ffprobe、Remotion CLI、HyperFrames CLI 和 video-use adapter 的真实边界。
- 真实 MP4 和无声 Overlay WebM 已输出并保留；完整证据在 `LOCAL_VALIDATION_V1.md`，不要把 CI 通过说成替代 Windows 浏览器或渲染验收。

## 5. 与之前交接相比发生的变动

这些变动必须保留，不要回退：

1. **仓库已经公开**：不需要填写 Payment information；当前使用 GitHub Free + public repository，公开 CI 已通过。
2. **Node 从泛化的 22+ 改成 Node 24**：本地和 CI 都以 Node 24 为验收基线。
3. **锁文件已跨平台修复**：Linux runner 需要的 `@emnapi/core` / `@emnapi/runtime` 可选依赖已经写入正确层级。
4. **内存路径已跨平台修复**：不能重新改回只调用宿主机 `path.normalize()` 的写法；需要把 `/` 和 `\` 统一后用 POSIX 规则规范化。
5. **项目安全边界已加强**：Project ID 和资产相对路径不能允许路径穿越或机器绝对路径。
6. **`LOCAL_VALIDATION_V1.md` 已记录真实证据**：不要用“脚本存在”替代真实验证，也不要把 CI 通过当成 Windows 浏览器、HyperFrames 或视频渲染验收。
7. **Remotion CLI 调用已修复**：使用 `npx --yes --package @remotion/cli@4.0.506 remotion render ...`，并由 `remotion.config.js` 提供 `@` alias。
8. **HyperFrames Map Route 已修复**：GSAP `left` 改为 transform `x`，点位层级和可读性已调整；adapter 使用非弃用的 `check`。
9. **Overlay WebM 默认无音轨并使用 VP9**：render adapter 传 `--muted`、PNG 帧、`yuva420p` 和 `vp9`；Chromium 棋盘格实测透明区和实体区均正确。
10. **资产接口支持标准单 Range**：A-roll 预览依赖 `206`、`Content-Range` 和 `Accept-Ranges`；不要退回只返回完整 `200` 的实现。
11. **A-roll 使用 `<OffthreadVideo trimBefore>`**：`startFrom` 已移除；不要改回 deprecated API，也不要换成会让最终 CLI 渲染超时的 `<Video>`。
12. **当前 PR 保持打开**：网页 GPT 可以继续推送 feature 分支，但未经用户确认不要合并到 `main`。

## 6. Acceptance Closure 结果与非阻塞边界

- `LV-005` 已关闭：严格按原始 MP4 asset ID 选择 A-roll，排除 HyperFrames WebM；帧 75/149/150/300 的 native `currentTime` 与 EDL 公式误差小于 0.000001 秒。
- `LV-006` 已关闭：历史 VP8 文件在当前 Chromium 无法进入 metadata-ready；产线改为 VP9 后，原生 `<video>` 在 3 秒帧返回 `readyState=4`、1080x1920、无错误，红绿棋盘格在透明区透出、实体动画正常覆盖。
- `LV-007` 已关闭：`<Video trimBefore>` 导致最终 CLI 渲染超时；改为官方渲染安全的 `<OffthreadVideo trimBefore>` 后预览同步和最终 MP4 Retry 均通过。
- VTT、Minimal、Caption EDL remap、锁轨、Failed render + Retry、video-use timeline QA、Planner review/uncheck/apply、两类 Visual Slot、Star persistence 均已真实验收。
- HyperFrames doctor 的可选项仍是 `PARTIAL_ENV`（内存、Whisper/TTS/MusicGen/Docker）；required Process Flow/Map Route、lint/check/render、缓存复用均 PASS，所以不阻塞 V1 gate。
- ESLint 仍有两个已有 `<img>` warning；0 error，不阻塞 V1。

## 7. 下一步执行顺序

不要重新做 Phase 1，也不要扩展动效。V1 follow-up gate 已完成；下一步只做用户明确提出的新任务，或维护性缺陷修复。继续保持 `PARTIAL_ENV` 与 required feature PASS 分开记录。

当前完整执行链保持为：

~~~text
真实 MP4
→ video-use Transcribe + Pack
→ 确认并 Apply EDL
→ 字幕
→ Visual Planner（允许零 slots）
→ Timeline / Inspector
→ Remotion + HyperFrames
→ Save / Promote / Use preset
→ final MP4 + Overlay WebM
→ ffprobe + 帧检查
→ 重启并 reopen
~~~

### Phase 2 — Timeline

- 建立 Video、Captions、Motion、B-roll、Audio 五条真实轨道。
- 用现有 frame utilities 作为唯一时间计算来源。
- 支持 Playhead、选中 clip、移动 start、修改 duration、删除、duplicate、zoom。
- 修改 Timeline 后 Player 必须实时反映，不允许只改视觉假数据。

### Phase 3 — Effect Registry

- 先做 4 个 Remotion Effect，不要做 100 个。
- 建立统一 `metadata / schema / defaults / component / thumbnail` 结构。
- Library 点击 effect 后，在当前 Playhead 插入真实 Motion Clip。
- 第一批可选：Big Number、Metric Focus、Keyword Impact、Lower Third。

### Phase 4 — Schema-driven Inspector

- Inspector 从 Effect schema 自动生成控件。
- 至少支持 text、number、color、select、switch、slider。
- Inspector 修改必须实时更新 Player，并通过 command 更新项目状态。
- 测试新增 effect 时不需要重新写 Inspector 页面。

### Phase 5 — Captions

- SRT / VTT 导入。
- 字幕一级轨道和三个 preset。
- 关键词、数字强调和安全区。
- 确保字幕层在多数 visual overlay 之上。

### Phase 6 — Render

- 通过 Remotion adapter 做真实 MP4 render。
- 支持 render progress、success、failure、Retry、output directory。
- 用 ffprobe 检查输出可播放、时长、尺寸和 fps。
- 另做透明 Overlay WebM；完成后才把 `RENDER VERIFIED` 改成 PASS。

### Phase 7–10

按仓库中的 `Video_OS_Studio_V1_Master_PRD.md` 继续：

7. HyperFrames Adapter 和透明 WebM asset；
8. video-use Adapter、transcription、rough-cut、EDL、QA；
9. AI Visual Planner 和 Visual Slots；
10. Asset Registry、Favorites、Preset promotion、模板。

## 8. 给网页 GPT 的执行规则

开始编码前必须完整阅读：

1. `GPT_WEB_HANDOFF.md`（本文件）
2. `Video_OS_Studio_V1_Master_PRD.md`
3. `SYSTEM.md`
4. `README.md`
5. `AGENTS.md`
6. 当前实现和对应测试

然后遵守：

- `REUSE > MODIFY > CREATE`。
- 不要重置、覆盖或删除用户已有 commit。
- 不要把机器绝对路径写进 Project JSON。
- 不要让 UI 直接调用 FFmpeg、HyperFrames 或 video-use CLI。
- 不要把业务数据、品牌颜色、Effect 文案写死在组件里。
- 所有项目修改通过校验后的 Project Command；不要绕过 command 直接 mutate source of truth。
- 保持外部 adapter 接口小而稳定。
- 新功能必须有 unit / integration 测试；涉及 UI 必须实际启动浏览器验证。
- 涉及真实 Render 必须保留输出文件、ffprobe 结果和必要的画面证据。
- 不要提交 `.env.local`、token、API key、真实客户媒体或大体积缓存。
- 不要把“CI 通过”写成“Windows、浏览器、Render、HyperFrames 或 video-use 已验收”。
- 每完成一个 Phase 或 follow-up，更新 `LOCAL_VALIDATION_V1.md` 的 gate、证据、已知问题和下一步。
- 每完成一个 Phase，提交清晰 commit；继续在 `feature/phase-0-foundation` 或后续 feature 分支，不要未经确认合并 main。
- 遇到一个外部引擎不可用时，先实现 adapter、mock、错误状态和其余可验证模块，不要停在空计划上。

## 9. 每个开发阶段必须提交的结果

网页 GPT 每次完成一个可交付阶段时，回复并写入必要文档：

~~~text
完成内容
修改文件
新增文件
自动化测试结果
本地浏览器 / FFmpeg / Render 验证结果
已知问题与未验证边界
对应 commit 和 PR 状态
下一阶段
~~~

验收必须分开写：

~~~text
CODE COMPLETE
CLOUD VERIFIED
LOCAL VERIFIED
PRD ACCEPTED
RENDER VERIFIED（只有真实 render 时才填写）
~~~

## 10. 文档优先级和边界

- 用户当前要求：把仓库公开，并提供一份让网页 GPT 能继续开发的真实交接说明。
- 本文件：当前代码状态、执行上下文和下一步开发要求；真实 Windows 证据以 `LOCAL_VALIDATION_V1.md` 为准。
- `SYSTEM.md`：架构和数据边界的强约束。
- `Video_OS_Studio_V1_Master_PRD.md`：产品需求和 Phase 1–10 的目标；它不是让网页 GPT 忽略当前代码、直接重写全部项目的命令。
- `GPT_WEB_START.md`：早期 Phase 0 启动说明，原则仍可参考，但当前进度以本文件为准。
- `AGENTS.md`：Next.js 版本和仓库级 agent 规则。

如果不同文档出现冲突，先保留已有可验证功能，以 `SYSTEM.md` 的架构边界和本文件的当前状态为准，再提出最小变更。

## 11. 可以直接复制给网页 GPT 的启动指令

~~~text
你现在接手公开仓库 Video OS Studio。

请先完整阅读根目录的 GPT_WEB_HANDOFF.md、Video_OS_Studio_V1_Master_PRD.md、SYSTEM.md、README.md、AGENTS.md，然后检查当前分支 feature/phase-0-foundation、PR #1 和现有代码/测试。

当前事实：V1 Acceptance Closure 已在 Windows 真实浏览器和真实 MP4 上执行；Node 24 本地检查、19 个测试文件/54 个测试、production build、最终 MP4、Chromium 原生 VP9 alpha 棋盘格验证全部通过。不要重新搭脚手架，不要从 Phase 0/1 重做，也不要只输出计划。

现在先阅读 `LOCAL_VALIDATION_V1.md` 的 Acceptance Closure。`LV-005`、`LV-006`、`LV-007`、VTT、Minimal preset、EDL 字幕重映射、track lock、Retry、Planner 和 Star persistence 已完成；不要重复执行或回退。保留已经通过的真实 MP4 / Remotion / HyperFrames / video-use 链路。

要求：
1. 先检查现有实现再改动，遵守 REUSE > MODIFY > CREATE；
2. 不要让 UI 直接调用外部 CLI，不要写死绝对路径、品牌或项目数据；
3. 每个可验证功能都补 unit / integration 测试；
4. 涉及 UI 必须启动浏览器做真实点击验证；
5. 保持 npm run lint、npm run typecheck、npm run test、npm run build 通过；
6. 更新 LOCAL_VALIDATION_V1.md，区分 CODE COMPLETE、CLOUD VERIFIED、LOCAL VERIFIED、PRD ACCEPTED、RENDER VERIFIED；
7. 提交清晰 commit 并推送当前 feature 分支，但不要未经确认合并 main；
8. 每个 follow-up 完成后，输出完成内容、修改文件、测试/浏览器证据、已知问题、commit、PR 状态和下一步；不要把 PARTIAL 环境或未验证边界写成 PASS。
~~~

## 12. 重要链接

- 仓库：<https://github.com/hcz19950202-beep/Video-OS-Studio>
- PR #1：<https://github.com/hcz19950202-beep/Video-OS-Studio/pull/1>
- CI 状态（随 PR 更新）：<https://github.com/hcz19950202-beep/Video-OS-Studio/pull/1/checks>
- 产品 PRD：[`Video_OS_Studio_V1_Master_PRD.md`](Video_OS_Studio_V1_Master_PRD.md)
- 系统契约：[`SYSTEM.md`](SYSTEM.md)
- 本地验收：[`LOCAL_VALIDATION_V1.md`](LOCAL_VALIDATION_V1.md)
