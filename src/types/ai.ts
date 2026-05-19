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
export type AITab = 'wizard' | 'polish' | 'adapt' | 'interview' | 'config'

// ── 自定义润色源 ──
export type PolishCustomSource = 'summary' | 'summaryEn' | 'free' | 'selfEvaluation' | 'selfEvaluationEn' | 'customSection'

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
  // 自定义润色（summary / education / free text）
  polishCustomText: string | null
  polishCustomSource: PolishCustomSource | null
  // Project polish target
  polishProjectId: string | null
  // Self evaluation polish
  polishSelfEvaluation: boolean
  // Custom section polish target
  polishCustomSectionId: string | null
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
