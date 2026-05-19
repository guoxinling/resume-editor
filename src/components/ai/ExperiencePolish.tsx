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
  const setSummary = useResumeStore((s) => s.setSummary)
  const setSummaryEn = useResumeStore((s) => s.setSummaryEn)
  const updateWork = useResumeStore((s) => s.updateWork)
  const updateProject = useResumeStore((s) => s.updateProject)
  const setSelfEvaluation = useResumeStore((s) => s.setSelfEvaluation)
  const setSelfEvaluationEn = useResumeStore((s) => s.setSelfEvaluationEn)
  const updateCustomSection = useResumeStore((s) => s.updateCustomSection)
  const {
    selectedExpId, polishProjectId, polishSelfEvaluation, polishCustomSectionId,
    polishMode, polishResult, polishLoading, polishError,
    polishCustomText, polishCustomSource,
    selectExperience, setPolishMode, setPolishResult, setPolishLoading, setPolishError,
    setPolishCustomText,
  } = useAIStore()

  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const isCustom = !!polishCustomText

  const btnPrimary = "h-[34px] px-4 rounded-md text-xs font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  const btnSecondary = (active = false) => `h-[34px] px-4 rounded-md text-xs font-medium bg-white border inline-flex items-center gap-1.5 transition-all ${active ? 'border-[#4F46E5] text-[#4F46E5] bg-indigo-50' : 'border-gray-200 text-gray-800 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-indigo-50'}`

  const getExperienceText = useCallback(() => {
    if (isCustom) return polishCustomText ?? ''
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
  }, [workExperience, selectedExpId, isCustom, polishCustomText])

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

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setPolishLoading(false)
    abortRef.current = null
  }, [])

  const handleCopy = useCallback(async () => {
    if (!polishResult) return
    try {
      const text = polishResult.replace(/<[^>]+>/g, '')
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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

  const handleApply = useCallback(() => {
    if (!polishResult) return
    const text = polishResult.replace(/<[^>]+>/g, '')

    // Route result based on source
    if (polishCustomSource === 'summary') {
      setSummary(text)
    } else if (polishCustomSource === 'summaryEn') {
      setSummaryEn(text)
    } else if (polishProjectId) {
      updateProject(polishProjectId, 'description', text)
    } else if (polishSelfEvaluation) {
      if (polishCustomSource === 'selfEvaluationEn') {
        setSelfEvaluationEn(text)
      } else {
        setSelfEvaluation(text)
      }
    } else if (polishCustomSectionId) {
      updateCustomSection(polishCustomSectionId, 'content', text)
    } else if (selectedExpId) {
      // bullets are string[]; split polished text into array by newline
      const lines = text.split('\n').map((l) => l.replace(/^[-\s•\d.]+/, '').trim()).filter(Boolean)
      if (lines.length > 0) {
        updateWork(selectedExpId, 'bullets', lines)
      }
    }

    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }, [selectedExpId, polishResult, polishCustomSource, updateWork, setSummary, setSummaryEn])

  // Clear custom text when switching tabs or closing
  const handleClearCustom = () => {
    setPolishCustomText(null, null)
    setPolishResult(null)
    selectExperience(null)
  }

  return (
    <div>
      {/* ── Custom text input (summary etc.) ── */}
      {isCustom ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">
              {polishCustomSource === 'summary' || polishCustomSource === 'summaryEn' ? '润色个人概述'
               : polishCustomSource === 'selfEvaluation' || polishCustomSource === 'selfEvaluationEn' ? '润色自我评价'
               : polishCustomSectionId ? '润色自定义模块'
               : polishProjectId ? '润色项目描述'
               : '润色选中文本'}
            </p>
            <button onClick={handleClearCustom} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">
              ✕ 清除
            </button>
          </div>

          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 mb-3">
            <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">{polishCustomText}</p>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">选择一条经历，AI 帮你改写</p>

          {workExperience.length === 0 ? (
            <p className="text-xs text-gray-400 italic">请先在编辑面板中添加工作经历，或点击长文本框旁的 ✨ 按钮</p>
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
        </>
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
            disabled={!isCustom && !selectedExpId}
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
            disabled={!isCustom && !selectedExpId}
            className={btnSecondary(applied)}
          >
            {applied ? '✅ 已应用' : '✅ 应用到简历'}
          </button>
        </div>
      )}
    </div>
  )
}
