# 简历编辑器 — AI 功能开发指令 · Phase 1-2

> **交付给 @Dev 执行。** 阅读以下全部内容后开始写代码。
> 项目根目录：`20_PROJECTS/resume-editor/`
> 运行验证：`npm run dev`（必须零报错）
> 原型参考：`prototype/ai-features.html`（浏览器打开看交互效果）

---

## Phase 目标

建立 AI 功能的完整框架：
- Phase 1：AI 面板 UI 骨架 + Tab 切换 + 按钮体系
- Phase 2：AI Store + API 客户端 + 类型定义 + i18n

---

## 步骤 0：确认现有依赖

现有 `package.json` 已包含所有基础依赖，无需 `npm install`。后续 Phase 5 才需要安装 `tesseract.js`。

---

## 任务 1：AI 类型定义

**文件：** `src/types/ai.ts`（新建）

```typescript
// ── AI 配置 ──
export interface AIConfig {
  apiKey: string
  baseURL: string   // 默认 https://api.deepseek.com/v1
  model: string     // 默认 deepseek-v4-pro
}

// ── 经历润色 ──
export type PolishMode = 'star' | 'result' | 'concise'

// ── 岗位适配 ──
export interface AdaptMatch {
  skill: string
  evidence: string
  suggestion: string
}
export interface AdaptMiss {
  requirement: string
  suggestion: string
}
export interface AdaptSuggestion {
  area: string
  detail: string
}
export interface AdaptResult {
  score: number
  matches: AdaptMatch[]
  missing: AdaptMiss[]
  suggestions: AdaptSuggestion[]
}

// ── 面试预测 ──
export interface InterviewQuestion {
  question: string
  hint: string
  category: string
}

// ── AI 面板 Tab ──
export type AITab = 'polish' | 'adapt' | 'interview'

// ── AI Panel 状态 ──
export interface AIPanelState {
  isOpen: boolean
  activeTab: AITab
  // 润色
  selectedExpId: string | null
  polishMode: PolishMode
  polishResult: string | null
  polishLoading: boolean
  polishError: string | null
  // 适配
  jdText: string
  ocrImageBase64: string | null
  ocrProgress: number
  ocrResult: string | null
  adaptResult: AdaptResult | null
  adaptLoading: boolean
  adaptError: string | null
  // 面试
  interviewQuestions: InterviewQuestion[]
  interviewLoading: boolean
  interviewError: string | null
}

// ── API 消息 ──
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
```

---

## 任务 2：AI Store（Zustand）

**文件：** `src/store/aiStore.ts`（新建）

```typescript
import { create } from 'zustand'
import type { AIConfig, AITab, PolishMode, AdaptResult, InterviewQuestion } from '../types/ai'

// 默认配置
const defaultConfig: AIConfig = {
  apiKey: '',
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-v4-pro',
}

// 从 localStorage 恢复配置
function loadConfig(): AIConfig {
  try {
    const stored = localStorage.getItem('ai-config')
    if (stored) return { ...defaultConfig, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return defaultConfig
}

function saveConfig(config: AIConfig) {
  localStorage.setItem('ai-config', JSON.stringify(config))
}

interface AIStore extends AIPanelState {
  config: AIConfig
  // Panel
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setActiveTab: (tab: AITab) => void
  // Config
  setConfig: (config: AIConfig) => void
  // Polish
  selectExperience: (id: string | null) => void
  setPolishMode: (mode: PolishMode) => void
  setPolishResult: (result: string | null) => void
  setPolishLoading: (loading: boolean) => void
  setPolishError: (error: string | null) => void
  // Adapt
  setJdText: (text: string) => void
  setOcrImage: (base64: string | null) => void
  setOcrProgress: (progress: number) => void
  setOcrResult: (result: string | null) => void
  setAdaptResult: (result: AdaptResult | null) => void
  setAdaptLoading: (loading: boolean) => void
  setAdaptError: (error: string | null) => void
  // Interview
  setInterviewQuestions: (questions: InterviewQuestion[]) => void
  setInterviewLoading: (loading: boolean) => void
  setInterviewError: (error: string | null) => void
}

type AIPanelState = AIPanelState // reuse from types

const initialPanel: AIPanelState = {
  isOpen: false,
  activeTab: 'polish',
  selectedExpId: null,
  polishMode: 'star',
  polishResult: null,
  polishLoading: false,
  polishError: null,
  jdText: '',
  ocrImageBase64: null,
  ocrProgress: 0,
  ocrResult: null,
  adaptResult: null,
  adaptLoading: false,
  adaptError: null,
  interviewQuestions: [],
  interviewLoading: false,
  interviewError: null,
}

export const useAIStore = create<AIStore>((set) => ({
  config: loadConfig(),
  ...initialPanel,
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setConfig: (config) => { saveConfig(config); set({ config }) },
  selectExperience: (id) => set({ selectedExpId: id, polishResult: null, polishError: null }),
  setPolishMode: (mode) => set({ polishMode: mode }),
  setPolishResult: (result) => set({ polishResult: result }),
  setPolishLoading: (loading) => set({ polishLoading: loading }),
  setPolishError: (error) => set({ polishError: error }),
  setJdText: (text) => set({ jdText: text }),
  setOcrImage: (base64) => set({ ocrImageBase64: base64, ocrResult: null }),
  setOcrProgress: (progress) => set({ ocrProgress: progress }),
  setOcrResult: (result) => set({ ocrResult: result }),
  setAdaptResult: (result) => set({ adaptResult: result }),
  setAdaptLoading: (loading) => set({ adaptLoading: loading }),
  setAdaptError: (error) => set({ adaptError: error }),
  setInterviewQuestions: (questions) => set({ interviewQuestions: questions }),
  setInterviewLoading: (loading) => set({ interviewLoading: loading }),
  setInterviewError: (error) => set({ interviewError: error }),
}))
```

