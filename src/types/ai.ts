// ── AI 配置 ──
export interface AIConfig {
  apiKey: string
  baseURL: string   // 默认 https://api.deepseek.com/v1
  model: string     // 默认 deepseek-v4-pro
}

// ── 经历润色 ──
export type PolishMode = 'star' | 'result' | 'concise'

// ── 岗位适配 ──

/** 分项评分维度 */
export interface DimensionScore {
  name: string          // "岗位匹配度" / "内容完整度" / "表达专业度" / "竞争差异化"
  score: number         // 0-100
  comment: string       // 简短评语
}

/** 单条修改建议 */
export interface Modification {
  type: 'replace' | 'add' | 'delete'
  /** 目标字段定位 */
  target: {
    field: string       // "selfEvaluation" | "workExperience[id].bullets[index]" | "skills[category]" | "personalInfo.jobObjective" | "aiProjects[id].description" | "sectionOrder"
    id?: string         // 数组项 id
    index?: number      // 数组项 index（备选定位）
    text: string        // 原文
  }
  problem: string       // 当前问题
  suggestion: string    // 修改建议说明
  revised: string       // 修改后的完整文字
}

/** 按模块分组的修改集群 */
export interface ModGroup {
  module: string        // "工作经历" / "自我评价" / "技能标签" / "简历结构" / "基本信息"
  items: Modification[]
}

/** 诊断报告完整结果 */
export interface AdaptResult {
  score: number                    // 总分 0-100
  dimensions: DimensionScore[]     // 分项评分（4个维度）
  strengths: string[]              // 核心优势（3-4条）
  weaknesses: string[]             // 主要短板（3-4条）
  modifications: ModGroup[]        // 按模块分组的修改建议
}

// 向后兼容：保留旧字段类型别名（已有代码引用）
export type AdaptMatch = { skill: string; evidence: string; suggestion: string }
export type AdaptMiss = { requirement: string; suggestion: string }
export type AdaptSuggestion = { area: string; detail: string }

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
  // 诊断修改跟踪
  appliedModIds: string[]
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
