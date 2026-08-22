# 12 Video OS 分阶段复用建议

原则：复用产品机制，不复制 ChatCut 的代码、资源、品牌或页面；所有新交互继续经过 Video OS Project Schema、commands、transactions 与 validation。

## V2.1：把现有核心能力变成可持续使用的工作流

1. AI Command Bar / Composer：支持当前 Clip、Scene、Transcript selection、Canvas selection 引用。
2. Agent 可见状态：Plan、Review、Apply、Running、Success、Error、Retry；沿用现有安全 apply gate。
3. Transcript UX：Speaker rename/reassign、明确 Remove/Restore、搜索与定位。
4. Inspector capability registry：先统一 Transform、Caption、Audio 三类。
5. Render Job 状态：进度、取消、失败原因与重试。

验收重点：每个 AI/Inspector 操作必须落入可验证 command，Undo/Redo 可恢复，失败不产生半写入。

## V2.2：媒体池和序列生产效率

1. Assets Bin/Folder、搜索、过滤、失败/离线状态；
2. GeneratedAsset 生命周期与统一登记；
3. Transcript 文本段拖动重排，明确对 Scene/Clip 的事务映射；
4. Transition 基础模型与少量高频转场；
5. Export Full/Zone、Audio、Subtitle 分离入口。

验收重点：Asset ID 稳定、生成取消/失败可恢复、文本重排不破坏 Caption/Scene 关系。

## V2.3：多 Timeline 与版本

1. Project 内多 Timeline：create/duplicate/rename/hide/restore/set-active；
2. 显式 Version snapshot、命名、比较与恢复；
3. Inspector 扩展至 Crop/Mask/Effect/Transition；
4. Workspace layout persistence，但先提供官方布局模板，避免过早做任意 Dock 系统。

验收重点：Timeline 隔离、版本恢复完整、旧 Schema migration、重启后布局与 active Timeline 一致。

## V2.4：开放与高级工作流

1. 稳定的 Agent/Tool command surface；
2. Project-local Skills / workflow presets；
3. Library / reusable template package；
4. Motion Graphic property schema 与可编辑生成结果；
5. XML/Graphics 等高级 export 的需求验证版。

验收重点：权限边界、工具输入验证、第三方调用审计、模板兼容性。

## Later

- Cloud collaboration、owner/member/share；
- Remote sync 与冲突解决；
- 付费生成 marketplace；
- 多机代理/分布式渲染；
- 完整专业 NLE 工具集、HDR/色彩管理；
- 大规模第三方插件生态。

这些能力成本和状态复杂度高，当前没有证据证明应优先于本地核心体验。

## 前五项复用机会

1. Selection-aware AI Composer；
2. Transcript Speaker + Restore UX；
3. GeneratedAsset / Media Pool 状态机；
4. Capability-driven Inspector；
5. Render Job + Version snapshot。
