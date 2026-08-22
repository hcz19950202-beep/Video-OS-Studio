# 05 Transcript / Script 工作流

## 已确认机制

| Capability | Result | Evidence |
| --- | --- | --- |
| Word-level selection | Yes | `CONFIRMED_LOCAL_FILE` — Transcript editor selection/event strings |
| Word/sentence deletion | Yes | `CONFIRMED_LOCAL_FILE` — product help + deleted styling |
| Live struck-through preview | Yes | `CONFIRMED_LOCAL_FILE` |
| Segment reorder by drag | Yes | `CONFIRMED_LOCAL_FILE` — bundled product help |
| Speaker display | Yes | `CONFIRMED_LOCAL_FILE` |
| Speaker rename | Yes, double-click | `CONFIRMED_LOCAL_FILE` |
| Speaker reassignment | Yes | `CONFIRMED_LOCAL_FILE` |
| Transcript → AI reference | Yes | `CONFIRMED_LOCAL_FILE` — `chatcut:transcript-selected` |
| Timeline/player linkage | Yes | `CONFIRMED_LOCAL_FILE` — source-time mapping and active source track behavior |
| Filler/silence editing | Agent/skill-supported | `CONFIRMED_LOCAL_FILE` — transcription and talking-head skills |
| Caption linkage | Yes, but separate caption program/override model | `CONFIRMED_LOCAL_FILE` |

## Transcript 的定位

Transcript 是“文本编辑表面”，但现有证据不支持它是整个 Project 的唯一 source of truth。

更合理的模型是：

```text
Timeline media item / source track
  ↓ source-time mapping
Transcript rows / words / speaker metadata
  ↓ text edits or reorder
Timeline item mutations
  ↓
Viewer + Caption program update
```

Evidence level: `INFERRED`。Bundle 中存在独立 Timeline rows、Caption Program、Caption overrides、source-time anchors 和 transcript rows。

## 删除文字后的实现

UI 确认删除文本会从 Timeline 移除相应内容，但本轮无法确认内部最终采用：

- 单个 clip trim；
- source range EDL；
- flat clip rebuild；
- 多段 occurrence mapping。

因此“删除文字以后 Timeline 是 EDL 还是 clip rebuild”结论为 `UNKNOWN`。不要依据产品体验猜实现。

## Transcript 与 Caption

Transcript 跟随 active captions/source track；如果没有指定 source track，则使用第一个 video/audio track。Caption 在 bundle 中拥有独立 Program、Cue Plan、Cue Chunk、Card、Style/Content/Layout override 和 translation model。

结论：Transcript 与 Caption 有强同步关系，但不是简单共用同一个字符串字段。Evidence: `CONFIRMED_LOCAL_FILE`。

## 恢复与 Undo

- 全局 Undo/Redo：确认存在；
- Agent 编辑可通过普通编辑器继续修改：确认；
- Transcript 删除后的显式 Restore 按钮：`UNKNOWN`；
- 通过 Undo 恢复删除：`INFERRED`；
- Version snapshot 恢复整个项目：确认存在。

## 与 Video OS Script 的差异

Video OS V2 已有 word-level Script、Remove/Restore、A-roll rebuild、Script↔Player、Scenes 和 semantic tags；ChatCut 更强的是：

- speaker UX；
- drag reorder；
- AI reference selection；
- Transcript、Caption、Timeline 的成熟联动表面；
- Agent 执行过程中实时 strike-through / preview。

Video OS 不应放弃自己的 Scene/Meaning abstraction；应在 V2.1/V2.2 补齐交互与引用层。
