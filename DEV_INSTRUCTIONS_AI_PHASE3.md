# 简历编辑器 — Phase 3: 经历润色 API 集成

> **交付给 @Dev 执行。** 阅读完开始写代码。
> 项目根目录：`20_PROJECTS/resume-editor/`

---

## 前提
- API Key 已配置在 `src/store/aiStore.ts`（`sk-9c476686f9c049018108e61956619fac`）
- `src/services/aiClient.ts` 已实现流式 SSE 调用
- `src/components/ai/ExperiencePolish.tsx` 已有 UI 骨架，需替换 onClick 中的占位逻辑

---

## 任务 1：创建 Prompt 模板

**文件：** `src/services/prompts.ts`（新建）

```typescript
import type { PolishMode } from '../types/ai'

export const polishPrompts: Record<PolishMode, string> = {
  star: `你是一位专业的简历优化顾问。你的任务是将用户的工作经历改写为 STAR 法则格式。

STAR 法则 = Situation(情境) + Task(任务) + Action(行动) + Result(结果)

改写要求：
1. 保持所有事实和数据不变，不要编造任何信息
2. 用中文输出，格式清晰
3. 每个维度用 1-2 句话表达
4. 如果原文缺少某个维度的信息，用「[建议补充：XXX]」标记，不要编造
5. 在结果部分优先使用量化数据
6. 输出格式示例：
S (情境) — [情境描述]
T (任务) — [任务描述]
A (行动) — [行动描述]
R (结果) — [结果描述]`,

  result: `你是一位专业的简历优化顾问。你的任务是将用户的工作经历改写为结果导向的版本。

改写要求：
1. 保持所有事实和数据不变，不要编造任何信息
2. 将最关键的量化和成果放在最前面
3. 每个要点以"核心成果：XXX"开头
4. 用中文输出，语言简洁有力
5. 如果原文没有量化数据，用「[建议补充数据]」标记
6. 每个改写后的条目控制在 2-3 行以内`,

  concise: `你是一位专业的简历优化顾问。你的任务是将用户的工作经历压缩为一句精华。

改写要求：
1. 保持所有事实和数据不变，不要编造任何信息
2. 输出仅为一句中文（不超过 50 字）
3. 必须包含核心动作 + 量化结果
4. 使用主动语态，动词开头
5. 如果原文没有量化数据，提取最有说服力的描述`,

}

export function buildPolishMessages(
  experienceText: string,
  mode: PolishMode,
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: polishPrompts[mode] },
    { role: 'user', content: experienceText },
  ]
}
```

---

## 任务 2：重写 ExperiencePolish.tsx — 接入 API

**文件：** `src/components/ai/ExperiencePolish.tsx`（重写）

