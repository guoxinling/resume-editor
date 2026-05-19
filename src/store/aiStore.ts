import { create } from 'zustand'
import type { AIConfig, AITab, AIPanelState, PolishMode, AdaptResult, InterviewQuestion, PolishCustomSource } from '../types/ai'

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
  // Custom polish (summary / education / free text)
  setPolishCustomText: (text: string | null, source: PolishCustomSource | null) => void
  // Project polish
  polishProjectId: string | null
  selectProject: (id: string | null) => void
  // Self evaluation polish
  polishSelfEvaluation: boolean
  selectSelfEvaluation: () => void
  // Custom section polish
  polishCustomSectionId: string | null
  selectCustomSection: (id: string | null) => void
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

const initialPanel: AIPanelState = {
  isOpen: false,
  activeTab: 'wizard',
  selectedExpId: null,
  polishMode: 'star',
  polishResult: null,
  polishLoading: false,
  polishError: null,
  polishCustomText: null,
  polishCustomSource: null,
  polishProjectId: null,
  polishSelfEvaluation: false,
  polishCustomSectionId: null,
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
  selectProject: (id) => set({ polishProjectId: id, polishResult: null, polishError: null }),
  selectSelfEvaluation: () => set({ polishSelfEvaluation: true, polishResult: null, polishError: null }),
  selectCustomSection: (id) => set({ polishCustomSectionId: id, polishResult: null, polishError: null }),
  setPolishMode: (mode) => set({ polishMode: mode }),
  setPolishResult: (result) => set({ polishResult: result }),
  setPolishLoading: (loading) => set({ polishLoading: loading }),
  setPolishError: (error) => set({ polishError: error }),
  setPolishCustomText: (text, source) => set({ polishCustomText: text, polishCustomSource: source, polishResult: null, polishError: null }),
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
