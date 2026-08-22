# 11 ChatCut 与 Video OS V2 对照

对照基线：Video OS Studio V2.0.0，commit `64da5ec6539a787f4d2f3750b3c5cea0273255ce`，Project Schema `2.0.0`。

| 能力 | ChatCut 0.2.15 | Video OS V2.0.0 | 判断 |
| --- | --- | --- | --- |
| Project model | 多 Timeline、active/hidden、版本与同步状态 | Schema 2.0、单核心项目工作流 | ChatCut 项目层更完整 |
| Timeline | 多序列、Transitions、Effects、丰富轨道交互 | Marker、Split、Waveform、Clip commands | Video OS 核心已成形，专业交互较少 |
| Transcript | 词级选择/删除、Speaker、文本重排线索 | Word Script、remove/restore、Scene/Caption 联动 | Video OS 数据契约强，ChatCut UX 更成熟 |
| Canvas | 直接操作、吸附、参考线、Crop/Mask | Direct manipulation、linked style | 可在现有 Canvas 上增量增强 |
| AI | 常驻 Agent、引用对象、Skills、计划/工具状态、generation guard | AI Director rules plan/review/apply | Video OS 安全执行基础好，缺日常交互壳 |
| Assets | Bin/Folder、Library、模板、生成状态 | Assets/B-roll/audio 与本地素材 | 缺统一媒体池状态与 Library |
| Inspector | 按 selection/context 的属性面板 | 已有属性编辑和命令层基础 | 适合做 capability-driven 重构 |
| History | Undo/Redo + Version snapshot | bounded Undo/Redo + transaction | 应先补显式版本，不急于云同步 |
| Export | Video/Audio/Graphics/Subtitles/XML | 本地 Render/Export 主线 | 先补 Render Job 与区间/字幕导出 |
| Collaboration | owner/member/share、remote sync 线索 | Local-first core | Later，非近期核心 |
| Extensibility | ACP/MCP、内置 Skills、Agent tools | 可接 Remotion/HyperFrames/video-use | Video OS 可围绕稳定 command API 开放 |

Evidence: ChatCut 列为 `CONFIRMED_LOCAL_FILE` 或文档中明确标记的推断；Video OS 列为 `CONFIRMED_LOCAL_FILE` from repository source/docs。

## 核心结论

Video OS 不需要复制 ChatCut 的整个桌面应用。V2.0 最有价值的资产是可验证 Project Schema、命令/事务、AI plan/review/apply 和 Script/Scene/Caption 关系；ChatCut 最值得借鉴的是把这些底层能力包装成持续可见、可引用、可恢复的工作台 UX。

## 主要差距排序

1. AI Composer 与 Selection reference 的统一入口；
2. Transcript 的 Speaker、文本重排与可见恢复 UX；
3. Assets/Bin/Generation 的统一状态机；
4. Inspector 与 Canvas 的同源 selection/property 架构；
5. 多 Timeline、Version、Render Job；
6. Collaboration、Cloud sync、丰富格式与生态扩展。

其中 1–3 直接提高 V2 核心可用性；5–6 不应挤占近期稳定性工作。
