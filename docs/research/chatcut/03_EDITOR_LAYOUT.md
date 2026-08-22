# 03 编辑器工作台布局

## 默认桌面比例

本地 bundle 暴露了以下布局常量：

| Region | Default / constraint | Evidence |
| --- | --- | --- |
| Desktop reference | 1440 × 880 | `CONFIRMED_LOCAL_FILE` |
| AI panel width | 约 34% | `CONFIRMED_LOCAL_FILE` |
| Media panel width | 约 24% | `CONFIRMED_LOCAL_FILE` |
| Timeline height | 约 34%，默认 300px | `CONFIRMED_LOCAL_FILE` |
| Timeline min height | 260px | `CONFIRMED_LOCAL_FILE` |
| Viewer min height | 300px | `CONFIRMED_LOCAL_FILE` |
| Viewer max width | 560px / 42% | `CONFIRMED_LOCAL_FILE` |
| Dock group min size | 100 × 100 | `CONFIRMED_LOCAL_FILE` |
| Portrait viewer width | 520px | `CONFIRMED_LOCAL_FILE` |
| Script timeline compact height | 140px | `CONFIRMED_LOCAL_FILE` |

## 典型布局

```text
┌──────────────────────────────────────────────────────────────────┐
│ Home / Project / Undo / Workspace / Versions / Export / Profile │
├─────────────┬───────────────┬────────────────────┬───────────────┤
│ AI Panel    │ Assets /      │ Preview / Canvas   │ Inspector     │
│ prompt      │ Library /     │                    │ contextual    │
│ plan/tools  │ Transcript    │                    │ properties    │
├─────────────┴───────────────┴────────────────────┴───────────────┤
│ Active Timeline selector / tools / ruler                         │
│ V tracks                                                         │
│ A tracks                                                         │
└──────────────────────────────────────────────────────────────────┘
```

## 面板行为

| Panel | Tabs | Resizable | Dockable | Selection behavior |
| --- | --- | --- | --- | --- |
| AI | Agent / Video Gen mode; Skills/settings in composer | Yes | Yes | consumes @ references |
| Media group | My Assets / Library / Transcript | Yes | Yes | selected asset or words can become AI references |
| Viewer | preview + direct manipulation | Yes | Yes | canvas hit-test selects visual/caption objects |
| Timeline | active timeline + tracks | Yes | show/hide; position persisted | clip/item selection, range, playhead, markers |
| Inspector | contextual by selected type | Yes | Yes | video/audio/image/caption/MG-specific forms |

Evidence: `CONFIRMED_LOCAL_FILE`. Exact min/max behavior at runtime is partially `UNKNOWN`.

## Layout 设计结论

1. AI 不是 modal，也不是单独页面，而是常驻 panel。
2. Transcript 打开时 AI 仍可保持在工作区；两者不是互斥页面。
3. Assets、Library、Transcript 共享空间，避免对 Preview/Timeline 造成横向挤压。
4. Inspector 保持 selection-driven，不承担项目导航。
5. Workspace layout 持久化，允许用户把工具组织成个人工作台。

## Video OS 启示

Video OS V2 已有左面板、Preview、Timeline、右 Inspector，但布局是固定三列，只有 Timeline 高度可调。V2.1 应优先把现有能力重新组织成可隐藏、可调整、可恢复默认的工作台，而不是先开发更多编辑功能。
