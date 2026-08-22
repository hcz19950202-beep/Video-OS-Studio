# 07 Assets、Library 与生成

## My Assets

本地 bundle 显示 My Assets 是项目媒体池，而不是简单文件选择器。支持文件/文件夹/手机导入、Bin/Folder、搜索过滤、复制、重命名、移动、加入 Timeline、导出 Transcript 或 Motion Graphic、失败重试与渲染任务入口。

支持的资源类型包括 Video、Audio、Image、GIF、Motion Graphic、Effect、Transition、Font 与 SVG。

Evidence: `CONFIRMED_LOCAL_FILE`。

## Library

Library 与项目资产分开，承担模板、音效分类、Transition 与 Preset 的浏览和复用。内置 `builtin:zoom` 等标识说明系统同时存在可复用模板资源和项目实例。

Evidence: `CONFIRMED_LOCAL_FILE`。模板商城、付费层级和在线同步行为未验证，标为 `UNKNOWN`。

## Generation 管线

内置技能与 renderer/main IPC 证明 ChatCut 将以下能力纳入统一生成入口：

- Image / Video generation；
- TTS、Voice cloning、Sound effects；
- Music generation；
- Voice isolation；
- Motion Graphic generation；
- Shader / Effect / Transition / LUT / Mask；
- Multicam sync 与 Visual analysis。

生成请求包含进度、失败、取消和 generation guard；成功结果登记到媒体池，再由用户或 Agent 加入 Timeline。涉及可能消耗 Credits 的动作存在 Allow once / Allow all in project / Deny 控制。

Evidence: `CONFIRMED_LOCAL_FILE`。

## 状态模型

```text
REQUESTED → AWAITING_PERMISSION → QUEUED → GENERATING
                                      ├→ COMPLETED → ASSET_REGISTERED
                                      ├→ FAILED → RETRY
                                      └→ CANCELLED
```

具体服务商、模型路由、计费和上传保留期不属于本次研究范围。

## 对 Video OS 的启示

Video OS 已能承接本地素材和部分生成/渲染工作流，优先复用点应是“统一 GeneratedAsset 状态机”：所有生成器只负责产物，媒体池负责登记、去重、状态和失败恢复，Timeline 只消费稳定 Asset ID。不要在 V2.1 同时复制 ChatCut 的全部生成入口。

## 未确认项

- 资源去重依据是路径、hash 还是远端 ID：`UNKNOWN`；
- 代理文件、离线媒体与 relink UX：`UNKNOWN`；
- 生成模型的完整列表、价格和额度：`UNKNOWN`；
- Library 的在线/离线缓存边界：`UNKNOWN`。
