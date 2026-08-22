# 02 UI 信息架构

## 一级结构

```text
ChatCut Desktop
├── Project Dashboard / Home
│   ├── Recent projects
│   ├── New project
│   └── Scenario starters
├── Editor
│   ├── Top Bar
│   ├── AI Panel
│   ├── Media Panel Group
│   │   ├── My Assets
│   │   ├── Library
│   │   ├── Templates
│   │   └── Transcript
│   ├── Preview / Canvas
│   ├── Timeline
│   └── Inspector / Properties
└── Global dialogs / menus
    ├── Export
    ├── Versions
    ├── Workspace
    ├── Keyboard shortcuts
    ├── Credits / Subscription
    ├── Agent Plugin
    └── Settings / Language / Skin
```

Evidence: `CONFIRMED_LOCAL_FILE` — bundled `ui-and-features.md`, renderer bundle names, Dockview configuration.

## Project Dashboard

- 打开后进入最近项目；无项目时创建空项目并进入 Editor。
- New Project 是显式入口。
- AI conversation 的空状态提供场景启动卡：Video Gen、App Promo、URL to Ad、Motion Graphics、Talking Head、Explainer 等。
- 场景卡的作用不是模板直接套用，而是向 AI composer 填入可编辑的 starter prompt。

运行态默认尺寸、hover、卡片密度：`UNKNOWN`，因为本轮无法安全调用 Windows UI 截图接口。

## Top Bar

左到右为：Home、Project Name、Share/Members、Undo/Redo、Workspace、Versions、Export、Credits、Profile。

产品层级非常清楚：

- Project navigation 与 editing operations 分离；
- Workspace 管面板，不混入内容属性；
- Versions 是用户主动的快照入口；
- Export 是正式交付边界；
- Credits/Profile 归入账号层。

## Workspace Menu

Workspace 可显示/隐藏 AI、My Assets、Library、Transcript、Timeline，并支持 Reset to default。Bundle 中存在 Dockview layout persistence key 和 panel minimum size，说明面板不仅是 CSS 显隐，而是持久化 dock layout。

- Dockable: `CONFIRMED_LOCAL_FILE`
- Resizable: `CONFIRMED_LOCAL_FILE`
- Layout persistence: `CONFIRMED_LOCAL_FILE`
- 运行态拖放限制和浮动窗口行为：`UNKNOWN`

## Media Panel Group

My Assets、Library、Transcript 共享同一 panel group，Transcript 被放在 group 最右侧。Templates 由 Library 内部入口或独立 browser 呈现。

这一组织方式减少左侧工具栏层级：用户在“自己的内容、平台内容、文本内容”之间切换，AI Panel 始终保持独立上下文。

## 信息架构判断

ChatCut 的主导航不是按“功能模块”拆页面，而是按编辑活动同时展示：

```text
Intent / AI
Context / Assets & Transcript
Result / Viewer
Structure / Timeline
Properties / Inspector
```

这是最值得 Video OS 学习的结构规律，但不应复制其视觉资产或品牌皮肤。
