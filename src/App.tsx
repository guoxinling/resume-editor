import { useResumeStore } from './store/resumeStore'
import { useAIStore } from './store/aiStore'
import Toolbar from './components/Toolbar'
import EditorPanel from './components/EditorPanel'
import PreviewPanel from './components/PreviewPanel'
import DraftManager from './components/DraftManager'
import AIPanel from './components/ai/AIPanel'
import LandingPage from './components/LandingPage'
import NewResumeModal from './components/NewResumeModal'
import HistoryPanel from './components/HistoryPanel'
import CreditsPanel from './components/CreditsPanel'
import SettingsEntry from './components/SettingsEntry'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAutoSave } from './utils/autoSave'
import { listDrafts, loadDraft } from './utils/storage'
import { useCreditsStore } from './store/creditsStore'
import type { DraftMeta, ResumeData } from './types/resume'

const AUTO_SAVE_DRAFT_ID = 'auto-save'
const TEMPLATE_NAMES = ['经典商务', '极简白纸', '科技产品', '海外双语']

/** Migrate old stored data to the current schema (safe against missing/extra fields). */
function migrateData(raw: unknown): ResumeData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const pi = (d.personalInfo && typeof d.personalInfo === 'object' ? d.personalInfo : {}) as Record<string, unknown>
  return {
    personalInfo: {
      name: String(pi.name ?? ''),
      nameEn: String(pi.nameEn ?? ''),
      phone: String(pi.phone ?? ''),
      email: String(pi.email ?? ''),
      location: String(pi.location ?? ''),
      locationEn: String(pi.locationEn ?? ''),
      portfolio: String(pi.portfolio ?? ''),
      age: String(pi.age ?? ''),
      photo: (typeof pi.photo === 'string' && pi.photo) ? pi.photo : undefined,
      jobObjective: String(pi.jobObjective ?? ''),
      jobObjectiveEn: String(pi.jobObjectiveEn ?? ''),
      customFields: Array.isArray(pi.customFields)
        ? (pi.customFields as Array<Record<string, unknown>>).map((f) => ({ key: String(f.key ?? ''), value: String(f.value ?? '') }))
        : [],
    },
    summary: String(d.summary ?? ''),
    summaryEn: String(d.summaryEn ?? ''),
    workExperience: Array.isArray(d.workExperience) ? (d.workExperience as Array<Record<string, unknown>>).map((w) => ({
      id: String(w.id ?? ''),
      company: String(w.company ?? ''), companyEn: String(w.companyEn ?? ''),
      role: String(w.role ?? ''), roleEn: String(w.roleEn ?? ''),
      dates: String(w.dates ?? ''), datesEn: String(w.datesEn ?? ''),
      bullets: Array.isArray(w.bullets) ? w.bullets.map(String) : [''],
      bulletsEn: Array.isArray(w.bulletsEn) ? w.bulletsEn.map(String) : [''],
    })) : [],
    aiProjects: Array.isArray(d.aiProjects) ? (d.aiProjects as Array<Record<string, unknown>>).map((p) => ({
      id: String(p.id ?? ''),
      name: String(p.name ?? ''), nameEn: String(p.nameEn ?? ''),
      direction: String(p.direction ?? ''), directionEn: String(p.directionEn ?? ''),
      dates: String(p.dates ?? ''), datesEn: String(p.datesEn ?? ''),
      description: String(p.description ?? ''), descriptionEn: String(p.descriptionEn ?? ''),
    })) : [],
    education: Array.isArray(d.education) ? (d.education as Array<Record<string, unknown>>).map((e) => ({
      id: String(e.id ?? ''),
      school: String(e.school ?? ''), schoolEn: String(e.schoolEn ?? ''),
      degree: String(e.degree ?? ''), degreeEn: String(e.degreeEn ?? ''),
      major: String(e.major ?? ''), majorEn: String(e.majorEn ?? ''),
      dates: String(e.dates ?? ''), datesEn: String(e.datesEn ?? ''),
      highlights: Array.isArray(e.highlights) ? e.highlights.map(String) : [''],
      highlightsEn: Array.isArray(e.highlightsEn) ? e.highlightsEn.map(String) : [''],
    })) : [],
    skills: Array.isArray(d.skills) ? d.skills.map((s: Record<string, unknown>) => ({
      category: String(s.category ?? ''), categoryEn: String(s.categoryEn ?? ''),
      items: String(s.items ?? ''), itemsEn: String(s.itemsEn ?? ''),
    })) : [],
    languages: Array.isArray(d.languages) ? d.languages.map(String) : [],
    languagesEn: Array.isArray(d.languagesEn) ? d.languagesEn.map(String) : [],
    selfEvaluation: String(d.selfEvaluation ?? ''),
    selfEvaluationEn: String(d.selfEvaluationEn ?? ''),
    customSections: Array.isArray(d.customSections) ? (d.customSections as Array<Record<string, unknown>>).map((cs) => ({
      id: String(cs.id ?? `custom_${Math.random()}`),
      label: String(cs.label ?? ''), labelEn: String(cs.labelEn ?? ''),
      content: String(cs.content ?? ''), contentEn: String(cs.contentEn ?? ''),
    })) : [],
    lang: (d.lang === 'en' ? 'en' : 'zh') as 'zh' | 'en',
  }
}

