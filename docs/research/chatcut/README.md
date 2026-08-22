# ChatCut 本地产品研究

本目录记录对 Windows 本机 ChatCut Desktop `0.2.15` 的只读产品与 UI 研究，用于 Video OS Studio 后续产品规划，不包含 ChatCut 专有源代码、图片、字体或可复用实现。

## 研究边界

- ChatCut 安装路径：`E:\ChatCut`
- ChatCut 安装版本：`0.2.15`
- Video OS 对照基线：`origin/main` / `64da5ec6539a787f4d2f3750b3c5cea0273255ce`
- 只读证据：安装文件、`app.asar` 目录与少量功能字符串、manifest、内置产品说明、进程元数据、Video OS V2.0.0 源码与文档
- 未读取：认证文件、Cookie、Token、用户项目数据库内容、私人聊天、私人素材
- 未执行：付费生成、Credits 消耗、项目变更、发布、上传、ChatCut 二进制反编译

## 证据等级

| 标记 | 含义 |
| --- | --- |
| `CONFIRMED_UI` | 在运行界面直接观察到；本轮因 Windows Computer Use 接口不可用，没有新增此类证据 |
| `CONFIRMED_LOCAL_FILE` | 安装包、bundle、manifest 或本地产品说明明确存在 |
| `CONFIRMED_PUBLIC_DOC` | 官方公开文档明确说明 |
| `INFERRED` | 多个本地证据支持，但无法直接运行态确认 |
| `UNKNOWN` | 证据不足，不做猜测 |

## 交付索引

1. [安装与架构](01_INSTALLATION_AND_ARCHITECTURE.md)
2. [UI 信息架构](02_UI_INFORMATION_ARCHITECTURE.md)
3. [编辑器布局](03_EDITOR_LAYOUT.md)
4. [AI Agent 工作流](04_AI_AGENT_WORKFLOW.md)
5. [Transcript / Script](05_TRANSCRIPT_SCRIPT_WORKFLOW.md)
6. [Timeline 与 Canvas](06_TIMELINE_AND_CANVAS.md)
7. [Assets 与生成](07_ASSETS_AND_GENERATION.md)
8. [Inspector](08_INSPECTOR_AND_PROPERTIES.md)
9. [Project / History / Export](09_PROJECT_HISTORY_EXPORT.md)
10. [设计系统](10_DESIGN_SYSTEM.md)
11. [ChatCut vs Video OS](11_CHATCUT_VS_VIDEO_OS.md)
12. [Video OS 分阶段复用建议](12_VIDEO_OS_REUSE_RECOMMENDATIONS.md)
13. [总研究摘要](CHATCUT_LOCAL_RESEARCH_MASTER.md)

结构化清单位于同目录的四个 JSON 文件。运行态截图状态见 `screenshots/README.md`。
