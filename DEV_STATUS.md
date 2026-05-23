# 简历编辑器 — 开发状态

**最后更新：** 2026-05-20 23:42

## 📁 项目位置
`20_PROJECTS/resume-editor/` | 本地: `http://localhost:5173`
线上: https://resume.guoxinling.cn | Vercel: guoxinlings-projects/resume-editor

---

## ✅ 已完成

### 部署
- ✅ Vercel 部署（vercel.json: vite framework）
- ✅ 自定义域名 resume.guoxinling.cn 已生效（AliDNS A 记录 → 76.76.21.21）
- ✅ 自动 SSL 证书签发

### 基础设施
- React 19 + TypeScript + Vite 脚手架
- Zustand 状态管理（resumeStore.ts + aiStore.ts）
- IndexedDB 草稿系统（Dexie.js, 2s 自动保存, v2 schema）
- 中英双语 i18n（zh.ts / en.ts）
- 表单验证（validateResume.ts）
- 设计系统（tokens: colors / typography / spacing → Tailwind 自定义类名）
- 数据迁移（migrateData — 旧数据安全升级到新 schema）

### 编辑器模块（8 内置 + 自定义）
| 模块 | 说明 |
|------|------|
| 个人信息 | 去 LinkedIn，求职意向紧跟 portfolio，自定义字段（key-value） |
| 个人概述 | 纯文本 + AI 润色按钮 |
| 自我评价 ✨ | 新增，纯文本 |
| 工作经历 | 公司/职位/时间 + textarea 逐条描述 + AI 润色 |
| AI 产品实践 | 3 列表格（产品/方向/描述），去技术栈列 |
| 教育背景 | 学校/学位/专业 + highlight 列表 |
| 专业技能 | 纯技能分类，去嵌套语言能力 |
| 语言能力 | 独立模块，从技能中剥离 |
| 自定义模块 ✨ | 用户自由命名，纯文本输入 |

### 编辑器功能
- 模块级 @dnd-kit 拖拽排序（紫色脉冲 drop indicator）
- 模块折叠/展开动画
- 模块增删 + 始终可见的「添加模块」按钮
- 自定义模块弹窗（输入中英文名称）
- 照片上传/移除

### 导出
- 📄 PDF（@react-pdf/renderer + Noto Sans SC）
- 🖼️ PNG（html2canvas 2x）

### Markdown 解析器（markdownParser.ts）
- ✅ 全模块覆盖 + 旧格式兼容
- ✅ 21/21 tests pass

### 预览
- 极简专业风预览 + A4 分页虚线标识
- 自定义字段、自我评价、自定义模块渲染
- ✅ 预览顺序跟随编辑器 sectionOrder（数据驱动渲染）

### 响应式适配
| 断点 | 布局 |
|------|------|
| ≥1024px 桌面 | 侧边栏编辑(480px fixed) + 预览 |
| <1024px 移动 | 全宽预览 + 底部弹出式编辑器(85vh) |
| 浮动按钮 | 右下角 ✎/✕ 切换编辑器显隐 |

### AI 功能（全部完成 ✅）

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1-3 | AI 面板框架 + 经历润色流式生成（STAR/结果导向/精炼压缩） | ✅ |
| Phase 4 | 岗位匹配分析 — 粘贴 JD → AI 匹配度 + 建议 | ✅ |
| Phase 5 | OCR 截图识别 — Tesseract.js 中英文混合识别 | ✅ |
| Phase 6 | 面试预测 — 基于简历生成 10 个面试问题 | ✅ |
| Phase 7 | AI 配置面板 — API Key/模型/预设管理 | ✅ |

### AI 面板 Tab
✨ 经历润色 | 🎯 岗位适配 | 💬 面试预测 | ⚙️ 配置

### 🔧 2026-05-19 修复（两轮 Wizard 测试）

**第一轮 — Wizard 对话体验优化**
- Prompt 优化：基础信息一次性收集、教育背景深挖（奖学金/竞赛/实践）
- 移除步骤序号显示（AI 估算不准导致跳动）
- 智能合并：applyExtracted 按公司/学校/项目名匹配已有条目，更新而非重复新建