```tsx
import { useCallback, useRef, useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useResumeStore } from '../../store/resumeStore'
import { streamChat } from '../../services/aiClient'
import { buildPolishMessages } from '../../services/prompts'
import type { PolishMode } from '../../types/ai'

const modes: { key: PolishMode; icon: string; label: string; desc: string }[] = [
  { key: 'star', icon: '⭐', label: 'STAR 法则', desc: '情境·任务·行动·结果' },
  { key: 'result', icon: '🎯', label: '结果导向', desc: '强调量化成果与影响力' },
  { key: 'concise', icon: '✂️', label: '精炼压缩', desc: '一句话说清核心贡献' },
]

export default function ExperiencePolish() {
  const workExperience = useResumeStore((s) => s.data.workExperience)
  const updateWork = useResumeStore((s) => s.updateWork)
  const {
    selectedExpId, polishMode, polishResult, polishLoading, polishError,
    selectExperience, setPolishMode, setPolishResult, setPolishLoading, setPolishError,
  } = useAIStore()

  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // 统一按钮样式
  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  const btnSecondary = (active = false) => `h-[34px] px-4 rounded-md text-xs font-medium bg-white border inline-flex items-center gap-1.5 transition-all ${active ? 'border-[#4F46E5] text-[#4F46E5] bg-indigo-50' : 'border-gray-200 text-gray-800 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-indigo-50'}`

  // 构建经历文本（公司 + 职位 + 所有 bullet 拼接）
  const getExperienceText = useCallback(() => {
    const exp = workExperience.find((w) => w.id === selectedExpId)
    if (!exp) return ''
    const parts: string[] = []
    if (exp.company) parts.push(`公司：${exp.company}`)
    if (exp.role) parts.push(`职位：${exp.role}`)
    if (exp.dates) parts.push(`时间：${exp.dates}`)
    if (exp.bullets.length > 0) {
      parts.push(`工作描述：\n${exp.bullets.map((b) => `- ${b}`).join('\n')}`)
    }
    return parts.join('\n')
  }, [workExperience, selectedExpId])

  // 开始润色
  const handlePolish = useCallback(async () => {
    const text = getExperienceText()
    if (!text) return

    setPolishError(null)
    setPolishResult(null)
    setPolishLoading(true)
    setApplied(false)
    setCopied(false)

    const abort = new AbortController()
    abortRef.current = abort

    let accumulated = ''

    await streamChat(
      buildPolishMessages(text, polishMode),
      {
        onToken: (token) => {
          accumulated += token
          setPolishResult(accumulated)
        },
        onDone: () => {
          setPolishLoading(false)
          abortRef.current = null
        },
        onError: (err) => {
          setPolishError(err)
          setPolishLoading(false)
          abortRef.current = null
        },
      },
      abort.signal,
    )
  }, [getExperienceText, polishMode, setPolishResult, setPolishLoading, setPolishError])

  // 中止生成
  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setPolishLoading(false)
    abortRef.current = null
  }, [])

  // 复制结果
  const handleCopy = useCallback(async () => {
    if (!polishResult) return
    try {
      // 去除 HTML 标签，保留纯文本
      const text = polishResult.replace(/<[^>]+>/g, '')
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = polishResult.replace(/<[^>]+>/g, '')
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [polishResult])

  // 应用到简历（替换第一条中文 bullet）
  const handleApply = useCallback(() => {
    if (!selectedExpId || !polishResult) return
    const text = polishResult.replace(/<[^>]+>/g, '')
    updateWork(selectedExpId, 'bullets', text)
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }, [selectedExpId, polishResult, updateWork])

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
              onClick={() => {
                selectExperience(w.id)
                setPolishResult(null)
                setPolishError(null)
                setApplied(false)
              }}
              disabled={polishLoading}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                selectedExpId === w.id
                  ? 'border-[#4F46E5] bg-indigo-50'
                  : 'border-gray-200 bg-gray-50 hover:border-[#4F46E5]'
              } ${polishLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            disabled={polishLoading}
            className={`p-2.5 rounded-lg border text-center transition-all ${
              polishMode === m.key
                ? 'border-[#7C3AED] bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-[#7C3AED]'
            } ${polishLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-lg mb-0.5">{m.icon}</div>
            <div className="text-[11px] font-semibold text-gray-800">{m.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Step 3: Action buttons */}
      <div className="flex gap-2">
        {!polishLoading ? (
          <button
            onClick={handlePolish}
            disabled={!selectedExpId}
            className={btnPrimary}
          >
            ✨ 开始润色
          </button>
        ) : (
          <button onClick={handleStop} className={btnPrimary.replace('from-[#4F46E5] to-[#7C3AED]', 'from-red-500 to-red-600')}>
            ⏹ 停止生成
          </button>
        )}
      </div>

      {/* Error */}
      {polishError && (
        <div className="mt-3 p-2.5 rounded-md bg-red-50 text-red-600 text-xs flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          <span>{polishError}</span>
        </div>
      )}

      {/* Output */}
      <p className="text-xs text-gray-400 mt-4 mb-1.5">
        润色结果{polishLoading ? ' · 生成中...' : ''}
      </p>
      <div className={`border border-gray-200 rounded-lg min-h-[120px] p-3 text-xs leading-relaxed ${
        polishLoading && !polishResult ? 'text-gray-400 italic bg-gray-50' : 'text-gray-800 bg-white'
      }`}>
        {polishLoading && !polishResult ? (
          <div className="flex gap-1 items-center py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
          </div>
        ) : polishResult ? (
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: polishResult }}
          />
        ) : (
          '点击「开始润色」生成结果'
        )}
      </div>

      {/* Result actions */}
      {polishResult && !polishLoading && (
        <div className="flex gap-2 mt-3">
          <button onClick={handleCopy} className={btnSecondary(copied)}>
            {copied ? '✅ 已复制' : '📋 复制结果'}
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedExpId}
            className={btnSecondary(applied)}
          >
            {applied ? '✅ 已应用' : '✅ 应用到简历'}
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## 验收标准

1. `npm run dev` — 零报错
2. `npx tsc --noEmit` — 零错误
3. 选择一条经历 → 选择风格 → 点击「开始润色」
4. 结果区应该**流式展示** AI 逐字生成的文字（不是一次性出现）
5. 生成中按钮变为红色「⏹ 停止生成」，点击可中止
6. 生成完成 → 📋 复制结果（点击变 ✅ 已复制）+ ✅ 应用到简历（点击变 ✅ 已应用）
7. 「应用到简历」点击后，对应工作经历的 bullet 被替换

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `src/services/prompts.ts` | **新建** |
| `src/components/ai/ExperiencePolish.tsx` | **重写** |
