# 简历编辑器 — AI 功能产品规格书

> 基于 `PRODUCT_SPEC.md` 扩展 · 原型文件: `prototype/ai-features.html`

## 概述

为简历编辑器新增 AI 辅助功能，帮助用户优化简历内容、适配目标岗位、预测面试问题。以右侧滑出面板为载体，提供三个核心 AI 模块。

---

## 功能清单

### ✨ 功能 1：经历润色

**入口**：
- 编辑面板每条工作经历卡片右下角 `✨ 润色` 按钮
- 工作经历 Section 标题右侧 `✨ AI 润色` 文字链接
- 打开后自动跳转 AI 面板 → 经历润色 Tab

**交互流程**：
1. **选择经历**：从简历已有工作经历中单选一条（卡片式，hover 高亮，选中态紫底）
2. **选择风格**：三种润色模式
   - ⭐ STAR 法则 — 改写成 情境·任务·行动·结果 结构
   - 🎯 结果导向 — 强调量化成果与影响力，数据前置
   - ✂️ 精炼压缩 — 一句话说清核心贡献
3. **点击「开始润色」** → loading 动画 → AI 流式返回结果
4. **操作结果**：📋 复制 / ✅ 应用到简历（替换原字段）

**AI Prompt 设计要点**：
- System: 你是一位专业的简历优化顾问，擅长 STAR 法则和结果导向表达
- 输入：原始经历文本 + 润色风格
- 输出约束：保持事实不变，只优化表达；不超过原文 2 倍长度；使用中文

**状态管理**：
- 选中的经历 ID
- 选中的润色风格
- AI 生成结果文本
- loading / error 状态

---

### 🎯 功能 2：岗位适配

**入口**：AI 面板 → 岗位适配 Tab

**交互流程**：
1. **输入 JD**：两种方式
   - 直接粘贴文本到 JD 输入框
   - 📷 截图识别（见下方 OCR 模块）
2. **点击「分析匹配度」** → AI 分析 → 展示结果
3. **结果展示**（三个维度）：
   - ✅ 匹配 — 简历中与 JD 契合的经历，附强化建议
   - ⚠️ 缺失 — JD 要求但简历未体现的能力
   - 💡 建议强化 — 提到了但不够突出的方向
4. **一键调整简历**：根据分析结果自动调整简历侧重点（重新排序经历、突出关键技能）

**AI Prompt 设计要点**：
- System: 你是一位招聘专家和简历顾问
- 输入：完整简历 JSON + JD 文本
- 输出：结构化 JSON `{ matches: [...], missing: [...], suggestions: [...] }`
- 匹配度评分：0-100 分

---

### 📷 截图 OCR 识别（岗位适配子模块）

**入口**：岗位适配 Tab 内 `📷 截图识别` pill 按钮

**交互流程**：
1. 点击按钮展开虚线边框上传区
2. 四种上传方式：点击选择文件 / Ctrl+V 粘贴 / 拖拽文件 / 再次点击按钮收起
3. 上传后显示缩略图 + OCR 状态遮罩（三步进度动画）
4. 识别完成自动填入 JD 文本框

**技术方案**：
- `Tesseract.js` 纯前端 OCR，无需后端
- 中文语言包 `chi_sim`（~10MB，首次按需加载）
- Worker 池复用，避免重复初始化

**状态管理**：
- 截图 blob / base64
- OCR 进度（0-100%）
- 识别文本结果
- 错误状态（语言包加载失败、识别超时等）

**边界处理**：
- 截图模糊提示"识别效果可能不佳，建议重新截图"
- 语言包加载中显示进度条
- 超时 30 秒自动中止

---

### 💬 功能 3：AI 面试预测

**入口**：AI 面板 → 面试预测 Tab

**交互流程**：
1. **点击「生成面试问题」** → AI 分析简历 → 输出 10 个问题
2. **问题展示**：编号圆圈 + 问题正文 + 答题提示 + 分类标签
3. 分类标签：`经历深挖` / `能力验证` / `专业认知` / `场景假设` / `数据验证` / `行业视野` / `软技能`
4. 卡片 hover 高亮紫底

**AI Prompt 设计要点**：
- System: 你是一位资深面试官，擅长根据简历设计深度面试问题
- 输入：完整简历 JSON
- 输出：10 个问题，每个包含 `{ question, hint, category }`
- 覆盖原则：至少涵盖 5 个不同分类；优先针对量化数据追问验证

---

## 🖥️ UI 设计

### AI 面板
- **位置**：右侧固定滑出，宽度 520px
- **动画**：slideIn 0.25s ease-out
- **层级**：覆盖在预览区之上，带 backdrop 半透明遮罩
- **关闭**：面板右上角 ✕ / 点击遮罩 / 再次点击 Toolbar AI 按钮