---

## 任务 3：AI API 客户端

**文件：** `src/services/aiClient.ts`（新建，需先创建 `src/services/` 目录）

```typescript
import type { ChatMessage } from '../types/ai'
import { useAIStore } from '../store/aiStore'

interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  const { config } = useAIStore.getState()

  if (!config.apiKey) {
    callbacks.onError('API Key 未配置，请在设置中添加')
    return
  }

  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
      }),
      signal: abortSignal,
    })

    if (!response.ok) {
      if (response.status === 401) callbacks.onError('API Key 无效，请在设置中检查')
      else if (response.status === 429) callbacks.onError('请求频率过高，请稍后再试')
      else callbacks.onError(`请求失败 (${response.status})`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('无法读取响应流')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone()
          return
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) callbacks.onToken(content)
        } catch { /* skip malformed chunks */ }
      }
    }
    callbacks.onDone()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      callbacks.onDone()
      return
    }
    callbacks.onError(err.message || '网络错误，请检查连接')
  }
}
```

---

## 任务 4：流式响应 Hook

**文件：** `src/hooks/useAIStream.ts`（新建，需先创建 `src/hooks/` 目录）

```typescript
import { useState, useRef, useCallback } from 'react'

interface UseAIStreamReturn {
  content: string
  loading: boolean
  error: string | null
  start: (prompt: () => Promise<void>) => void
  stop: () => void
  reset: () => void
}

export function useAIStream(): UseAIStreamReturn {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(async (prompt: () => Promise<void>) => {
    setContent('')
    setError(null)
    setLoading(true)
    abortRef.current = new AbortController()
    try {
      await prompt()
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || '未知错误')
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    setContent('')
    setError(null)
  }, [])

  return { content, loading, error, start, stop, reset }
}
```

等实际接入 API 时再让 `streamChat` 回调更新 content。目前先搭好框架。

---

## 任务 5：AI Panel 容器

**文件：** `src/components/ai/AIPanel.tsx`（新建，需先创建 `src/components/ai/` 目录）

```tsx
import { useAIStore } from '../../store/aiStore'
import AITabs from './AITabs'
import ExperiencePolish from './ExperiencePolish'
import JDAdapt from './JDAdapt'
import InterviewPredict from './InterviewPredict'

export default function AIPanel() {
  const isOpen = useAIStore((s) => s.isOpen)
  const closePanel = useAIStore((s) => s.closePanel)
  const activeTab = useAIStore((s) => s.activeTab)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[520px] bg-white shadow-xl z-50 flex flex-col"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-sm">
              ✨
            </span>
            <span className="text-[15px] font-semibold text-gray-900">AI 工具箱</span>
          </div>
          <button
            onClick={closePanel}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <AITabs />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {activeTab === 'polish' && <ExperiencePolish />}
          {activeTab === 'adapt' && <JDAdapt />}
          {activeTab === 'interview' && <InterviewPredict />}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
```

