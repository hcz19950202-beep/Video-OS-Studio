# 08 Inspector 与属性编辑

## 角色

Inspector 是右侧上下文属性面板，与当前 Canvas/Timeline selection 绑定。其价值在于让不同 Item 共享稳定的检查器框架，同时按类型装载专属属性，而不是给每种素材创建独立弹窗。

Evidence: `CONFIRMED_LOCAL_FILE` from `inspector-panel` bundle and editor selection events。

## 可确认的属性域

- 通用 Transform：位置、尺寸/缩放、旋转、对齐；
- Caption：文本、排版、样式及画布命中编辑；
- Audio：音量、Fade、Waveform 关联状态；
- Visual：Crop、Mask、Effect、Transition；
- Motion Graphic：可编辑 Props；
- Asset / Clip：源素材与 Timeline 实例之间的关联。

Evidence: `CONFIRMED_LOCAL_FILE`。每个控件的精确排列、默认值和是否支持批量编辑未通过运行界面确认。

## 推定交互原则

从 Canvas direct manipulation、Inspector bundle 和全局 selection 事件可推定：Canvas 拖动与 Inspector 数值输入写入同一底层属性，Timeline selection 决定 Inspector context。这是 `INFERRED`，具体 state ownership 未直接取得。

## Video OS 可复用结构

建议保留 Video OS V2 的 command/transaction 边界，引入按 Item capability 注册的 Inspector sections：

```text
Selection
  → Capability Resolver
    → TransformSection
    → TypographySection
    → AudioSection
    → EffectSection
    → SourceSection
  → Project Command
  → Undo/Redo + Persistence
```

这样可以复用命令、验证与 Undo，而不让 Inspector 直接修改项目 JSON。

## 未确认项

- 多选时的 mixed values 与批量写入：`UNKNOWN`；
- Property keyframe 按钮与曲线编辑：`UNKNOWN`；
- 参数搜索、收藏、预设保存：`UNKNOWN`；
- 第三方 Effect 动态注入 Inspector schema：`UNKNOWN`。
