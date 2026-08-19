# Video OS Studio — 网页 GPT 开发交接说明

> 更新时间：2026-08-20（Asia/Shanghai）
> 用途：把当前仓库的真实进度、已经发生的改动、未完成事项和下一步执行要求交给网页 GPT。
> 这份文件是当前执行交接，优先于旧的 `GPT_WEB_START.md`。

## 1. 先给网页 GPT 的结论

这是一个已经完成 Phase 0 Foundation、但还没有进入可用剪辑工作流的 Video OS Studio 项目。

当前不要重新搭脚手架，也不要从 Phase 0 重做。请从现有代码继续，下一阶段从 **Phase 1 — Player / Media Import / Project UI** 开始，并在实现后继续按 PRD 的 Phase 2 到 Phase 10 推进。

用户希望网页 GPT 直接开发和验证，而不是只给一份方案。每个阶段都要实际改代码、跑测试、更新文档并提交 commit；只有遇到真正的外部依赖阻塞时才停下来说明。

## 2. 仓库和 Git 状态

- GitHub 仓库：<https://github.com/hcz19950202-beep/Video-OS-Studio>
- 可见性：`PUBLIC`（公开仓库）
- 默认分支：`main`
- 当前开发分支：`feature/phase-0-foundation`
- 当前 PR：<https://github.com/hcz19950202-beep/Video-OS-Studio/pull/1>
- 当前 HEAD：`5596bd3 Record public CI acceptance`
- 当前 PR 不要擅自合并到 `main`；继续在现有 feature 分支开发并推送即可。

### 最近的重要提交

| Commit | 内容 |
| --- | --- |
| `5596bd3` | 记录公开仓库 CI 验收通过，`CLOUD VERIFIED` 更新为 `PASS` |
| `86ddcc4` | 让内存文件系统在 Windows / Linux 下使用统一的路径规范化规则 |
| `ee50820` | 修复 Linux runner 所需的跨平台可选依赖锁文件 |
| `9702da8` | 完成 Windows Node 24 本地验收、项目 ID 安全校验、锁文件和环境基线修复 |

## 3. 当前验收状态

验收记录在 [`LOCAL_VALIDATION.md`](LOCAL_VALIDATION.md)。目前状态如下：