---

## 任务 6：AI Tabs 组件

**文件：** `src/components/ai/AITabs.tsx`（新建）

```tsx
import { useAIStore } from '../../store/aiStore'
import type { AITab } from '../../types/ai'

const tabs: { key: AITab; icon: string; label: string }[] = [
  { key: 'polish', icon: '✨', label: '经历润色' },
  { key: 'adapt', icon: '🎯', label: '岗位适配' },
  { key: 'interview', icon: '💬', label: '面试预测' },
]

export default function AITabs() {
  const activeTab = useAIStore((s) => s.activeTab)
  const setActiveTab = useAIStore((s) => s.setActiveTab)

  return (
    <div className="flex gap-1 px-5 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200 border
            ${activeTab === tab.key
              ? 'bg-white text-[#4F46E5] border-gray-200 shadow-sm font-semibold'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
```

---

## 任务 7：经历润色 Tab（UI 骨架）

**文件：** `src/components/ai/ExperiencePolish.tsx`（新建）

这个 Phase 只做 UI 骨架（选择经历 + 模式选择 + 输出区），不接 API。

```tsx
import { useAIStore } from '../../store/aiStore'
import { useResumeStore } from '../../store/resumeStore'
import type { PolishMode } from '../../types/ai'

const modes: { key: PolishMode; icon: string; label: string; desc: string }[] = [
  { key: 'star', icon: '⭐', label: 'STAR 法则', desc: '情境·任务·行动·结果' },
  { key: 'result', icon: '🎯', label: '结果导向', desc: '强调量化成果与影响力' },
  { key: 'concise', icon: '✂️', label: '精炼压缩', desc: '一句话说清核心贡献' },
]

export default function ExperiencePolish() {
  const workExperience = useResumeStore((s) => s.data.workExperience)
  const {
    selectedExpId, polishMode, polishResult, polishLoading, polishError,
    selectExperience, setPolishMode, setPolishResult, setPolishError,
  } = useAIStore()

  // 统一按钮样式
  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
  const btnSecondary = "h-[34px] px-4 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-800 inline-flex items-center gap-1.5 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-indigo-50 transition-all"

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">选择一条经历，AI 帮你改写</p>

      {/* Step 1: Select experience */}
      {workExperience.length === 0 ? (
        <p className="text-xs text-gray-400 italic">请先在编辑面板中添加工作经历</p>
      ) : (
        <div className="space-y-2 mb-4">
          {workExperience.map((w) => (
            <button
              key={w.id}
              onClick={() => selectExperience(w.id)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                selectedExpId === w.id
                  ? 'border-[#4F46E5] bg-indigo-50'
                  : 'border-gray-200 bg-gray-50 hover:border-[#4F46E5]'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors ${
                  selectedExpId === w.id ? 'border-[#4F46E5]' : 'border-gray-300'
                }`}>
                  {selectedExpId === w.id && (
                    <span className="block w-2 h-2 bg-[#4F46E5] rounded-full m-0.5" />
                  )}
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-gray-900">{w.role || '未命名职位'}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{w.company}{w.dates ? ` · ${w.dates}` : ''}</div>
                  {w.bullets.length > 0 && (
                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{w.bullets[0]}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Choose mode */}
      <p className="text-xs text-gray-400 mb-2 mt-4">选择润色风格</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setPolishMode(m.key)}
            className={`p-2.5 rounded-lg border text-center transition-all ${
              polishMode === m.key
                ? 'border-[#7C3AED] bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-[#7C3AED]'
            }`}
          >
            <div className="text-lg mb-0.5">{m.icon}</div>
            <div className="text-[11px] font-semibold text-gray-800">{m.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Step 3: Action */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            // Phase 3 接入 API。目前模拟 loading + 结果
            setPolishError(null)
            setPolishResult(null)
            // 实际 API 调用在 Phase 3 实现
          }}
          disabled={!selectedExpId || polishLoading}
          className={`${btnPrimary} ${(!selectedExpId || polishLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          ✨ 开始润色
        </button>
      </div>

      {/* Error */}
      {polishError && (
        <div className="mt-3 p-2.5 rounded-md bg-red-50 text-red-600 text-xs">{polishError}</div>
      )}

      {/* Output */}
      <p className="text-xs text-gray-400 mt-4 mb-1.5">润色结果</p>
      <div className={`border border-gray-200 rounded-lg min-h-[120px] p-3 text-xs leading-relaxed ${
        !polishResult ? 'text-gray-400 italic bg-gray-50' : 'text-gray-800 bg-white'
      }`}>
        {polishLoading ? (
          <div className="flex gap-1 items-center py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
          </div>
        ) : polishResult || '点击「开始润色」生成结果'}
      </div>

      {polishResult && (
        <div className="flex gap-2 mt-3">
          <button className={btnSecondary}>📋 复制结果</button>
          <button className={`${btnSecondary} font-semibold !text-[#4F46E5] !border-[#4F46E5]`}>✅ 应用到简历</button>
        </div>
      )}
    </div>
  )
}
```

需要添加 CSS 动画：
```css
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
```

将这段加到 `src/index.css` 的 `@layer components` 中或直接在组件内 `<style>` 标签注入。最简单的是在 AIPanel 或 index.css 添加。

---

## 任务 8：岗位适配 Tab（UI 骨架）

**文件：** `src/components/ai/JDAdapt.tsx`（新建）

```tsx
import { useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import OCROCRUpload from './OCROCRUpload'

export default function JDAdapt() {
  const {
    jdText, adaptResult, adaptLoading, adaptError,
    setJdText, setAdaptResult, setAdaptError,
  } = useAIStore()

  const [showOCR, setShowOCR] = useState(false)

  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
  const btnSecondary = "h-[34px] px-4 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-800 inline-flex items-center gap-1.5 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-indigo-50 transition-all"

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">粘贴 JD 文字，或截图识别 Boss 直聘岗位描述</p>

      {/* OCR Toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowOCR(!showOCR)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
            showOCR
              ? 'border-[#7C3AED] text-[#7C3AED] bg-indigo-50'
              : 'border-dashed border-gray-300 text-gray-400 hover:border-[#7C3AED] hover:text-[#7C3AED]'
          }`}
        >
          📷 截图识别
        </button>
        {!showOCR && <span className="text-[10px] text-gray-400">直接 Ctrl+V 粘贴截图</span>}
      </div>

      {/* OCR Upload area */}
      {showOCR && <OCROCRUpload />}

      {/* JD Textarea */}
      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder={`在此粘贴目标岗位描述（JD）...

例如：
【岗位】AI 产品经理
【要求】
- 3年以上AI/大数据产品经验
- 熟悉大语言模型应用场景
- 具备数据分析能力，熟练使用SQL
...`}
        className="w-full min-h-[140px] p-3 rounded-lg border border-gray-200 text-xs resize-y focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100"
      />

      {/* Action */}
      <div className="mt-3">
        <button
          onClick={() => {
            setAdaptError(null)
            setAdaptResult(null)
            // Phase 4 接入 API
          }}
          disabled={!jdText.trim() || adaptLoading}
          className={`${btnPrimary} ${(!jdText.trim() || adaptLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🎯 分析匹配度
        </button>
      </div>

      {/* Error */}
      {adaptError && (
        <div className="mt-3 p-2.5 rounded-md bg-red-50 text-red-600 text-xs">{adaptError}</div>
      )}

      {/* Loading */}
      {adaptLoading && (
        <div className="flex gap-1 items-center py-3 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
        </div>
      )}

      {/* Results */}
      {adaptResult && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
            📊 匹配度分析
            <span className="text-[11px] font-normal text-gray-400">整体匹配 {adaptResult.score}%</span>
          </div>

          {/* Matches */}
          {adaptResult.matches.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                ✅ <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-600">匹配</span>
                与 JD 契合的经历
              </h4>
              {adaptResult.matches.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600 leading-relaxed mt-1.5 border-l-[3px] border-l-[#7C3AED]">
                  <strong>{m.skill}</strong> — {m.evidence}。{m.suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Missing */}
          {adaptResult.missing.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                ⚠️ <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600">缺失</span>
                JD 要求但简历未体现
              </h4>
              {adaptResult.missing.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600 leading-relaxed mt-1.5 border-l-[3px] border-l-[#7C3AED]">
                  <strong>{m.requirement}</strong> — {m.suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {adaptResult.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                💡 <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">建议强化</span>
                优化方向
              </h4>
              {adaptResult.suggestions.map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600 leading-relaxed mt-1.5 border-l-[3px] border-l-[#7C3AED]">
                  <strong>{s.area}</strong> — {s.detail}
                </div>
              ))}
            </div>
          )}

          {/* One-click adjust button */}
          <div className="flex gap-2 pt-1">
            <button className={`${btnSecondary} font-semibold !text-[#4F46E5] !border-[#4F46E5]`}>
              🔄 一键调整简历
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 任务 9：OCR 截图上传组件（UI 骨架）

**文件：** `src/components/ai/OCROCRUpload.tsx`（新建）

Phase 1-2 只做 UI 骨架 + 拖拽/粘贴文件处理，不接 Tesseract.js。

```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
import { useAIStore } from '../../store/aiStore'

export default function OCRCROCRUpload() {
  const { ocrImageBase64, ocrProgress, ocrResult, setOcrImage, setOcrProgress, setOcrResult, setJdText } = useAIStore()
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setOcrImage(base64)
      setOcrProgress(0)
      setOcrResult(null)

      // Simulate OCR progress (Phase 5 替换为真实 Tesseract.js)
      let progress = 0
      const steps = ['检测文字区域...', '识别字符...', '解析排版...']
      const interval = setInterval(() => {
        progress += Math.random() * 25
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          setOcrProgress(100)
          // Placeholder result
          const placeholder = '【模拟OCR结果】此内容将在接入Tesseract.js后由AI自动识别'
          setOcrResult(placeholder)
          setJdText(placeholder)
        } else {
          setOcrProgress(progress)
        }
      }, 400)
    }
    reader.readAsDataURL(file)
  }, [setOcrImage, setOcrProgress, setOcrResult, setJdText])

  // Ctrl+V paste handler
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { processFile(file); e.preventDefault(); break }
        }
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [processFile])

  if (ocrImageBase64) {
    // Preview mode
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-200 mb-2">
        <img src={ocrImageBase64} alt="截图预览" className="w-full max-h-[200px] object-contain bg-gray-100" />
        <button
          onClick={() => { setOcrImage(null); setOcrProgress(0); setOcrResult(null) }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
        >
          ✕
        </button>
        {ocrProgress < 100 && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
            </div>
            <div className="text-[13px] font-semibold text-[#4F46E5] mt-1">OCR 识别中...</div>
          </div>
        )}
        {ocrProgress >= 100 && !ocrResult && (
          <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
            <span className="text-[13px] font-semibold text-green-600">✅ 识别完成</span>
          </div>
        )}
      </div>
    )
  }

  // Upload mode
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all mb-2 ${
        dragOver ? 'border-[#7C3AED] bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-indigo-50/50'
      }`}
    >
      <div className="text-xs text-gray-400 leading-relaxed">
        📷 点击此处上传截图<br />
        或直接 <strong className="text-[#7C3AED]">Ctrl+V</strong> 粘贴剪贴板截图<br />
        <span className="text-[10px] text-gray-400">支持 PNG / JPG</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
        className="hidden"
      />
    </div>
  )
}
```

---

## 任务 10：面试预测 Tab（UI 骨架）

**文件：** `src/components/ai/InterviewPredict.tsx`（新建）

```tsx
import { useAIStore } from '../../store/aiStore'

export default function InterviewPredict() {
  const {
    interviewQuestions, interviewLoading, interviewError,
    setInterviewQuestions, setInterviewError,
  } = useAIStore()

  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">基于你的简历内容，AI 预测面试官可能提出的 10 个问题</p>

      <button
        onClick={() => {
          setInterviewError(null)
          setInterviewQuestions([])
          // Phase 6 接入 API
        }}
        disabled={interviewLoading}
        className={`${btnPrimary} ${interviewLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        💬 生成面试问题
      </button>

      {/* Error */}
      {interviewError && (
        <div className="mt-3 p-2.5 rounded-md bg-red-50 text-red-600 text-xs">{interviewError}</div>
      )}

      {/* Loading */}
      {interviewLoading && (
        <div className="flex gap-1 items-center py-4 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
        </div>
      )}

      {/* Questions */}
      {interviewQuestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {interviewQuestions.map((q, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-gray-200 bg-white flex items-start gap-2.5 hover:border-[#7C3AED] hover:bg-indigo-50 transition-all"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-800 leading-relaxed">{q.question}</div>
                <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">{q.hint}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-[#7C3AED] whitespace-nowrap flex-shrink-0">
                {q.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 任务 11：App.tsx 接入 AI Panel

**文件：** `src/App.tsx`

在现有的 `<div className="h-screen...">` 的 return 中，`<DraftManager>` 之后、`</div>` 之前，加入 AI Panel：

```tsx
import { useAIStore } from './store/aiStore'
// ... 其他 import 保持不变

export default function App() {
  // ... 现有的所有代码保持不变 ...

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar onOpenDrafts={() => setShowDrafts(true)} />
      <div className="flex-1 flex overflow-hidden">
        <EditorPanel />
        <PreviewPanel />
      </div>
      {showDrafts && <DraftManager onClose={() => setShowDrafts(false)} />}
      <AIPanel />
    </div>
  )
}
```

---

## 任务 12：Toolbar 添加 AI 按钮

**文件：** `src/components/Toolbar.tsx`

1. 顶部 import 新增：
```tsx
import { useAIStore } from '../store/aiStore'
```

2. 组件内解构获取 togglePanel：
```tsx
const togglePanel = useAIStore((s) => s.togglePanel)
```

3. 在 Toolbar 右侧按钮区，`handleNew` 按钮之后，添加 AI 按钮：
```tsx
{/* Group 4: AI tools */}
<div className="w-px h-4 bg-border-default" />
<button onClick={togglePanel} className={btn('primary', 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] !border-0')}>
  ✨ AI 工具
</button>
```

注意：btn('primary') 的默认样式会被覆盖部分，可直接用 className：
```tsx
<button onClick={togglePanel} className="h-8 rounded-md text-[11px] px-3 font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all">
  ✨ AI 工具
</button>
```

---

## 任务 13：全局 CSS 补充

**文件：** `src/index.css`

在 `@layer components` 内（`}` 关闭前）添加滚动条和动画：

```css
/* thin scrollbar for AI panel */
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

/* bounce animation for loading dots */
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.animate-bounce { animation: bounce 1.4s infinite ease-in-out; }
```

---

## 验收标准

1. `npm run dev` — 零报错，终端输出无红色
2. Toolbar 右侧出现紫色渐变 `✨ AI 工具` 按钮
3. 点击按钮 → 右侧滑出 520px AI 面板（带动画）
4. 面板顶部 3 个 pill 风格 Tab（经历润色/岗位适配/面试预测），点击可切换
5. 经历润色 Tab：显示工作经历列表（可单选）+ 3 种润色风格按钮 + 输出区
6. 岗位适配 Tab：JD 文本框 + 📷 截图识别 toggle（展开虚线上传区）
7. 面试预测 Tab：生成按钮 + 结果列表区
8. 点击遮罩或 ✕ 关闭面板
9. TypeScript 编译零错误（`npx tsc --noEmit`）

---

## 新建文件清单

| 文件 | 说明 |
|------|------|
| `src/types/ai.ts` | AI 类型定义 |
| `src/store/aiStore.ts` | AI 状态管理 |
| `src/services/aiClient.ts` | API 客户端（流式） |
| `src/hooks/useAIStream.ts` | 流式响应 Hook |
| `src/components/ai/AIPanel.tsx` | AI 面板容器 |
| `src/components/ai/AITabs.tsx` | Tab 切换 |
| `src/components/ai/ExperiencePolish.tsx` | 经历润色 |
| `src/components/ai/JDAdapt.tsx` | 岗位适配 |
| `src/components/ai/OCROCRUpload.tsx` | OCR 截图上传 |
| `src/components/ai/InterviewPredict.tsx` | 面试预测 |

## 修改文件清单

| 文件 | 修改 |
|------|------|
| `src/App.tsx` | 引入 AIPanel |
| `src/components/Toolbar.tsx` | 添加 AI 工具按钮 |
| `src/index.css` | 添加滚动条 + 弹跳动画 |

---

**开始写代码吧！确保 `npm run dev` 零报错。**
