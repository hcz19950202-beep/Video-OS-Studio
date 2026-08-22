# 01 安装与桌面架构

## 安装事实

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| Product Name | ChatCut | `CONFIRMED_LOCAL_FILE` — EXE VersionInfo |
| Version | `0.2.15` | `CONFIRMED_LOCAL_FILE` — Registry、EXE、ASAR package.json |
| Executable | `E:\ChatCut\ChatCut.exe` | `CONFIRMED_LOCAL_FILE` |
| Main EXE size | 222,770,176 bytes | `CONFIRMED_LOCAL_FILE` |
| Main EXE SHA256 | `CAEC28F62A6BCEEF1CDEEFB2032791A641B29697237C2030ADFE220E90BC427B` | `CONFIRMED_LOCAL_FILE` |
| Main EXE signature | Windows Authenticode `NotSigned` | `CONFIRMED_LOCAL_FILE` |
| app.asar size | 215,810,099 bytes | `CONFIRMED_LOCAL_FILE` |
| app.asar SHA256 | `761138B5CE42904E77C6DB6319216536266DA4531B5F3D5DE5D31173D6F17188` | `CONFIRMED_LOCAL_FILE` |
| Start App ID | `io.chatcut.desktop` | `CONFIRMED_LOCAL_FILE` — Start Apps |
| Installer type | Electron Builder / NSIS-like all-users package | `INFERRED` — Uninstall EXE、`/allusers`、`app-update.yml` |

## 技术架构结论

ChatCut Desktop 是 Electron 应用，不是 Tauri 或原生 WinUI。

```text
ChatCut.exe / Electron Main
├── Preload IPC bridge
├── React 19 Renderer
│   ├── Dockview workspace
│   ├── AI / ACP chat
│   ├── Assets / Library / Transcript
│   ├── Viewer / Canvas
│   ├── Timeline
│   └── Inspector / Export / Versions
├── @chatcut/editor-core 0.5.1
│   ├── native preview / rendering bridge
│   ├── captions engine
│   ├── built-in transitions / effects
│   └── ONNX-backed local media helpers
├── FFmpeg / ffprobe
├── better-sqlite3 + Chromium storage/cache
├── ACP agents
│   ├── Codex ACP 1.4.0
│   └── Claude Agent ACP 0.69.0
├── MCP server 2.0 over stdio / local IPC
└── 19 bundled workflow skills
```

Evidence: `CONFIRMED_LOCAL_FILE` from `resources/app.asar/package.json`, ASAR file inventory, running process command lines and `resources/skills/manifest.json`.

## 关键包与能力

| Package | Version | Product meaning |
| --- | --- | --- |
| React / React DOM | 19.2.0 | Renderer UI |
| `@chatcut/editor-core` | 0.5.1 | 编辑、预览、字幕、转场、原生媒体核心 |
| `better-sqlite3` | 12.11.1 | 本地状态/队列/缓存 |
| `ffmpeg-ffprobe-static` | 6.1.2-rc.1 | 媒体探测与处理 |
| ACP SDK | 1.3.0 | Agent Client Protocol |
| MCP SDK | 1.29.0 | 外部 Agent / Tool 集成 |
| Codex ACP | 1.4.0 | Codex 桌面 Agent 适配 |
| Claude ACP | 0.69.0 | Claude Agent 适配 |

## 运行进程结构

运行时可观察到：主进程、GPU、Network Service、Renderer、Video Capture、Audio Service、Codex ACP adapter、Codex app-server 和 MCP server。Renderer 使用 `app` 自定义 scheme 加载 `app.asar`。

- Evidence: `CONFIRMED_LOCAL_FILE` — Windows 进程命令行
- 不读取进程内存、不注入、不停止进程

## 数据与持久化边界

`%APPDATA%\ChatCut` 包含本地 asset DB、agent outbox DB、ACP workspace、IndexedDB、Local Storage、Cache、logs 等。认证文件存在，但本轮未读取。

基于 bundle 中的 Project sync、pending writes、push/pull protocol、Version snapshot 和本地数据库，可以确认 ChatCut 采用“远端项目状态 + 本地缓存/队列/媒体源”的混合模型。具体 autosave 周期和冲突合并算法未运行态验证，标为 `INFERRED`。

## 安装包观察

- `app.asar` 顶层：`out/`、`resources/`、`node_modules/`、`package.json`、`build-provenance.json`
- build profile：production
- build source SHA：`badbcb9c0ef4d6ac4a5999c00eef6fd41271d81e`
- Electron/Chromium locale 共 55 个，包括 zh-CN、zh-TW、en-US、es 等
- 自动更新源：官方 `api.chatcut.io` desktop update endpoint

本地安装事实与内置产品帮助中“Windows 仍未开放下载”的旧描述不一致；以实际安装文件为准，文档该项应视为过期。
