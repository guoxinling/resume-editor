import { useState, useRef, useEffect, useCallback } from 'react'
import { useResumeStore } from '../../store/resumeStore'
import { streamChat } from '../../services/aiClient'
import { buildWizardMessages } from '../../services/prompts'
import type { ChatMessage as AIMessage } from '../../types/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  step?: number
}

/** Loading stages for the initial scan animation */
const SCAN_STAGES = [
  { icon: '🔍', text: '正在扫描你的简历…' },
  { icon: '📊', text: '分析简历结构与内容…' },
  { icon: '💡', text: '生成个性化引导问题…' },
]

/** Typing indicator phrases that rotate during AI response */
const TYPING_PHRASES = [
  'AI 正在思考…',
  '整理回复中…',
  '马上就好…',
]

export default function Wizard() {
  const { setPersonalInfo, setSummary, setSelfEvaluation, addWork, updateWork, removeWork, addProject, updateProject, removeProject, addEducation, updateEducation, removeEducation, addSkill, updateSkill, addLanguage, updateLanguage, addCustomSection } = useResumeStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(7)
  const [finished, setFinished] = useState(false)
  const [started, setStarted] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  // Loading animation state
  const [scanStage, setScanStage] = useState(0)
  const [typingPhrase, setTypingPhrase] = useState(0)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streamingText, scrollToBottom])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = inputRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [])

  // Focus input after AI response (with a small delay for render)
  const focusInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  // Loading animation timers
  useEffect(() => {
    if (loading && !started) {
      // Scan stages: rotate every 2s
      const idx = 0
      scanTimerRef.current = setInterval(() => {
        setScanStage(s => (s + 1) % SCAN_STAGES.length)
      }, 2200)
      return () => {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current)
      }
    } else {
      setScanStage(0)
    }
  }, [loading, started])

  useEffect(() => {
    if (loading && started) {
      // Typing phrases: rotate every 3s
      typingTimerRef.current = setInterval(() => {
        setTypingPhrase(p => (p + 1) % TYPING_PHRASES.length)
      }, 3000)
      return () => {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current)
      }
    } else {
      setTypingPhrase(0)
    }
  }, [loading, started])

  /** Build a rich snapshot of current resume state for the AI to analyze */
  const buildSnapshot = useCallback(() => {
    const d = useResumeStore.getState().data
    const filledModules: string[] = []
    if (d.personalInfo.name) filledModules.push('个人信息')
    if (d.workExperience.length > 0) filledModules.push('工作经历')
    if (d.education.length > 0) filledModules.push('教育背景')
    if (d.aiProjects.length > 0) filledModules.push('项目经历')
    if (d.skills.length > 0) filledModules.push('技能')
    if (d.languages.length > 0) filledModules.push('语言能力')
    if (d.selfEvaluation.trim()) filledModules.push('自我评价')
    if (d.customSections.length > 0) filledModules.push('自定义模块')

    return {
      summary: {
        modulesFilled: filledModules.length,
        modulesList: filledModules,
      },
      personalInfo: {
        name: d.personalInfo.name || '(未填)',
        phone: d.personalInfo.phone || '(未填)',
        email: d.personalInfo.email || '(未填)',
        location: d.personalInfo.location || '(未填)',
        age: d.personalInfo.age || '(未填)',
        jobObjective: d.personalInfo.jobObjective || '(未填)',
      },
      workExperience: d.workExperience.map(w => ({
        company: w.company,
        role: w.role,
        dates: w.dates,
        bullets: w.bullets.slice(0, 3),
      })),
      education: d.education.map(e => ({
        school: e.school,
        degree: e.degree,
        major: e.major,
        dates: e.dates,
      })),
      projects: d.aiProjects.map(p => ({
        name: p.name,
        role: p.direction,
        dates: (p as any).dates || '',
        description: p.description.slice(0, 200),
      })),
      skills: d.skills.map(s => ({
        category: s.category,
        items: s.items.slice(0, 100),
      })),
      languages: d.languages,
      selfEvaluation: d.selfEvaluation.slice(0, 200) || '(未填)',
      customSections: d.customSections.map(s => ({
        label: s.label,
        content: s.content.slice(0, 150),
      })),
    }
  }, [])

  const streamAndParse = async (
    msgs: AIMessage[],
    onParsed: (parsed: { reply: string; step: number; totalSteps: number; extracted: Record<string, any> }) => void,
  ) => {
    setStreamingText('')
    let fullText = ''
    const controller = new AbortController()
    abortRef.current = controller

    await streamChat(
      msgs,
      'wizard',
      {
        onToken: (token: string) => {
          fullText += token
          // Don't show raw JSON to user — just track internally
          setStreamingText(fullText)
        },
        onDone: () => {
          setStreamingText('')
          try {
            const parsed = parseResponse(fullText)
            onParsed(parsed)
          } catch {
            onParsed({ reply: fullText, step: 0, totalSteps: 7, extracted: {} })
          }
        },
        onError: (errMsg: string) => {
          setStreamingText('')
          setError(errMsg)
        },
      },
      controller.signal,
    )
  }

  const handleStartConversation = async () => {
    setStarted(true)
    setLoading(true)
    setScanStage(0)
    const snapshot = buildSnapshot()
    await streamAndParse(buildWizardMessages(JSON.stringify(snapshot, null, 2), [], ''), (parsed) => {
      setMessages([{ role: 'assistant', content: parsed.reply, step: 1 }])
      setCurrentStep(1)
      setTotalSteps(parsed.totalSteps || 7)
    })
    setLoading(false)
    focusInput()
  }

  const parseResponse = (raw: string): { reply: string; step: number; totalSteps: number; extracted: Record<string, any> } => {
    const json = raw.replace(/```json\s*|```/g, '').trim()
    const parsed = JSON.parse(json)
    return {
      reply: parsed.reply || '',
      step: parsed.step || 0,
      totalSteps: parsed.totalSteps || 7,
      extracted: parsed.extracted || {},
    }
  }

  /** Smart merge: find existing entry by name match, update instead of duplicating */
  const applyExtracted = (extracted: Record<string, any>) => {
    const pi = useResumeStore.getState().data.personalInfo
    if (extracted.name && !pi.name) setPersonalInfo('name', extracted.name)
    if (extracted.phone && !pi.phone) setPersonalInfo('phone', extracted.phone)
    if (extracted.email && !pi.email) setPersonalInfo('email', extracted.email)
    if (extracted.location && !pi.location) setPersonalInfo('location', extracted.location)
    if (extracted.age && !pi.age) setPersonalInfo('age', extracted.age)
    if (extracted.jobObjective && !pi.jobObjective) setPersonalInfo('jobObjective', extracted.jobObjective)

    // ── Work experience: match by company name, update existing ──
    if (Array.isArray(extracted.workExperience)) {
      for (const w of extracted.workExperience) {
        const companyName = String(w.company ?? '').trim()
        if (!companyName) continue
        const existing = useResumeStore.getState().data.workExperience.find(
          (we) => we.company.trim().toLowerCase() === companyName.toLowerCase()
        )
        if (existing) {
          if (!existing.role && w.role) updateWork(existing.id, 'role', String(w.role))
          if (!existing.dates && w.dates) updateWork(existing.id, 'dates', String(w.dates))
          if (Array.isArray(w.bullets) && w.bullets.length > 0) {
            const newBullets = w.bullets.map(String).filter((b: string) => !existing.bullets.includes(b))
            if (newBullets.length > 0) {
              updateWork(existing.id, 'bullets', [...existing.bullets, ...newBullets])
            }
          }
        } else {
          addWork()
          const work = useResumeStore.getState().data.workExperience
          const lastWork = work[work.length - 1]
          if (lastWork) {
            updateWork(lastWork.id, 'company', companyName)
            if (w.role) updateWork(lastWork.id, 'role', String(w.role))
            if (w.dates) updateWork(lastWork.id, 'dates', String(w.dates))
            if (Array.isArray(w.bullets) && w.bullets.length > 0) {
              updateWork(lastWork.id, 'bullets', w.bullets.map(String))
            }
          }
        }
      }
      const stateAfterWork = useResumeStore.getState()
      stateAfterWork.data.workExperience
        .filter(we => !we.company.trim() && !we.role.trim())
        .forEach(we => removeWork(we.id))
    }

    // ── Education: match by school name, update existing ──
    if (Array.isArray(extracted.education)) {
      for (const e of extracted.education) {
        const schoolName = String(e.school ?? '').trim()
        if (!schoolName) continue
        const existing = useResumeStore.getState().data.education.find(
          (ed) => ed.school.trim().toLowerCase() === schoolName.toLowerCase()
        )
        if (existing) {
          if (!existing.degree && e.degree) updateEducation(existing.id, 'degree', String(e.degree))
          if (!existing.major && e.major) updateEducation(existing.id, 'major', String(e.major))
          if (!existing.dates && e.dates) updateEducation(existing.id, 'dates', String(e.dates))
        } else {
          addEducation()
          const edu = useResumeStore.getState().data.education
          const lastEdu = edu[edu.length - 1]
          if (lastEdu) {
            updateEducation(lastEdu.id, 'school', schoolName)
            if (e.degree) updateEducation(lastEdu.id, 'degree', String(e.degree))
            if (e.major) updateEducation(lastEdu.id, 'major', String(e.major))
            if (e.dates) updateEducation(lastEdu.id, 'dates', String(e.dates))
          }
        }
      }
      const stateAfterEdu = useResumeStore.getState()
      stateAfterEdu.data.education
        .filter(ed => !ed.school.trim() && !ed.degree.trim())
        .forEach(ed => removeEducation(ed.id))
    }

    // ── Projects: match by project name, update existing ──
    if (Array.isArray(extracted.projects)) {
      for (const p of extracted.projects) {
        const projectName = String(p.name ?? '').trim()
        if (!projectName) continue
        const existing = useResumeStore.getState().data.aiProjects.find(
          (pr) => pr.name.trim().toLowerCase() === projectName.toLowerCase()
        )
        if (existing) {
          if (!existing.direction && p.role) updateProject(existing.id, 'direction', String(p.role))
          if (!existing.description && p.description) updateProject(existing.id, 'description', String(p.description))
          const pDates = (p as any).dates
          if (!(existing as any).dates && pDates) updateProject(existing.id, 'dates' as any, String(pDates))
        } else {
          addProject()
          const prj = useResumeStore.getState().data.aiProjects
          const lastPrj = prj[prj.length - 1]
          if (lastPrj) {
            updateProject(lastPrj.id, 'name', projectName)
            if (p.role) updateProject(lastPrj.id, 'direction', String(p.role))
            if (p.description) updateProject(lastPrj.id, 'description', String(p.description))
          }
        }
      }
      const stateAfterPrj = useResumeStore.getState()
      stateAfterPrj.data.aiProjects
        .filter(pr => !pr.name.trim() && !pr.direction.trim())
        .forEach(pr => removeProject(pr.id))
    }

    // Skills — match by category, update existing
    if (Array.isArray(extracted.skills)) {
      for (const s of extracted.skills) {
        const catName = String(s.category ?? '').trim()
        if (!catName) continue
        const existingIdx = useResumeStore.getState().data.skills.findIndex(
          (sk) => sk.category.trim().toLowerCase() === catName.toLowerCase()
        )
        if (existingIdx >= 0) {
          if (s.items) updateSkill(existingIdx, 'items', String(s.items))
        } else {
          addSkill()
          const skills = useResumeStore.getState().data.skills
          if (skills.length > 0) {
            const lastIdx = skills.length - 1
            updateSkill(lastIdx, 'category', catName)
            if (s.items) updateSkill(lastIdx, 'items', String(s.items))
          }
        }
      }
    }

    // Languages — deduplicate
    if (Array.isArray(extracted.languages)) {
      const existingLangs = useResumeStore.getState().data.languages.map(l => l.toLowerCase())
      for (const l of extracted.languages) {
        if (l && !existingLangs.includes(String(l).toLowerCase())) {
          addLanguage()
          const langs = useResumeStore.getState().data.languages
          updateLanguage(langs.length - 1, String(l))
        }
      }
    }

    // Honors → custom section
    if (Array.isArray(extracted.honors) && extracted.honors.length > 0) {
      const items = extracted.honors.filter(Boolean) as string[]
      if (items.length > 0 && !useResumeStore.getState().data.customSections.some(s => s.label === '获奖荣誉')) {
        addCustomSection('获奖荣誉', 'Honors & Awards')
        const cs = useResumeStore.getState().data.customSections
        const lastCs = cs[cs.length - 1]
        if (lastCs) {
          const content = items.map((h: string) => `• ${h}`).join('\n')
          useResumeStore.getState().updateCustomSection(lastCs.id, 'content', content)
        }
      }
    }

    // Certificates → custom section
    if (Array.isArray(extracted.certificates) && extracted.certificates.length > 0) {
      const items = extracted.certificates.filter(Boolean) as string[]
      if (items.length > 0 && !useResumeStore.getState().data.customSections.some(s => s.label === '证书资质')) {
        addCustomSection('证书资质', 'Certifications')
        const cs = useResumeStore.getState().data.customSections
        const lastCs = cs[cs.length - 1]
        if (lastCs) {
          const content = items.map((c: string) => `• ${c}`).join('\n')
          useResumeStore.getState().updateCustomSection(lastCs.id, 'content', content)
        }
      }
    }

    if (extracted.selfEvaluation) setSelfEvaluation(String(extracted.selfEvaluation))
    if (extracted.summary) setSummary(String(extracted.summary))
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || finished) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    setLoading(true)
    setError(null)

    const snapshot = buildSnapshot()

    const conversationHistory = newMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const msgs = buildWizardMessages(
      JSON.stringify(snapshot, null, 2),
      conversationHistory.slice(-8),
      text,
    )

    await streamAndParse(msgs, (parsed) => {
      if (parsed.extracted && Object.keys(parsed.extracted).length > 0) {
        applyExtracted(parsed.extracted)
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: parsed.reply, step: parsed.step }
      setMessages([...newMessages, assistantMsg])
      setCurrentStep(parsed.step)
      if (parsed.totalSteps) setTotalSteps(parsed.totalSteps)

      if (parsed.step >= parsed.totalSteps) {
        setFinished(true)
      }
    })

    setLoading(false)
    focusInput()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift = send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    // Shift+Enter = newline (default behavior, no need to handle)
  }

  const handleRestart = () => {
    setMessages([])
    setStarted(false)
    setFinished(false)
    setCurrentStep(0)
    setTotalSteps(7)
    setError(null)
    setStreamingText('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="text-[13px] font-semibold text-gray-800">
              {started ? '简历顾问' : '简历向导'}
            </span>
          </div>
          {finished && (
            <button
              onClick={handleRestart}
              className="text-[11px] text-gray-400 hover:text-[#4F46E5] px-2 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              重新开始
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Welcome screen — before conversation starts */}
        {!started && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center max-w-xs">
              <span className="text-3xl">🤖</span>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 mb-1">简历顾问</p>
                <p className="text-[12px] text-gray-400 leading-relaxed">
                  我会先看看你当前的简历内容，再给出针对性的建议——有内容的帮你优化，空白的带你从零填起。
                </p>
              </div>
              <button
                onClick={handleStartConversation}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white text-[13px] font-medium hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.97] transition-all"
              >
                开始对话
              </button>
            </div>
          </div>
        )}

        {/* Rich loading animation — initial scan */}
        {!started && loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-5 max-w-[280px]">
              {/* Pulsing icon */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4F46E5]/10 to-[#7C3AED]/10 flex items-center justify-center text-3xl animate-pulse">
                  {SCAN_STAGES[scanStage].icon}
                </div>
                {/* Ping ring */}
                <div className="absolute inset-0 rounded-2xl border-2 border-[#7C3AED]/20 animate-ping" />
              </div>

              {/* Stage text with fade transition */}
              <div className="text-center">
                <p
                  key={scanStage}
                  className="text-[13px] font-medium text-gray-700 animate-[fadeIn_0.4s_ease-out]"
                >
                  {SCAN_STAGES[scanStage].text}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  预计需要 3-5 秒
                </p>
              </div>

              {/* Dot progress */}
              <div className="flex items-center gap-1.5">
                {SCAN_STAGES.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      i <= scanStage
                        ? 'bg-[#7C3AED] scale-100'
                        : 'bg-gray-200 scale-75'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white rounded-br-md'
                  : 'bg-gray-50 text-gray-700 rounded-bl-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Typing indicator — during AI response (conversation started) */}
        {loading && started && (
          <div className="flex justify-start">
            <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[12px] text-gray-400 ml-1">
                  {TYPING_PHRASES[typingPhrase]}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="text-[12px] text-red-500 bg-red-50 px-4 py-2 rounded-lg">
              {error}
              <button
                onClick={() => { setError(null); handleSend() }}
                className="ml-2 underline hover:no-underline"
              >
                重试
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {started && (
      <div className="px-5 py-3 border-t border-gray-100">
        {finished ? (
          <div className="text-center py-3">
            <div className="text-2xl mb-1">🎉</div>
            <p className="text-[13px] font-semibold text-gray-800">简历初稿已完成！</p>
            <p className="text-[11px] text-gray-400 mt-1">你可以在左侧编辑器里调整细节，或点击「经历润色」让 AI 帮你精修每段经历。</p>
            <button
              onClick={handleRestart}
              className="mt-3 text-[12px] text-[#4F46E5] hover:underline"
            >
              重新开始对话
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              placeholder={loading ? 'AI 正在回复…' : '输入你的回答…（Shift+Enter 换行）'}
              disabled={loading}
              rows={1}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20 disabled:bg-gray-50 disabled:text-gray-400 transition-colors resize-none"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 h-9 px-4 rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.97] transition-all"
            >
              发送
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
