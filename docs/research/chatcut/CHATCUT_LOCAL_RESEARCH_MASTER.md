# ChatCut 本地研究总报告

## Executive Summary

本次在不读取用户私有项目、认证信息和账号数据的前提下，对 Windows 本地 ChatCut Desktop `0.2.15` 做了安装结构、产品信息架构、AI 工作流、Transcript、Timeline/Canvas、Assets、Inspector、Project/History/Export 与设计系统研究，并与 Video OS Studio V2.0.0 对照。

结论：ChatCut 的优势不只是功能数量，而是把 AI、选区引用、普通编辑、生成资产、恢复和导出放进同一持续工作台。Video OS V2 已具备更适合安全演进的 Project Schema、commands/transactions、AI plan/review/apply 与 Script/Scene/Caption 基础；下一步应先补连接这些能力的 UX 和状态机，不应立即复制云协作、市场和完整专业 NLE。

## 本地架构摘要

- Windows Electron desktop，产品版本 `0.2.15`；
- 主程序 `E:\ChatCut\ChatCut.exe`，资源 `resources/app.asar`；
- React `19.2.0`、`@chatcut/editor-core` `0.5.1`、SQLite、静态 FFmpeg/FFprobe；
- 集成 ACP、MCP、Codex ACP、Claude Agent ACP；
- renderer 分拆 Agent chat、App layout、Assets、Editor、Inspector、Project、Transcript 等 bundle；
- MCP 通过本地 stdio/IPC 暴露 tools list/call 与进度通知；
- 本地存在项目、资产、缓存、日志和认证数据目录，但本次未读取其私人内容。

Evidence: `CONFIRMED_LOCAL_FILE`。

## 产品架构

```text
Project
├─ Assets / Library / Generated Assets
├─ Timelines / Sequences
│  ├─ Tracks / Items / Captions / Effects / Transitions
│  └─ Viewer / Canvas / Inspector
├─ Transcript / Speakers / Text operations
├─ AI Agent / Skills / Selection references / Tool calls
├─ Undo / Redo / Versions / Sync state
└─ Render Jobs / Export
```

Agent 并非孤立聊天窗口：它能引用 Timeline、Asset、Time、Transcript 和 Canvas region，调用项目工具，把结果转成普通可编辑对象，并把付费生成置于明确许可状态机中。

## 对 Video OS 的五个关键发现

1. V2 command/transaction 是优势，应成为 AI、Inspector、Transcript 和外部 Tool 的唯一写入口。
2. AI Director 应从独立功能升级为 selection-aware Composer，但继续保留 review/apply gate。
3. Transcript 的下一步价值在 Speaker、重排和清晰恢复，不是继续增加孤立文本操作。
4. Assets 需要统一媒体池与 GeneratedAsset 状态，而不是为每个生成器建立单独页面。
5. Version 与 Render Job 比 Cloud collaboration 更适合作为近期可靠性投资。

## 推荐路线

- V2.1：AI Composer、可见 Agent 状态、Transcript Speaker/Restore、Inspector registry、Render Job。
- V2.2：Assets Bin、GeneratedAsset、Transcript reorder、基础 Transition、区间/字幕导出。
- V2.3：多 Timeline、Version snapshot、Crop/Mask/Effect Inspector、有限 Workspace persistence。
- V2.4：稳定 Tool surface、Project Skills、Library、Motion Graphic props、高级 Export 验证。
- Later：Cloud collaboration、Marketplace、专业色彩/HDR、完整第三方生态。

详细依据见 `11_CHATCUT_VS_VIDEO_OS.md` 和 `12_VIDEO_OS_REUSE_RECOMMENDATIONS.md`。

## 研究限制

- 当前会话没有可用的 Windows Computer Use 执行接口，因此没有安全地自动点击 ChatCut 或抓取运行态截图；
- 未使用 PowerShell SendKeys、鼠标注入或其他不受技能约束的替代方案；
- `screenshots/` 记录为 0 张，并保留建议的人工截图清单；
- Bundle 证据只能确认功能字符串、模块和状态，不等同于已验证每条交互；
- 未验证账号、Credits、云同步、协作、付费生成和实际导出品质；
- 未读取 auth token、Cookie、用户数据库、私人对话或素材。

凡未被本地文件或产品说明直接支持的结论均标为 `INFERRED` 或 `UNKNOWN`。
