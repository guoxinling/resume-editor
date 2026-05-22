# CODEX_HANDOFF.md — 简历鸭 交接文档

> **日期**：2026-05-22 19:27  
> **状态**：工作区脏，需建立迁移基线  
> **创建者**：小太阳 ☀️（AI 助手）

---

## 一、Git 状态快照

```
唯一 commit: 7e99d41 "Resume Editor - AI-powered resume builder"
所有改动未提交，工作区是脏的。
```

### 已修改文件 (13)

| 文件 | 改动内容 | 来源 |
|------|---------|------|
| `DEV_STATUS.md` | 新增 P0 产品化记录（Header/品牌/点数） | 小太阳 |
| `index.html` | title 改为「简历鸭 🦆 — AI简历编辑器」 | 小太阳 |
| `src/App.tsx` | 路由逻辑微调（待确认具体变更） | 历史上多次迭代 |
| `src/components/LandingPage.tsx` | Logo 📄→🦆 | 小太阳 |
| `src/components/Toolbar.tsx` | **完整重写**：12按钮→5元素 + 点数徽章 + 菜单下拉 | 小太阳 |
| `src/components/ai/AIPanel.tsx` | AI面板交互优化（待确认范围） | Codex + 小太阳 |
| `src/components/ai/JDAdapt.tsx` | JD匹配分析（待确认范围） | Codex |
| `src/i18n/zh.ts` | appTitle→「简历鸭」 | 小太阳 |
| `src/i18n/en.ts` | appTitle→「Jianliya」 | 小太阳 |
| `src/services/prompts.ts` | 提示词调整（待确认范围） | Codex + 小太阳 |
| `src/store/aiStore.ts` | API Key 清空（安全修复） + 可能其他改动 | 小太阳 |
| `src/types/ai.ts` | 类型定义调整（待确认范围） | 不详 |
| `src/utils/exportPdf.tsx` | sectionOrder 数据驱动渲染 | 小太阳 |

### 新增文件 (9)

| 文件 | 用途 | 是否保留 |
|------|------|---------|
| `IA_SPEC.md` | 全量信息架构规格书（13KB） | ✅ 保留 |
| `src/store/creditsStore.ts` | 点数系统（Zustand + localStorage） | ✅ 保留 |
| `public/favicon.svg` | 紫色渐变文档图标 | ✅ 保留 |
| `design/diagnosis-report-demo.html` | 诊断报告预览demo | ⚠️ 参考 |
| `design/homepage-material-you.html` | 新首页设计稿（用户创建） | ⚠️ 参考 |
| `design/ia-pages-material-you.html` | IA三页原型（Codex生成） | ⚠️ 参考 |
| `prototype/jianliya-codex-prototype.html` | IA三页交互原型（已修复品牌+CTA） | ⚠️ 参考 |
| `prototype/material-you-preview.html` | 早期预览测试 | ❌ 可删 |
| `prototype/ai-features.html` | AI功能原型 | ⚠️ 参考 |

---

## 二、当前已完成（P0 产品化）

### ✅ 品牌化
- 产品名：**简历鸭**（Jianliya）
- 域名：jianliya.app（待注册）/ resume.guoxinling.cn（当前）
- Logo：🦆 emoji 占位 + 紫色渐变背景
- 标语：「简历还没简历鸭？」
- 已在 `zh.ts`、`en.ts`、`index.html`、`LandingPage.tsx` 替换

### ✅ Header 精简（Toolbar.tsx）
- 12 个独立按钮 → 5 个元素
- 布局：`[🦆 简历鸭] [← 返回] [简历名▾ 下拉菜单] ... [🔋 7/10] [EN] [⬇ 导出▾] [💬 AI]`
- 文件操作（保存/草稿/导入/新建）→ 简历名下拉菜单
- 导出 PDF/PNG → 合并为导出下拉
- AI 按钮两种状态（关闭=浅色描边 / 打开=紫色实心）

### ✅ 点数系统（creditsStore.ts）
- 每日免费 10 点（date-based 自动刷新）
- 已购点数叠加
- 消耗逻辑：先扣免费额度，再扣已购
- 3 色徽章：蓝(>5) / 黄(3-5) / 红(≤3)
- localStorage 持久化，key: `jianliya-credits`

