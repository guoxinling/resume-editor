# 简历编辑器 — 开发状态

**最后更新：** 2026-05-25 12:47

## 📁 项目位置
`20_PROJECTS/resume-editor/` | `http://localhost:5173`

---

## ✅ 已完成

### 基础设施
- React 19 + TypeScript + Vite 脚手架
- Zustand 状态管理（resumeStore.ts + aiStore.ts + authStore.ts）
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

### 登录/点数/支付系统 ✨ 新增（2026-05-25 Codex 交付）

| 模块 | 说明 |
|------|------|
| Supabase Auth | 邮箱注册/登录，JWT token 管理 |
| 点数系统 | 新用户注册送 20 点，按 feature 差异化扣点 |
| 支付 | ZPay 聚合支付（支付宝/微信），入门包¥9.9/进阶包¥19.9/专业包¥39.9 |
| 点数扣费 | wizard(1点) / polish(1点) / adapt(3点) / interview(3点) / translate(3点) / import_parse(5点) |
| 退款保护 | DeepSeek 调用失败自动返还点数 |

**后端 API（Vercel Serverless Functions）**

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | AI 对话（需登录+扣点，支持 stream） |
| `/api/credits/balance` | GET | 查询点数余额+流水 |
| `/api/pay/create-order` | POST | 创建支付订单 → 返回 ZPay 支付链接 |
| `/api/pay/notify` | GET/POST | ZPay 异步回调（验签+发点） |
| `/api/pay/return` | GET | 支付完成同步跳转 |

**新增前端文件**

| 文件 | 说明 |
|------|------|
| `src/store/authStore.ts` | 登录态、点数余额、auth/credit modal 状态管理 |
| `src/services/supabaseClient.ts` | Supabase 客户端（可选配，未配置时降级提示） |
| `src/components/auth/AuthModal.tsx` | 登录/注册弹窗（邮箱+密码） |
| `src/components/auth/CreditModal.tsx` | 充值弹窗（3 档套餐+支付宝/微信选择） |
| Toolbar 登录入口 | 未登录显示「注册/登录」，登录后显示点数+退出 |
| App.tsx 支付回调 | 检测 `?payment=success` → 刷新余额 |

**数据库（Supabase）**

| 表 | 说明 |
|------|------|
| `profiles` | 用户信息（id, email） |
| `credit_accounts` | 点数余额（balance, user_id 唯一） |
| `credit_ledger` | 点数流水（delta, balance_after, reason, feature, ref_id） |
| `payment_orders` | 支付订单（package_id, amount_cents, status, provider） |

**RPC 函数**
- `handle_new_user()` — 注册触发器：自动创建 profile + credit_account + 注册送 20 点
- `spend_credits()` — 扣点（`FOR UPDATE` 行锁防并发）
- `grant_credits()` — 发放点数

**环境变量**（`.env.example`）
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — 前端 Supabase
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — 后端 Supabase（Service Role）
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` — AI 服务
- `ZPAY_PID` / `ZPAY_KEY` — ZPay 支付参数
- `APP_BASE_URL` — 应用基础 URL（回调用）

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

---

## ⏳ 待办

| # | 事项 | 优先级 |
|---|------|--------|
| 1 | 投递追踪看板（路径2 Phase 1） — 规格书已出 | 🔴 高 |
| 2 | 配置 Supabase + Vercel 环境变量，实测登录/支付 | 🔴 高 |
| 3 | `refundCredits` 幂等保护加固 | 🟡 中 |
| 4 | PDF 导出同步 sectionOrder | 🟡 中 |
| 5 | 响应式布局实测调优 | 🟢 低 |
| 6 | 自定义模块支持更多类型（列表、表格等） | 🟢 低 |

## 🧪 验收状态

| 检查项 | 结果 |
|--------|------|
| `npm run dev` | ✅ 零报错 |
| `npm run build`（tsc + vite） | ✅ 零错误（仅 chunk warning） |
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
| AI 调用鉴权+扣点 | ✅ 6 feature 全部贯通 |
| 登录/注册弹窗 | ✅ 邮箱+密码，Supabase 可选配 |
| 点数充值弹窗 | ✅ 3 档套餐 + 支付宝/微信 |
| 支付流程 | ✅ 下单→ZPay→回调→发点（待实测） |
| vercel.json rewrites | ✅ 已修复 API 路由 |