export default function App() {
  const [showDrafts, setShowDrafts] = useState(false)
  const [showNewResume, setShowNewResume] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState<'landing' | 'editor'>('landing')
  const [drafts, setDrafts] = useState<DraftMeta[]>([])
  const [isLoggedIn] = useState(() => localStorage.getItem('jianliya-demo-logged-in') === '1')
  const loadData = useResumeStore((s) => s.loadData)
  const setDraftInfo = useResumeStore((s) => s.setDraftInfo)
  const resetResume = useResumeStore((s) => s.reset)

  // Responsive: editor visibility toggle for small screens
  const [showEditor, setShowEditor] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isPanelOpen = useAIStore((s) => s.isOpen)
  const credits = useCreditsStore()

  const refreshDrafts = useCallback(() => {
    listDrafts().then((all) => setDrafts(all.filter((draft) => draft.id !== AUTO_SAVE_DRAFT_ID)))
  }, [])

  const handleLandingWizard = () => {
    setPage('editor')
    useAIStore.getState().setActiveTab('wizard')
    useAIStore.getState().openPanel()
  }

  const handleLandingImport = () => {
    setPage('editor')
    // Trigger file input after landing page unmounts
    setTimeout(() => fileInputRef.current?.click(), 300)
  }

  const handleLandingFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (ext === 'md' || ext === 'txt') {
      try {
        const { parseMarkdownResume } = await import('./utils/markdownParser')
        const text = await file.text()
        const parsed = parseMarkdownResume(text)
        if (parsed) loadData(parsed)
      } catch { /* ignore */ }
      return
    }

    // PDF / Image → dynamic import
    const { importResumeFromFile } = await import('./services/resumeImport')
    const result = await importResumeFromFile(file, () => {})
    loadData(result)
  }, [loadData])

  const handleDraftContinue = () => {
    setPage('editor')
  }

  const handleBlankResume = () => {
    setShowNewResume(false)
    resetResume()
    setPage('editor')
  }

  const handleTemplateSelect = (templateIndex: number) => {
    setShowNewResume(false)
    resetResume()
    setDraftInfo(null, `${TEMPLATE_NAMES[templateIndex] || '模板'}简历`)
    setPage('editor')
  }

  const handleViewAllTemplates = () => {
    setShowNewResume(false)
    window.location.hash = 'templates'
    setPage('landing')
  }

  const handleLoadHistoryResume = async (id: string) => {
    const data = await loadDraft(id)
    const meta = drafts.find((draft) => draft.id === id)
    if (data) {
      loadData(data)
      setDraftInfo(id, meta?.name || '未命名简历')
      setPage('editor')
    }
  }

  useAutoSave()

  // Detect screen size to auto-show/hide editor
  useEffect(() => {
    const check = () => {
      // Auto-show editor on desktop, hide on mobile unless toggled
      if (window.innerWidth >= 1024) {
        setShowEditor(true)
      }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadDraft(AUTO_SAVE_DRAFT_ID)
      .then((rawData) => {
        if (cancelled) return
        try {
          if (rawData) {
            const migrated = migrateData(rawData)
            loadData(migrated)
          }
        } catch (err) {
          console.error('Data migration failed:', err)
          setLoadError('数据加载失败，已使用空白简历')
        }
        setLoaded(true)
      })
      .catch((err) => {
        console.error('Draft load failed:', err)
        setLoadError('草稿读取失败，已使用空白简历')
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [loadData])

  useEffect(() => {
    refreshDrafts()
  }, [refreshDrafts, page, showDrafts])

  if (!loaded) return null

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <p className="text-gray-500 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => { useResumeStore.getState().reset(); setLoadError(null) }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            重置数据
          </button>
        </div>
      </div>
    )
  }

  if (page === 'landing') {
    return (
      <LandingPage
        onImportClick={handleLandingImport}
        onDraftContinue={handleDraftContinue}
        onWizardClick={handleLandingWizard}
      />
    )
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100 lg:p-3">
      {/* Main content wrapper — shifts left when AI panel opens */}
      <div className={`w-full transition-[margin-right] duration-300 ease-out ${isPanelOpen ? 'lg:mr-[520px]' : ''}`}>
      <div className="flex flex-col lg:rounded-2xl bg-white lg:shadow-lg lg:shadow-gray-200/40 overflow-hidden max-w-[1440px] mx-auto h-full lg:max-h-[calc(100vh-24px)]">
        <Toolbar
          onOpenDrafts={() => setShowDrafts(true)}
          onNewClick={() => setShowNewResume(true)}
          onCreditsClick={() => setShowCredits((open) => !open)}
          showEditor={showEditor}
          onToggleEditor={() => setShowEditor(!showEditor)}
          onGoHome={() => {
            setPage('landing')
          }}
        />

        {/* ── Editor + Preview (responsive) ── */}
        <div className="flex-1 flex overflow-hidden relative">
          <HistoryPanel
            isLoggedIn={isLoggedIn}
            resumes={drafts}
            onLoadResume={handleLoadHistoryResume}
          />

          {/* Desktop sidebar editor — hidden by default on mobile */}
          <div className={`hidden lg:flex ${showEditor ? 'lg:flex' : 'lg:hidden'}`}>
            <EditorPanel />
          </div>

          {/* Preview (always visible, takes remaining space) */}
          <div className="flex-1 overflow-hidden">
            <PreviewPanel />
          </div>

          {/* Mobile bottom-sheet editor */}
          <div className={`lg:hidden fixed inset-0 z-30 transition-transform duration-300 ${showEditor ? 'translate-y-0' : 'translate-y-full'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowEditor(false)} />
            {/* Sheet */}
            <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <EditorPanel />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating editor toggle (mobile) */}
      <button
        onClick={() => setShowEditor(!showEditor)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-lg hover:bg-indigo-700 transition-colors active:scale-95"
        title={showEditor ? '关闭编辑器' : '打开编辑器'}
      >
        {showEditor ? '✕' : '✎'}
      </button>

      {showDrafts && <DraftManager onClose={() => setShowDrafts(false)} />}
      <NewResumeModal
        isOpen={showNewResume}
        onClose={() => setShowNewResume(false)}
        onWizardClick={() => { setShowNewResume(false); handleLandingWizard() }}
        onImportClick={() => { setShowNewResume(false); handleLandingImport() }}
        onBlankClick={handleBlankResume}
        onTemplateSelect={handleTemplateSelect}
        onViewAllTemplates={handleViewAllTemplates}
      />
      <CreditsPanel
        isOpen={showCredits}
        onClose={() => setShowCredits(false)}
        daily={Math.max(0, credits.dailyTotal - credits.dailyUsed)}
        total={credits.dailyTotal + credits.purchased}
      />
      <SettingsEntry isLoggedIn={isLoggedIn} />
      <AIPanel />
      {/* Hidden file input for landing page import trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleLandingFileImport}
      />
      </div>
    </div>
  )
}
