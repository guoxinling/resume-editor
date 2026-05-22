import { useEffect, useRef, useState } from 'react'
import { useAIStore } from '../../store/aiStore'
import { useResumeStore } from '../../store/resumeStore'
import { streamChat } from '../../services/aiClient'
import type { ChatMessage } from '../../types/ai'

type ChatBubble = ChatMessage & { id: string }

const quickActions = [
  {
    id: 'polish',
    label: '✨ 润色',
    prompt: '请润色我的简历内容，优先指出最需要改进的 3 个模块，并给出可直接替换的简历表达。',
  },
  {
    id: 'adapt',
    label: '🎯 适配JD',
    prompt: '',
  },
  {
    id: 'diagnose',
    label: '🩺 诊断',
    prompt: '请对我的简历进行全面诊断，从结构完整度、表达专业度、岗位匹配度、竞争差异化四个维度给出建议。',
  },
  {
    id: 'interview',
    label: '💡 预测',
    prompt: '请基于我的简历生成面试预测问题，按问题、追问意图、回答建议三部分输出。',
  },
]

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getSeedMessage(tab: string) {
  if (tab === 'wizard') return '我会以面试式对话带你从零生成简历。先告诉我你的目标岗位和最近一段经历。'
  if (tab === 'polish') return quickActions[0].prompt
  if (tab === 'adapt') return '请粘贴目标 JD，我会输出匹配度、缺失关键词和可应用修改建议。'
  if (tab === 'interview') return quickActions[3].prompt
  return ''
}

export default function AIPanel() {
  const isOpen = useAIStore((s) => s.isOpen)
  const closePanel = useAIStore((s) => s.closePanel)
  const activeTab = useAIStore((s) => s.activeTab)
  const resume = useResumeStore((s) => s.data)

  const [input, setInput] = useState('')
  const [jdInput, setJdInput] = useState('')
  const [showJdInput, setShowJdInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好，我是简历鸭 AI 助手。你可以直接描述想优化的地方，也可以点击上方快捷胶囊开始。',
    },
  ])
  const abortRef = useRef<AbortController | null>(null)
  const lastSeedRef = useRef('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const seed = getSeedMessage(activeTab)
    if (!seed || lastSeedRef.current === `${activeTab}:${seed}`) return
    lastSeedRef.current = `${activeTab}:${seed}`
    setInput(seed)
  }, [activeTab, isOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput('')
    setShowJdInput(false)
    setJdInput('')
    setLoading(true)

    const userMessage: ChatBubble = { id: createId(), role: 'user', content: trimmed }
    const assistantMessage: ChatBubble = { id: createId(), role: 'assistant', content: '' }
    const history = [...messages, userMessage].filter((message) => message.role !== 'system')
    setMessages((prev) => [...prev, userMessage, assistantMessage])

    const apiMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          '你是简历鸭的 AI 简历助手。请基于用户真实经历提供简历优化建议，不编造事实。输出要结构清晰，优先给可直接替换的中文简历表达。',
      },
      {
        role: 'user',
        content: `当前简历 JSON：\n${JSON.stringify(resume, null, 2)}`,
      },
      ...history.map(({ role, content }) => ({ role, content })),
    ]

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    await streamChat(
      apiMessages,
      {
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id ? { ...message, content: message.content + token } : message
            )
          )
        },
        onDone: () => {
          setLoading(false)
        },
        onError: (error) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: `请求失败：${error}。你可以先检查 API 配置，后续会接入后端代理。` }
                : message
            )
          )
          setLoading(false)
        },
      },
      abortRef.current.signal,
    )
  }

  const handleQuickAction = (actionId: string) => {
    const action = quickActions.find((item) => item.id === actionId)
    if (!action) return
    if (action.id === 'adapt') {
      setShowJdInput((open) => !open)
      return
    }
    void send(action.prompt)
  }

  const handleJdSubmit = () => {
    const text = jdInput.trim()
    if (!text) return
    void send(`请根据以下目标 JD 对我的简历做岗位适配分析，并给出可应用修改建议：\n\n${text}`)
  }

  const handleClose = () => {
    abortRef.current?.abort()
    setLoading(false)
    closePanel()
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-[520px] max-w-[100vw] flex-col bg-[#FFFBFE] shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#CAC4D0]/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EADDFF] text-[#6750A4]">💬</span>
            <div>
              <h2 className="text-[15px] font-black text-[#1C1B1F]">AI 助手</h2>
              <p className="text-xs font-bold text-[#79747E]">统一对话 + 快捷胶囊</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#49454F] transition hover:bg-[#F3EDF7] hover:text-[#1C1B1F]"
          >
            x
          </button>
        </div>

        <div className="border-b border-[#CAC4D0]/70 bg-[#FFFBFE] p-4">
          <div className="rounded-3xl border border-[#CAC4D0]/70 bg-white p-3 shadow-sm">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void send(input)
              }}
              placeholder="输入你想让 AI 做的事..."
              className="min-h-[86px] w-full resize-none bg-transparent text-sm leading-6 text-[#1C1B1F] outline-none placeholder:text-[#79747E]"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#79747E]">Ctrl/⌘ + Enter 发送</span>
              <button
                type="button"
                onClick={() => void send(input)}
                disabled={loading || !input.trim()}
                className="h-9 rounded-full bg-[#6750A4] px-4 text-sm font-black text-white transition hover:bg-[#5F479E] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? '生成中' : '发送'}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action.id)}
                className="h-12 rounded-2xl border border-[#CAC4D0]/70 bg-[#F7F2FA] text-sm font-black text-[#49454F] transition hover:-translate-y-0.5 hover:border-[#6750A4]/45 hover:bg-[#EADDFF] hover:text-[#21005D]"
              >
                {action.label}
              </button>
            ))}
          </div>

          {showJdInput && (
            <div className="mt-3 rounded-3xl border border-[#CAC4D0]/70 bg-[#F7F2FA] p-3">
              <textarea
                value={jdInput}
                onChange={(event) => setJdInput(event.target.value)}
                placeholder="粘贴目标 JD..."
                className="min-h-[96px] w-full resize-none rounded-2xl border border-[#CAC4D0]/70 bg-white p-3 text-sm leading-6 outline-none focus:border-[#6750A4]"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleJdSubmit}
                  className="h-9 rounded-full bg-[#6750A4] px-4 text-sm font-black text-white hover:bg-[#5F479E]"
                >
                  开始适配
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F7F2FA] p-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-[#6750A4] text-white'
                      : 'border border-[#CAC4D0]/70 bg-[#FFFBFE] text-[#1C1B1F]'
                  }`}
                >
                  {message.content || (loading ? '正在组织建议...' : '')}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </>
  )
}
