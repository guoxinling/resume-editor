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

const INVALID_VALUE_RE = /^(未知|\(未知\)|未填|未填写|待补充|待填写|暂无|无|n\/?a|null|undefined|-|—)$/i

const cleanValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (!text || INVALID_VALUE_RE.test(text)) return ''
  return text
}

const cleanList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .map(cleanValue)
    .map((text) => text.replace(/^[•\-–—]\s*/, '').trim())
    .filter(Boolean)
    .filter((text) => {
      const key = text.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const comparable = (value: unknown): string =>
  cleanValue(value).toLowerCase().replace(/[\s·,，。:：/|｜（）()【】\[\]\-–—]/g, '')

const shouldUpdate = (current: unknown, incoming: unknown): boolean =>
  !cleanValue(current) && !!cleanValue(incoming)

const languageKey = (value: string): string => {
  const text = value.toLowerCase()
  if (/英语|english|cet|六级|四级|雅思|托福|ielts|toefl/.test(text)) return '英语'
  if (/德语|德文|german|testdaf/.test(text)) return '德语'
  if (/日语|日文|japanese|jlpt|n1|n2/.test(text)) return '日语'
  if (/法语|法文|french/.test(text)) return '法语'
  if (/韩语|韩文|korean/.test(text)) return '韩语'
  if (/西班牙语|spanish/.test(text)) return '西班牙语'
  return cleanValue(value)
}

const languageDetails = (value: string): string[] => {
  const text = cleanValue(value)
  const details: string[] = []
  if (/cet[-\s]?6|六级/i.test(text)) details.push('CET-6')
  if (/cet[-\s]?4|四级/i.test(text)) details.push('CET-4')
  if (/专业八级|专八/.test(text)) details.push('专业八级')
  if (/专业四级|专四/.test(text)) details.push('专业四级')
  if (/雅思|ielts/i.test(text)) details.push(text.match(/雅思\s*\d+(\.\d+)?|ielts\s*\d+(\.\d+)?/i)?.[0] || '雅思')
  if (/托福|toefl/i.test(text)) details.push(text.match(/托福\s*\d+|toefl\s*\d+/i)?.[0] || '托福')
  if (/工作语言|办公语言|商务|流利|熟练|无障碍|日常交流|沟通没问题|交流没问题/.test(text)) details.push('可作为工作语言')
  return details
}

const formatLanguage = (key: string, details: string[]): string => {
  const cleanKey = cleanValue(key)
  const unique = Array.from(new Set(details.map(cleanValue).filter(Boolean)))
  return unique.length > 0 ? `${cleanKey}：${unique.join('，')}` : cleanKey
}

const normalizeLanguage = (value: unknown): string => {
  const text = cleanValue(value)
  if (!text) return ''
  const key = languageKey(text)
  return formatLanguage(key, languageDetails(text))
}

const mergeLanguageList = (values: unknown[]): string[] => {
  const buckets = new Map<string, string[]>()
  const fallback: string[] = []

  for (const value of values) {
    const normalized = normalizeLanguage(value)
    if (!normalized) continue
    const key = languageKey(normalized)
    const stableKey = comparable(key)
    if (!stableKey) continue

    if (stableKey === comparable(normalized) && !['英语', '德语', '日语', '法语', '韩语', '西班牙语'].includes(key)) {
      const exact = comparable(normalized)
      if (!fallback.some((item) => comparable(item) === exact)) fallback.push(normalized)
      continue
    }

    const details = normalized.includes('：')
      ? normalized.split('：').slice(1).join('：').split(/[，,、/]/).map(cleanValue).filter(Boolean)
      : []
    buckets.set(stableKey, [...(buckets.get(stableKey) || []), ...details])
  }

  const merged = Array.from(buckets.entries()).map(([key, details]) => {
    const label = ['英语', '德语', '日语', '法语', '韩语', '西班牙语'].find((item) => comparable(item) === key) || key
    return formatLanguage(label, details)
  })

  return [...merged, ...fallback]
}

export default function Wizard() {
  const { setPersonalInfo, setSummary, setSelfEvaluation, addWork, updateWork, removeWork, addProject, updateProject, removeProject, addEducation, updateEducation, removeEducation, addSkill, updateSkill, addLanguage, updateLanguage, removeLanguage, addCustomSection } = useResumeStore()

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
    if (cleanValue(d.personalInfo.name) || cleanValue(d.personalInfo.phone) || cleanValue(d.personalInfo.email)) filledModules.push('个人信息')
    if (d.workExperience.some(w => cleanValue(w.company) || cleanValue(w.role))) filledModules.push('工作经历')
    if (d.education.some(e => cleanValue(e.school))) filledModules.push('教育背景')
    if (d.aiProjects.some(p => cleanValue(p.name) || cleanValue(p.direction))) filledModules.push('项目经历')
    if (d.skills.some(s => cleanValue(s.category) || cleanValue(s.items))) filledModules.push('技能')
    if (d.languages.some(cleanValue)) filledModules.push('语言能力')
    if (cleanValue(d.selfEvaluation)) filledModules.push('自我评价')
    if (d.customSections.some(s => cleanValue(s.content))) filledModules.push('自定义模块')

    const incompleteWork = d.workExperience.find(
      w => (cleanValue(w.company) || cleanValue(w.role)) && (!cleanValue(w.dates) || cleanList(w.bullets).length < 3)
    )
    const recommendedNextFocus = incompleteWork
      ? `继续完善工作经历：${cleanValue(incompleteWork.company) || cleanValue(incompleteWork.role)}，优先补充${!cleanValue(incompleteWork.dates) ? '任职时间' : '职责成果'}`
      : ''

    return {
      summary: {
        modulesFilled: filledModules.length,
        modulesList: filledModules,
        recommendedNextFocus,
      },
      personalInfo: {
        name: cleanValue(d.personalInfo.name),
        phone: cleanValue(d.personalInfo.phone),
        email: cleanValue(d.personalInfo.email),
        location: cleanValue(d.personalInfo.location),
        age: cleanValue(d.personalInfo.age),
        jobObjective: cleanValue(d.personalInfo.jobObjective),
      },
      workExperience: d.workExperience.map(w => ({
        company: cleanValue(w.company),
        role: cleanValue(w.role),
        dates: cleanValue(w.dates),
        bullets: cleanList(w.bullets).slice(0, 5),
      })),
      education: d.education.map(e => ({
        school: cleanValue(e.school),
        degree: cleanValue(e.degree),
        major: cleanValue(e.major),
        dates: cleanValue(e.dates),
      })),
      projects: d.aiProjects.map(p => ({
        name: cleanValue(p.name),
        role: cleanValue(p.direction),
        dates: cleanValue((p as any).dates),
        description: cleanValue(p.description).slice(0, 200),
      })),
      skills: d.skills.map(s => ({
        category: cleanValue(s.category),
        items: cleanValue(s.items).slice(0, 100),
      })),
      languages: mergeLanguageList(d.languages),
      selfEvaluation: cleanValue(d.selfEvaluation).slice(0, 200),
      customSections: d.customSections.map(s => ({
        label: cleanValue(s.label),
        content: cleanValue(s.content).slice(0, 150),
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
    const cleaned = raw.replace(/```json\s*|```/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
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
    const setPersonalIfUseful = (field: keyof typeof pi, value: unknown) => {
      const cleaned = cleanValue(value)
      if (cleaned && shouldUpdate(pi[field], cleaned)) setPersonalInfo(field, cleaned)
    }

    setPersonalIfUseful('name', extracted.name)
    setPersonalIfUseful('phone', extracted.phone)
    setPersonalIfUseful('email', extracted.email)
    setPersonalIfUseful('location', extracted.location)
    setPersonalIfUseful('age', extracted.age)
    setPersonalIfUseful('jobObjective', extracted.jobObjective)

    const findWorkForMerge = (w: Record<string, any>) => {
      const companyName = cleanValue(w.company)
      const roleName = cleanValue(w.role)
      const all = useResumeStore.getState().data.workExperience

      if (companyName) {
        const companyKey = comparable(companyName)
        const match = all.find((we) => {
          const key = comparable(we.company)
          return key && (key === companyKey || key.includes(companyKey) || companyKey.includes(key))
        })
        if (match) return match
      }

      if (roleName) {
        const roleKey = comparable(roleName)
        const match = all.find((we) => comparable(we.role) === roleKey)
        if (match) return match
      }

      const incomplete = all.filter(
        (we) => (cleanValue(we.company) || cleanValue(we.role)) && (!cleanValue(we.dates) || cleanList(we.bullets).length < 3)
      )
      if (!companyName && incomplete.length === 1) return incomplete[0]
      if (!companyName && !roleName && all.length === 1) return all[0]
      return undefined
    }

    const mergeBullets = (current: string[], incoming: string[]): string[] => {
      const result = cleanList(current)
      for (const bullet of incoming) {
        const key = comparable(bullet)
        if (key && !result.some((item) => comparable(item) === key)) result.push(bullet)
      }
      return result
    }

    // ── Work experience: match by company name, update existing ──
    if (Array.isArray(extracted.workExperience)) {
      for (const w of extracted.workExperience) {
        const companyName = cleanValue(w.company)
        const roleName = cleanValue(w.role)
        const dates = cleanValue(w.dates)
        const bullets = cleanList(w.bullets)
        if (!companyName && !roleName && !dates && bullets.length === 0) continue

        const existing = findWorkForMerge(w)
        if (existing) {
          if (shouldUpdate(existing.company, companyName)) updateWork(existing.id, 'company', companyName)
          if (shouldUpdate(existing.role, roleName)) updateWork(existing.id, 'role', roleName)
          if (shouldUpdate(existing.dates, dates)) updateWork(existing.id, 'dates', dates)

          const latest = useResumeStore.getState().data.workExperience.find((we) => we.id === existing.id) || existing
          const mergedBullets = mergeBullets(latest.bullets, bullets)
          if (mergedBullets.length > cleanList(latest.bullets).length) {
            updateWork(existing.id, 'bullets', mergedBullets)
          }
        } else {
          if (!companyName && !roleName) continue
          addWork()
          const work = useResumeStore.getState().data.workExperience
          const lastWork = work[work.length - 1]
          if (lastWork) {
            if (companyName) updateWork(lastWork.id, 'company', companyName)
            if (roleName) updateWork(lastWork.id, 'role', roleName)
            if (dates) updateWork(lastWork.id, 'dates', dates)
            if (bullets.length > 0) updateWork(lastWork.id, 'bullets', bullets)
          }
        }
      }
      const stateAfterWork = useResumeStore.getState()
      stateAfterWork.data.workExperience
        .filter(we => !cleanValue(we.company) && !cleanValue(we.role))
        .forEach(we => removeWork(we.id))
    }

    // ── Education: match by school name, update existing ──
    if (Array.isArray(extracted.education)) {
      for (const e of extracted.education) {
        const schoolName = cleanValue(e.school)
        const degree = cleanValue(e.degree)
        const major = cleanValue(e.major)
        const dates = cleanValue(e.dates)
        if (!schoolName && !degree && !major && !dates) continue
        const existing = useResumeStore.getState().data.education.find(
          (ed) => comparable(ed.school) === comparable(schoolName)
        )
        if (existing) {
          if (shouldUpdate(existing.degree, degree)) updateEducation(existing.id, 'degree', degree)
          if (shouldUpdate(existing.major, major)) updateEducation(existing.id, 'major', major)
          if (shouldUpdate(existing.dates, dates)) updateEducation(existing.id, 'dates', dates)
        } else {
          if (!schoolName) continue
          addEducation()
          const edu = useResumeStore.getState().data.education
          const lastEdu = edu[edu.length - 1]
          if (lastEdu) {
            updateEducation(lastEdu.id, 'school', schoolName)
            if (degree) updateEducation(lastEdu.id, 'degree', degree)
            if (major) updateEducation(lastEdu.id, 'major', major)
            if (dates) updateEducation(lastEdu.id, 'dates', dates)
          }
        }
      }
      const stateAfterEdu = useResumeStore.getState()
      stateAfterEdu.data.education
        .filter(ed => !cleanValue(ed.school) && !cleanValue(ed.degree))
        .forEach(ed => removeEducation(ed.id))
    }

    // ── Projects: match by project name, update existing ──
    if (Array.isArray(extracted.projects)) {
      for (const p of extracted.projects) {
        const projectName = cleanValue(p.name)
        const role = cleanValue(p.role)
        const dates = cleanValue((p as any).dates)
        const description = cleanValue(p.description)
        if (!projectName && !role && !dates && !description) continue
        const existing = useResumeStore.getState().data.aiProjects.find(
          (pr) => comparable(pr.name) === comparable(projectName)
        )
        if (existing) {
          if (shouldUpdate(existing.direction, role)) updateProject(existing.id, 'direction', role)
          if (shouldUpdate(existing.description, description)) updateProject(existing.id, 'description', description)
          if (shouldUpdate((existing as any).dates, dates)) updateProject(existing.id, 'dates' as any, dates)
        } else {
          if (!projectName) continue
          addProject()
          const prj = useResumeStore.getState().data.aiProjects
          const lastPrj = prj[prj.length - 1]
          if (lastPrj) {
            updateProject(lastPrj.id, 'name', projectName)
            if (role) updateProject(lastPrj.id, 'direction', role)
            if (dates) updateProject(lastPrj.id, 'dates' as any, dates)
            if (description) updateProject(lastPrj.id, 'description', description)
          }
        }
      }
      const stateAfterPrj = useResumeStore.getState()
      stateAfterPrj.data.aiProjects
        .filter(pr => !cleanValue(pr.name) && !cleanValue(pr.direction))
        .forEach(pr => removeProject(pr.id))
    }

    // Skills — match by category, update existing
    if (Array.isArray(extracted.skills)) {
      for (const s of extracted.skills) {
        const catName = cleanValue(s.category)
        if (!catName) continue
        const items = Array.isArray(s.items) ? cleanList(s.items).join('、') : cleanValue(s.items)
        const existingIdx = useResumeStore.getState().data.skills.findIndex(
          (sk) => comparable(sk.category) === comparable(catName)
        )
        if (existingIdx >= 0) {
          if (items && shouldUpdate(useResumeStore.getState().data.skills[existingIdx].items, items)) updateSkill(existingIdx, 'items', items)
        } else {
          addSkill()
          const skills = useResumeStore.getState().data.skills
          if (skills.length > 0) {
            const lastIdx = skills.length - 1
            updateSkill(lastIdx, 'category', catName)
            if (items) updateSkill(lastIdx, 'items', items)
          }
        }
      }
    }

    // Languages — normalize and merge by language
    if (Array.isArray(extracted.languages)) {
      const current = useResumeStore.getState().data.languages
      const merged = mergeLanguageList([...current, ...cleanList(extracted.languages)])
      for (let i = current.length - 1; i >= merged.length; i -= 1) {
        removeLanguage(i)
      }
      for (let i = 0; i < merged.length; i += 1) {
        if (i < useResumeStore.getState().data.languages.length) {
          updateLanguage(i, merged[i])
        } else {
          addLanguage()
          updateLanguage(useResumeStore.getState().data.languages.length - 1, merged[i])
        }
      }
    }

    const addOrMergeCustomSection = (label: string, labelEn: string, rawItems: unknown[]) => {
      const items = cleanList(rawItems)
      if (items.length === 0) return
      const store = useResumeStore.getState()
      const existing = store.data.customSections.find(s => s.label === label)
      if (existing) {
        const currentItems = existing.content
          .split('\n')
          .map((line) => cleanValue(line.replace(/^[•\-–—]\s*/, '')))
          .filter(Boolean)
        const merged = mergeBullets(currentItems, items)
        store.updateCustomSection(existing.id, 'content', merged.map((item) => `• ${item}`).join('\n'))
        return
      }
      addCustomSection(label, labelEn)
      const cs = useResumeStore.getState().data.customSections
      const lastCs = cs[cs.length - 1]
      if (lastCs) {
        useResumeStore.getState().updateCustomSection(lastCs.id, 'content', items.map((item) => `• ${item}`).join('\n'))
      }
    }

    // Honors → custom section
    if (Array.isArray(extracted.honors) && extracted.honors.length > 0) {
      addOrMergeCustomSection('获奖荣誉', 'Honors & Awards', extracted.honors)
    }

    // Certificates → custom section
    if (Array.isArray(extracted.certificates) && extracted.certificates.length > 0) {
      addOrMergeCustomSection('证书资质', 'Certifications', extracted.certificates)
    }

    const selfEvaluation = cleanValue(extracted.selfEvaluation)
    const summary = cleanValue(extracted.summary)
    if (selfEvaluation) setSelfEvaluation(selfEvaluation)
    if (summary) setSummary(summary)
  }

  const handleSend = async (overrideText?: string, options?: { appendUser?: boolean }) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading || finished) return
    const appendUser = options?.appendUser !== false
    if (!overrideText) setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = appendUser ? [...messages, userMsg] : messages
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

  const retryLastMessage = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content
    if (!lastUser) return
    setError(null)
    handleSend(lastUser, { appendUser: false })
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
              onClick={retryLastMessage}
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
              onClick={() => handleSend()}
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
