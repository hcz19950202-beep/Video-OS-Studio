# 06 Timeline 与 Canvas

## Timeline 模型

ChatCut 的 Timeline 不是单序列轨道，而是项目内可创建、复制、隐藏、恢复和切换的多 Timeline / Sequence 模型。轨道至少覆盖 Video、Audio 和轻量内容轨；Item 类型包括视频、音频、Caption、Motion Graphic、Effect 与 Transition。

Evidence: `CONFIRMED_LOCAL_FILE`。

## 核心操作

- 拖放、移动、裁切、分割、复制、删除和多选；
- Snapping、Waveform、Marker、Fade、Zoom、In/Out zone；
- 活动 Timeline 切换与序列复制；
- Cross Dissolve、Wipe、Dip to Black、Flash、Luma Blend、Page Curl、Rack Focus、Whip Pan、Impact Shake、Anticipation Zoom 等内置转场。

Evidence: `CONFIRMED_LOCAL_FILE`。转场的逐项参数面板与渲染品质未做运行态验证，标为 `UNKNOWN`。

## Canvas / Viewer

Canvas 支持直接选择内容并执行拖动、缩放、旋转、对齐和吸附；还存在 Caption hit-test 与文本编辑、Crop、圆形/矩形 Mask、安全区、参考线、Golden line 和画布缩放相关实现。

本地常量提供了产品细节：吸附容差约 `8px`、Caption Golden line 偏移 `20px`、被动旋转吸附 `3°`、按住 Shift 时为 `15°` 步进。

Evidence: `CONFIRMED_LOCAL_FILE`。

## 时间线尺寸线索

| 项目 | 本地常量 |
| --- | ---: |
| 默认 Timeline 高度 | 300px |
| 最小高度 | 260px |
| Video track | 104px |
| Audio track | 72px |
| Lightweight track | 68px |
| Collapsed track | 24px |
| Waveform 最小高度 | 20px |
| Zoom | 0–1，步进 0.1 |

Evidence: `CONFIRMED_LOCAL_FILE`。这些是 bundle 常量，不保证每个 Workspace 状态都采用同一尺寸。

## 对 Video OS 的启示

Video OS V2 已有 Marker、Split、Waveform、Clip selection 与 Canvas direct manipulation，可复用现有命令层扩展交互。优先差距不是“再做一条时间线”，而是多 Timeline 生命周期、Transition/Mask/Crop 的统一 Item/Property 模型，以及 Canvas 与 Inspector 的同源 selection state。

## 未确认项

- 关键帧编辑器的完整 UI、曲线与插值类型：`UNKNOWN`；
- Ripple/Roll/Slip/Slide 等专业剪辑工具是否完整支持：`UNKNOWN`；
- 嵌套 Sequence 或 Compound Clip：`UNKNOWN`；
- GPU Preview 的降级策略和缓存淘汰规则：`UNKNOWN`。