### Tab 切换
- **样式**：分段控制器 pill 风格，flex 等宽分布
- **选中态**：白色底 + 细边框 + 轻微阴影 + 品牌色文字
- **hover**：灰色背景 + primary 文字色

### 按钮体系（统一）
| 层级 | 类名 | 用途 | 样式 |
|------|------|------|------|
| Primary | `btn-ai-primary` | 开始润色 / 分析匹配度 / 生成面试问题 | 紫色渐变 + 白色文字 + hover 浮起 |
| Secondary | `btn-ai-secondary` | 复制结果 / 应用到简历 / 一键调整简历 | 白底 + 灰边框 + hover 变紫 |

---

## 🗄️ 数据与状态

### AI 配置 Store（新增）
```typescript
interface AIConfig {
  apiKey: string;        // 用户 API Key（本地存储，不上传）
  baseURL: string;       // API Base URL，默认 OpenAI 兼容
  model: string;         // 模型名称，默认 deepseek-v4-pro
}
```

### AI 面板 Store（新增）
```typescript
interface AIPanelState {
  isOpen: boolean;
  activeTab: 'polish' | 'adapt' | 'interview';
  // 润色
  selectedExpId: string | null;
  polishMode: 'star' | 'result' | 'concise';
  polishResult: string | null;
  polishLoading: boolean;
  // 适配
  jdText: string;
  ocrImageBase64: string | null;
  ocrProgress: number;
  ocrResult: string | null;
  adaptResult: AdaptResult | null;
  adaptLoading: boolean;
  // 面试
  interviewQuestions: InterviewQuestion[];
  interviewLoading: boolean;
}
```

### 持久化
- API Key → `localStorage`（加密存储）
- OCR 截图 → 临时内存，不持久化
- AI 生成结果 → 不持久化（关闭面板即清除）

---

## 🔌 API 对接

### 调用方式
```
POST {baseURL}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "model": "{model}",
  "messages": [
    { "role": "system", "content": "{systemPrompt}" },
    { "role": "user", "content": "{userInput}" }
  ],
  "stream": true
}
```

### 流式处理
- 使用 `EventSource` 或 `fetch` + `ReadableStream` 处理 SSE
- 逐 token 追加到结果区，用户可随时中止
- 中止后保留已生成内容

### 错误处理
- 401 → "API Key 无效，请在设置中检查"
- 429 → "请求频率过高，请稍后再试"
- 网络超时 → "请求超时，请检查网络连接"
- 通用错误 → 展示错误信息 + 重试按钮

---

## 📁 文件结构

```
src/
├── components/
│   └── ai/                        # 新增 AI 组件目录
│       ├── AIPanel.tsx            # AI 侧边面板容器
│       ├── AITabs.tsx             # Tab 切换组件
│       ├── ExperiencePolish.tsx   # 经历润色 Tab
│       ├── JDAdapt.tsx            # 岗位适配 Tab
│       ├── OCRUpload.tsx          # 截图 OCR 上传
│       ├── InterviewPredict.tsx   # 面试预测 Tab
│       └── AISettings.tsx         # AI 配置弹窗
├── store/
│   └── aiStore.ts                 # AI 状态管理 (Zustand)
├── services/
│   ├── aiClient.ts                # OpenAI 兼容 API 客户端
│   ├── ocrWorker.ts               # Tesseract.js Worker 管理
│   └── prompts.ts                 # System Prompt 模板
├── hooks/
│   └── useAIStream.ts             # 流式响应 Hook
└── types/
    └── ai.ts                      # AI 相关类型定义
```

---

## 🚀 开发计划

| 阶段 | 内容 | 预估 |
|------|------|------|
| Phase 1 | AI 面板框架 + Tab 切换 + UI 骨架 | 渲染层 |
| Phase 2 | `aiClient` + `aiStore` + 流式 Hook | 基础设施 |
| Phase 3 | 经历润色 + Prompt 调优 | 核心功能 |
| Phase 4 | 岗位适配 + 匹配分析 | 核心功能 |
| Phase 5 | OCR 截图识别 (Tesseract.js) | 子模块 |
| Phase 6 | 面试预测 | 核心功能 |
| Phase 7 | AI 配置弹窗 + 错误处理 + 联调 | 收尾 |

---

## ⚠️ 风险与对策

| 风险 | 对策 |
|------|------|
| 用户无 API Key | 首次使用引导配置，提供获取链接 |
| Tesseract 语言包太大 (10MB) | 按需加载 + 加载进度提示 |
| 流式响应浏览器兼容 | fetch + ReadableStream，降级非流式 |
| AI 生成内容质量不稳定 | Prompt 迭代 + 用户可手动编辑结果 |