**第二轮 — Wizard UX 打磨**
- 自动聚焦：AI 回复后自动 focus 输入框
- 多行输入：`<input>` → `<textarea>`，自适应高度，Shift+Enter 换行
- 隐藏原始 JSON：streaming 时显示「打字中」动画，不暴露 `/reply` 等代码
- 三阶段加载动画：扫描简历 → 分析结构 → 生成问题（脉冲图标 + 圆点进度）

**启动页 Bug 修复**
- LandingPage "第一次写简历" 按钮无反应 → App.tsx 传递 `onWizardClick` 回调

### 🔧 2026-05-20 修复

**PDF 导出同步 sectionOrder**
- `exportPdf.tsx` 重构：硬编码固定顺序 → 数据驱动 `sectionOrder`
- 与 `ResumePreview.tsx` 统一渲染策略：同一 `sectionHasContent` + 同一 `sectionOrder` 数据源
- section title 优先用户自定义标签 → fallback 默认值
- 验证：tsc 零错误 + vite build 成功

### UI/UX 优化

**Favicon 图标**
- 从纯白 📄 emoji → 紫色渐变文档 SVG（折角 + ✦ 星芒），白底可见

**AIPanel 布局平移（桌面端）**
- 打开 AI 面板 → 主内容区平滑左移 520px，简历完整可见
- AIPanel 改为 CSS transition（translate-x-full ↔ translate-x-0），不再 return null
- Backdrop 淡入淡出（opacity transition）
- 移动端保持浮层模式（屏幕太小无法平移）

### 🔐 安全

**API Key 硬编码泄漏修复**
- 泄漏源：`aiStore.ts` 默认值硬编码 `sk-9c476...`，推送到公开 GitHub
- 修复：默认值改为空字符串，从 Git 历史 force push 抹除
- 用户侧：DeepSeek 后台已撤销泄漏 Key
- 未来方案（待落地）：Vercel Serverless 后端代理 / 自建服务器 Express 代理

---

## ⏳ 待办

| # | 事项 | 优先级 |
|---|------|--------|
| 1 | 后端 API 代理（Vercel Serverless / 自建服务器） | 🔴 高 |
| 2 | 用户无需自带 Key 即可使用 AI 功能 | 🔴 高 |
| 3 | ~~PDF 导出同步 sectionOrder~~ ✅ (2026-05-20) | 已完成 |
| 4 | 响应式布局实测调优 | 🟢 低 |
| 5 | 自定义模块支持更多类型（列表、表格等，目前仅纯文本） | 🟢 低 |
| 6 | **新功能：简历诊断** — 上传简历+JD → 逐模块评分+改写+模块增减+能力补充 → 一键应用 | 🔶 产品设计阶段 |

## 🧪 验收状态

| 检查项 | 结果 |
|--------|------|
| `npm run dev` | ✅ 零报错 |
| `npx tsc --noEmit` | ✅ 零错误 |
| `npx vite build` | ✅ 构建成功（含 tesseract.js ~2MB） |
| `npx tsx test-parse.ts resume-optimized.md` | ✅ 21/21 pass |
| AI 面板 4 Tab | ✅ 润色/适配/面试/配置 |
| PDF 导出 | ✅ Noto Sans SC + 全字段 |
| PNG 导出 | ✅ 隐藏分页线 |
| 编辑器模块 DnD | ✅ 拖拽排序 + 增删 + drop 指示器 |
| AI 润色按钮 | ✅ 长文本框 ✨ → AI 面板 |
| 字段调整 | ✅ 去 LinkedIn + 去 Tech + 自定义字段 |
| 模块去重 | ✅ 专业技能 ⊥ 语言能力 |
| 新模块 | ✅ 自我评价 + 自定义模块 |
| 预览 order sync | ✅ 跟随 sectionOrder |
| 响应式 | ✅ 桌面侧栏 + 移动底部面板 |
| 岗位适配 API | ✅ DeepSeek JSON 输出 |
| OCR 截图识别 | ✅ Tesseract.js chi_sim+eng |
| 面试预测 API | ✅ 10 问题 JSON 输出 |
| AI 配置面板 | ✅ 密钥/地址/模型/预设 |