### ✅ 代码质量
- `npx tsc --noEmit`：零错误
- `npx vite build`：构建成功（1.55s）

---

## 三、未提交改动风险评估

### 🟡 中风险
- **Toolbar.tsx**：完整重写，如果回退会丢失所有品牌/点数/菜单功能
- **IA_SPEC.md**：编码损坏（中文显示为 `�`），可能由 PowerShell 管道导致

### 🟢 低风险
- LandingPage.tsx、index.html、zh.ts、en.ts：改动小、可复现
- creditsStore.ts：独立文件，无耦合

### ⚠️ 待确认
- App.tsx、AIPanel.tsx、JDAdapt.tsx、prompts.ts、aiStore.ts、ai.ts 的具体改动内容
- 这些改动的来源（Codex？小太阳？时间？）需要逐文件 diff 确认

---

## 四、产品决策清单

### ✅ 已决策

| # | 事项 | 结论 |
|---|------|------|
| 1 | 产品名称 | 简历鸭 🦆 |
| 2 | 域名 | jianliya.app（优先）/ resume.guoxinling.cn（当前） |
| 3 | 登录方式 | Plan A: Magic Link 邮箱（无密码） |
| 4 | 商业化模式 | 点数制：免费10点/天 + 付费包 |
| 5 | 点数定价 | 50点/¥9.9、200点/¥29.9、500点/¥59.9 |
| 6 | AI 模型 | DeepSeek V4 Pro（通过 Vercel 代理） |
| 7 | API 架构 | Vercel Serverless Function 代理 → DeepSeek |
| 8 | 设计语言 | Material You，indigo→purple 渐变 |
| 9 | 模板市场 MVP | 4-8 套，CSS + 模块顺序，不改数据结构 |
| 10 | 免费水印 | A4 右下角 #999 30% 透明度 |
| 11 | 目标用户 | 2-8年职场人，隐私敏感，中英双语 |
| 12 | 开源策略 | 不开源，保留商业价值 |
| 13 | 开发方式 | 小太阳为主要开发者，Codex 出设计稿 |
| 14 | 文件处理 | 必须用 Node.js（禁用 PowerShell 写入 UTF-8） |
| 15 | Logo | emoji 🦆 占位，上线前替换 |
| 16 | 后端 | Supabase Auth + PostgreSQL |
| 17 | 邮件 | Resend SMTP 挂到 Supabase |
| 18 | 支付 | 暂不做，备案后接入 |
| 19 | 无登录 | 允许，完整功能+水印+点数限制 |
| 20 | 备案 | 国内备案 |
| 21 | 隐私政策 | AI 生成模板 |
| 22 | 模板数量 | 8 套（名称待定） |
| 23 | 开发顺序 | 先 P1 前端（首页/Dashboard），再 P2 后端 |

### ❓ 待决策 → ✅ 已确认（2026-05-22 20:00）

| # | 事项 | 结论 | 备注 |
|---|------|------|------|
| 1 | **Logo 方案** | emoji 🦆 占位 | 上线前找设计师替换 |
| 2 | **后端选型** | **Supabase**（Auth + PostgreSQL） + Vercel（前端托管 + AI API 代理） | Supabase 内置 Magic Link，外接 SMTP 发邮件 |
| 3 | **邮件服务** | **Resend**（SMTP 挂到 Supabase） | 100封/天免费，中国用户量大后切阿里云 |
| 4 | **支付接入** | **暂不做** | 等备案通过后再接支付宝/微信 |
| 5 | **无登录使用** | **允许**（完整功能 + 带水印导出 + 每日点数限制） | 降低使用门槛，不强制登录 |
| 6 | **备案方案** | **国内备案** | 域名备案后再上支付 |
| 7 | **隐私政策** | **AI 生成模板** | 上线前生成 |
| 8 | **AI 模型** | **DeepSeek V4 Pro** | 通过 Vercel Function 代理调用 |
| 9 | **模板数量** | **8 套** | CSS + 模块顺序，不改数据结构 |
| 10 | **开发顺序** | **先前端，后后端** | P1 首页/Dashboard → P2 后端代理/登录 |

---

## 五、开发优先级建议

