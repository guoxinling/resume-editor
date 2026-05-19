import { useResumeStore } from './store/resumeStore'
import { useAIStore } from './store/aiStore'
import Toolbar from './components/Toolbar'
import EditorPanel from './components/EditorPanel'
import PreviewPanel from './components/PreviewPanel'
import DraftManager from './components/DraftManager'
import AIPanel from './components/ai/AIPanel'
import LandingPage from './components/LandingPage'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAutoSave } from './utils/autoSave'
import { loadDraft } from './utils/storage'
import type { ResumeData } from './types/resume'

const AUTO_SAVE_DRAFT_ID = 'auto-save'
const LANDING_KEY = 'resume-has-visited'

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
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadData = useResumeStore((s) => s.loadData)

  // Landing page
  const [showLanding, setShowLanding] = useState(() => {
    return localStorage.getItem(LANDING_KEY) !== '1'
  })

  // Responsive: editor visibility toggle for small screens
  const [showEditor, setShowEditor] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLandingWizard = () => {
    setShowLanding(false)
    localStorage.setItem(LANDING_KEY, '1')
    useAIStore.getState().setActiveTab('wizard')
    useAIStore.getState().openPanel()
  }

  const handleLandingImport = () => {
    setShowLanding(false)
    localStorage.setItem(LANDING_KEY, '1')
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
    setShowLanding(false)
    localStorage.setItem(LANDING_KEY, '1')
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

  if (showLanding) {
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
      <div className="flex flex-col lg:rounded-2xl bg-white lg:shadow-lg lg:shadow-gray-200/40 overflow-hidden w-full max-w-[1440px] h-full lg:max-h-[calc(100vh-24px)]">
        <Toolbar
          onOpenDrafts={() => setShowDrafts(true)}
          showEditor={showEditor}
          onToggleEditor={() => setShowEditor(!showEditor)}
          onGoHome={() => {
            localStorage.removeItem(LANDING_KEY)
            setShowLanding(true)
          }}
        />

        {/* ── Editor + Preview (responsive) ── */}
        <div className="flex-1 flex overflow-hidden relative">
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
  )
}
