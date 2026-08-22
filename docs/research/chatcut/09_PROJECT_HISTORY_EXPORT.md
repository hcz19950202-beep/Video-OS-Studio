# 09 Project、History 与 Export

## Project 与 Timeline 生命周期

ChatCut 项目支持多个 Timeline/Sequence，并保存 active/hidden 状态。Bundle 还包含项目 owner/member/share、local/remote sync、push/pull 与 pending writes 相关状态，说明项目层高于单一 Timeline。

Evidence: `CONFIRMED_LOCAL_FILE`。协作权限矩阵和冲突合并策略为 `UNKNOWN`。

## History

存在全局 Undo/Redo 与 Version snapshot save/restore；项目快照 schema 标识为 v2。Version 更接近显式恢复点，Undo/Redo 则承接当前编辑会话的细粒度操作。

Evidence: `CONFIRMED_LOCAL_FILE`。

顶部产品说明未显示传统手动 Save，结合本地 sync/pending write 状态，可推定项目持续保存，但精确 autosave 周期和崩溃恢复窗口为 `UNKNOWN`。

## Export

| 入口 | 已确认格式/选项 |
| --- | --- |
| Video | MP4；1080p / 720p / 480p；24–60fps；Full / Zone |
| Audio | MP3 |
| Graphics | ProRes 4444 MOV，Pro 功能 |
| Subtitles | 独立字幕导出入口 |
| XML | XML，可选 Motion Graphic ProRes |

Evidence: `CONFIRMED_LOCAL_FILE`。

Render IPC 包括 start、progress、complete、cancel 与 still，说明导出是可观察、可取消的异步任务。导出编码器参数、色彩管理和失败恢复未直接验证。

## Video OS 差距

Video OS V2 已有本地 render/export 主线，但主要围绕单项目核心交付。ChatCut 的可借鉴点是：

1. 将 Render Job 做成持久、可观察对象；
2. 将 Full/Zone、Video/Audio/Subtitle 分离为清晰的 export intent；
3. 明确 Undo、Version 与 Remote sync 三种不同恢复层级；
4. 多 Timeline 进入项目层，而非把所有内容塞进一个主序列。

## 未确认项

- Autosave 间隔与 crash recovery：`UNKNOWN`；
- Cloud sync 是否默认启用：`UNKNOWN`；
- XML 对应 Premiere、Final Cut 或其他方言：`UNKNOWN`；
- 硬件编码、Alpha、HDR、色彩空间选项：`UNKNOWN`。