### P0：迁移基线（现在就做）
```
□ 1. git stash 或 commit 当前所有改动（建立基线）
□ 2. 修复 IA_SPEC.md 编码损坏
□ 3. 清理 prototype/ 目录（删除不需要的文件）
□ 4. 删除旧 LandingPage.tsx（星空深色版）
□ 5. 创建新首页占位组件（引用 homepage-material-you.html 设计稿）
```

### P1：产品化前端（1-2周）
```
□ 1. 新首页 — 按 homepage-material-you.html 实现 React 组件
     · Hero（窗口mockup + 双按钮 + 能力chip）
     · Features（3×2 卡片网格）
     · Templates（4 卡片精选 + 标签）
     · 底部 CTA（紫色面板）
□ 2. Dashboard — 简历列表页（编辑器入口之前）
□ 3. AI 面板重构 — 4 Tab → 对话+胶囊混合模式
□ 4. 导出水印 — PDF/PNG 免费版添加「由简历鸭 AI 生成」
□ 5. 面试预测升级 — 添加 suggestedAnswer 字段
```

### P2：后端（2-3周）
```
□ 1. Vercel Serverless API 代理（/api/chat → DeepSeek）
□ 2. Supabase 项目初始化 + Magic Link 登录（外接 Resend SMTP）
□ 3. 云端同步（登录后多端）
□ 4. 模板市场完整开发（8 套）
□ 5. 点数付费功能（ui 入口保留，支付逻辑等备案后接）
```

### P3：打磨（持续）
```
□ 1. 响应式实测调优（移动端/平板）
□ 2. 自定义模块扩展（列表/表格）
□ 3. DnD 模块拖拽优化
□ 4. 无障碍 + i18n 完善
```

---

## 六、技术债务 & 已知问题

| # | 问题 | 严重度 | 修复建议 |
|---|------|--------|---------|
| 1 | ~~IA_SPEC.md 中文编码损坏~~ | 🟢 已修复 | 2026-05-22 Node.js 重写，验证零损坏 |
| 2 | API Key 泄漏遗留（已修复但force push残留） | 🟢 低 | Key 已撤销，GitHub 仓库已清理 |
| 3 | 工作区脏，无法区分"要的改动"和"污染" | 🟡 中 | 见第五步 P0#1 |
| 4 | prototype/ 和 design/ 目录有 6 个 HTML 文件 | 🟢 低 | 冗余但可作参考，P0#3 清理 |
| 5 | LandingPage.tsx 仍是旧的深色主题 | 🔴 高 | 需要替换为 Material You 浅色首页 |
| 6 | AIPanel.tsx 仍是 4 Tab 模式 | 🟡 中 | 需要改为对话+胶囊混合 |
| 7 | 用户仍需配 API Key 才能用 AI | 🔴 高 | 依赖 P2 #1 后端代理 |
| 8 | PowerShell UTF-8 编码问题反复出现 | 🟡 中 | 已记录纪律：文件写入只用 Node.js |

---

## 七、文件映射：参考 → 产物

| 设计参考 | 对应的开发产物 | 状态 |
|---------|-------------|------|
| `design/homepage-material-you.html` | `src/components/LandingPage.tsx` | ❌ 待重写 |
| `prototype/jianliya-codex-prototype.html` 中的 Dashboard | `src/components/Dashboard.tsx` | ❌ 待创建 |
| `prototype/jianliya-codex-prototype.html` 中的 Editor | `src/components/Toolbar.tsx`（已改） + AIPanel（待改） | 🟡 部分完成 |
| `design/diagnosis-report-demo.html` | 简历诊断功能 | ❌ 待开发 |
| IA_SPEC.md 第二章（信息架构） | App.tsx 路由结构 | ❌ 待对齐 |

---

## 八、下一步行动

- [x] 建立 git 基线（P0#1）
- [x] 确认全部 10 项决策（第四章已更新）
- [x] 确认 P0→P1→P2→P3 优先级
- [x] 清理 prototype/ 和一次性脚本
- [x] **修复 IA_SPEC.md 编码损坏**（Node.js 重写，零损坏，7065 bytes）
- [ ] P0#4：删除旧 LandingPage.tsx（星空深色版）
- [ ] P0#5：创建新首页组件（参照 design/homepage-material-you.html）
- [ ] git commit 建正式基线
- [ ] P1：开始前端产品化开发

---

*本文件是 简历鸭 当前状态的唯一权威记录。后续所有决策和实现以此为起点。*
