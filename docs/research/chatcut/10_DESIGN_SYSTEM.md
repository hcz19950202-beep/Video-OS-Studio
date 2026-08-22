# 10 设计系统

## 视觉基线

ChatCut 使用深色、低装饰的桌面编辑器语言，编辑内容和状态优先于品牌装饰。

| Token / 模式 | 本地证据 |
| --- | --- |
| 主背景层级 | `#1e1e1e`、`#2d2d2d`、`#1a1a1a` |
| Accent | `#00d0d0` |
| 主文本 / 次文本 | `#fcfcfc` / `#888` |
| Panel tab 字号 | 12–13px |
| Header / Toolbar | 35px / 36px |
| 较大控制高度 | 44px |
| Radius | 0 / 2 / 4 / 8 / 20px；Dock tab 为 0 |
| 浮层阴影 | `0 8px 32px rgba(0,0,0,.5)` |

Evidence: `CONFIRMED_LOCAL_FILE` from renderer CSS。字体 bundle 出现 Inter、JetBrains Mono、Stack Sans Notch，以及多种 Caption 字体；本研究不复制或分发这些字体。

## 信息密度与层级

- Dock 和 Timeline 使用紧凑控件与小字号，减少垂直占用；
- Cyan accent 主要承担选中、活动、进度与交互反馈；
- Viewer 保留中性背景，让素材成为视觉中心；
- 圆角更多用于按钮、Chip、弹层，Dock 边界保持硬朗；
- 错误、等待、生成中、成功需要明确状态，不只依赖颜色。

前三项由 CSS 与 layout bundle 确认；对完整无障碍策略的判断为 `UNKNOWN`。

## Video OS 应借鉴而非复制的部分

可以借鉴紧凑密度、状态色职责、稳定间距层级和 Workspace 布局原则，但不应复制 ChatCut 的商标、图标、字体文件、组件代码或像素级页面。Video OS 应建立自己的 token 命名与品牌层，同时保持编辑器高密度和清晰 selection feedback。

## 建议的 Video OS token 分层

```text
foundation: color / typography / spacing / radius / shadow
semantic: surface / text / border / accent / danger / warning / success
component: dock / tab / timeline / inspector / agent / canvas
state: hover / active / selected / disabled / pending / error
```

## 未确认项

- 完整 hover/focus/disabled 对比度：`UNKNOWN`；
- 键盘焦点环与屏幕阅读器语义：`UNKNOWN`；
- Light theme：`UNKNOWN`；
- 设计 token 是否通过单一源生成：`UNKNOWN`。