| Gate | 状态 | 证据 |
| --- | --- | --- |
| `CODE COMPLETE` | PASS FOR PHASE 0 | Phase 0 代码、测试和基础 UI 已完成 |
| `CLOUD VERIFIED` | PASS | [公开 CI run 32277211452](https://github.com/hcz19950202-beep/Video-OS-Studio/actions/runs/32277211452) |
| `LOCAL VERIFIED` | PASS | Windows 10 + Node v24.19.0 + npm 11.6.2 |
| `PRD ACCEPTED` | PASS FOR PHASE 0 | Phase 0 范围已对照 PRD 检查 |
| `RENDER VERIFIED` | NOT APPLICABLE | 真实 MP4 / Overlay Render 尚未进入实现范围 |

已经通过的自动检查：

~~~text
npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm run test       # 6 个测试文件，29 个测试全部通过
npm run build      # Next.js 16.3.1 production build 通过
~~~

公开 CI 同样已经通过安装、Lint、TypeScript、29 个测试和生产构建。Actions 日志里的 Node 20 deprecation annotation 是 GitHub action 自身的提示，不是项目失败；项目运行基线已经统一为 Node 24。

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

- Schema、commands、migration、serialization、timeline、filesystem integration 都有测试。
- 本地浏览器验证过：页面启动、Player 播放、暂停和 Seek。
- 本地已经验证 FFmpeg / ffprobe 可用。
- 真实 HyperFrames alpha、video-use、最终 MP4 Render、Overlay Render 尚未验证，不要把 mock 或 CI 通过说成真实视频验收。

## 5. 与之前交接相比发生的变动

这些变动必须保留，不要回退：

1. **仓库已经公开**：不需要填写 Payment information；当前使用 GitHub Free + public repository，公开 CI 已通过。
2. **Node 从泛化的 22+ 改成 Node 24**：本地和 CI 都以 Node 24 为验收基线。
3. **锁文件已跨平台修复**：Linux runner 需要的 `@emnapi/core` / `@emnapi/runtime` 可选依赖已经写入正确层级。
4. **内存路径已跨平台修复**：不能重新改回只调用宿主机 `path.normalize()` 的写法；需要把 `/` 和 `\` 统一后用 POSIX 规则规范化。
5. **项目安全边界已加强**：Project ID 和资产相对路径不能允许路径穿越或机器绝对路径。
6. **`LOCAL_VALIDATION.md` 已记录真实证据**：不要用“脚本存在”替代真实验证，也不要把 Phase 0 的 mock 当成 Render 完成。
7. **当前 PR 保持打开**：网页 GPT 可以继续推送 feature 分支，但未经用户确认不要合并到 `main`。

## 6. 当前还没有完成的功能

现在的页面是 Foundation shell，不是可用剪辑器。以下功能尚未完成：

- Media Import：MP4、MOV、WebM、WAV、MP3、图片、SRT、VTT 的真实导入和 metadata / thumbnail。
- Project Manager UI：新建、打开、最近项目、重命名、保存、导入、导出和错误反馈。
- Player 控件：比例切换、当前时间、总时长、frame 显示、Fit / 100%、安全区。
- Interactive Timeline：5 轨、Playhead、clip 点击、拖动、resize、duplicate、删除、zoom、锁定和隐藏。
- Effect Registry：统一 metadata、分类、thumbnail、Add to Timeline、Favorites。
- Schema-driven Inspector：text、textarea、number、slider、color、select、boolean、file 控件自动映射。
- Caption System：SRT / VTT 导入、字幕轨、preset、关键词和数字强调。
- B-roll、CTA、Brand System、Global Controls。
- Remotion 真正的多轨 Master Composition；目前只有 Phase 0 占位内容。
- Remotion Final Render、Overlay WebM、导出 UI、进度、失败重试和 ffprobe 验证。
- HyperFrames Adapter、HyperFrames Library、两个可渲染的 HyperFrames effect。
- video-use Adapter、ffprobe / transcription / rough-cut / EDL / QA 的真实连接。
- AI Visual Planner 和自动 Visual Slots。
- Asset Registry、Save As Preset、Promote to Shared、模板系统。
- Undo / Redo、debounced autosave、完整错误处理和 E2E 流程。

## 7. 下一步执行顺序

严格按下面的顺序推进，不要一开始就做 AI Planner 或几十个动效：

### Phase 1 — Player、Media Import、Project UI

先完成这一阶段：

1. 建立本地 project manager 的最小 UI：新建、加载、保存、重命名、最近项目。
2. 增加 media import adapter 和 route / server boundary；UI 不直接执行 CLI。
3. 支持导入至少 MP4 和 SRT，并写入项目相对路径和资产 metadata。
4. 接入 ffprobe adapter，读取 duration、resolution、fps、audio。
5. 让 Player 真实渲染导入的视频，而不是只显示文字占位 Composition。
6. 加入 9:16、16:9、1:1 画布切换，以及当前时间、总时长和 frame 信息。
7. 保存项目时继续走 `ProjectCommand` + `ProjectRepository`，保留 atomic save 和 backup。
8. 对导入失败、文件不存在、格式异常显示原因、解决方案和 Retry。

Phase 1 验收：

~~~text
新建项目
→ 导入一个 MP4
→ 读取 metadata
→ 在 Remotion Player 播放 / Seek
→ 保存 project.json
→ 刷新或重新打开项目
→ 项目、素材和播放器状态恢复
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
- 每完成一个 Phase，更新 `LOCAL_VALIDATION.md` 的 gate、证据、已知问题和下一步。
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
- 本文件：当前代码状态、执行上下文和下一步开发要求。
- `SYSTEM.md`：架构和数据边界的强约束。
- `Video_OS_Studio_V1_Master_PRD.md`：产品需求和 Phase 1–10 的目标；它不是让网页 GPT 忽略当前代码、直接重写全部项目的命令。
- `GPT_WEB_START.md`：早期 Phase 0 启动说明，原则仍可参考，但当前进度以本文件为准。
- `AGENTS.md`：Next.js 版本和仓库级 agent 规则。

如果不同文档出现冲突，先保留已有可验证功能，以 `SYSTEM.md` 的架构边界和本文件的当前状态为准，再提出最小变更。

## 11. 可以直接复制给网页 GPT 的启动指令

~~~text
你现在接手公开仓库 Video OS Studio。

请先完整阅读根目录的 GPT_WEB_HANDOFF.md、Video_OS_Studio_V1_Master_PRD.md、SYSTEM.md、README.md、AGENTS.md，然后检查当前分支 feature/phase-0-foundation、PR #1 和现有代码/测试。

当前事实：Phase 0 Foundation 已完成；公开 CI、Windows Node 24 本地检查、29 个测试和 production build 都通过。不要重新搭脚手架，不要从 Phase 0 重做，也不要只输出计划。

现在开始执行 Phase 1：Player、Media Import、Project UI。实现真实的 MP4/SRT 导入、ffprobe metadata、项目新建/加载/保存、Remotion Player 播放和 Seek、比例/时间信息，并通过现有 Project Command、ProjectRepository 和 adapter 边界接入。

要求：
1. 先检查现有实现再改动，遵守 REUSE > MODIFY > CREATE；
2. 不要让 UI 直接调用外部 CLI，不要写死绝对路径、品牌或项目数据；
3. 每个可验证功能都补 unit / integration 测试；
4. 涉及 UI 必须启动浏览器做真实点击验证；
5. 保持 npm run lint、npm run typecheck、npm run test、npm run build 通过；
6. 更新 LOCAL_VALIDATION.md，区分 CODE COMPLETE、CLOUD VERIFIED、LOCAL VERIFIED、PRD ACCEPTED、RENDER VERIFIED；
7. 提交清晰 commit 并推送当前 feature 分支，但不要未经确认合并 main；
8. 完成 Phase 1 后，输出完成内容、修改文件、测试/浏览器证据、已知问题、commit、PR 状态和下一步，然后继续推进后续阶段，不要在只完成计划时停下。
~~~

## 12. 重要链接

- 仓库：<https://github.com/hcz19950202-beep/Video-OS-Studio>
- PR #1：<https://github.com/hcz19950202-beep/Video-OS-Studio/pull/1>
- 最新通过 CI：<https://github.com/hcz19950202-beep/Video-OS-Studio/actions/runs/32277211452>
- 产品 PRD：[`Video_OS_Studio_V1_Master_PRD.md`](Video_OS_Studio_V1_Master_PRD.md)
- 系统契约：[`SYSTEM.md`](SYSTEM.md)
- 本地验收：[`LOCAL_VALIDATION.md`](LOCAL_VALIDATION.md)
