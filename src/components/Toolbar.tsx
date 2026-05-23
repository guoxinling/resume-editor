import { useRef, useState, useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { useAIStore } from '../store/aiStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { downloadPdf } from '../utils/exportPdf'
import { exportPng } from '../utils/exportImage'
import { saveDraft } from '../utils/storage'
import { parseMarkdownResume } from '../utils/markdownParser'
import { validateResume } from '../utils/validation'
import { chatComplete } from '../services/aiClient'
import { buildTranslateMessages } from '../services/prompts'

interface Props {
  onOpenDrafts: () => void
  showEditor: boolean
  onToggleEditor: () => void
  onGoHome: () => void
}

/* ── Reusable button style factory ── */

function btn(
  variant: 'ghost' | 'primary' | 'outline' | 'dashed' | 'pill',
  active = '',
  disabled = false,
): string {
  const base = `h-8 rounded-md text-[11px] px-3 transition-all duration-150 inline-flex items-center justify-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
  const variants: Record<string, string> = {
    ghost:  `bg-transparent text-text-secondary hover:bg-bg-hover`,
    primary:`bg-brand-primary text-white shadow-sm hover:brightness-110`,
    outline:`border border-brand-primary/30 text-brand-primary hover:border-brand-primary hover:bg-brand-primary/[0.04]`,
    dashed: `border border-dashed border-border-default text-text-muted hover:border-solid hover:border-brand-primary`,
    pill:   `bg-text-primary text-white rounded-full px-3`,
  }
  return `${base} ${variants[variant]} ${active}`
}

export default function Toolbar({ onOpenDrafts, showEditor, onToggleEditor, onGoHome }: Props) {
  const { data, draftId, setLang, setDraftInfo, loadData, applyTranslation, translateLoading, translateError, setTranslateLoading, setTranslateError } = useResumeStore()
  const togglePanel = useAIStore((s) => s.togglePanel)
  const lang = data.lang
  const t = lang === 'zh' ? zh : en
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPng, setExportingPng] = useState(false)

  // Track if translation has been attempted this session
  const [translatedOnce, setTranslatedOnce] = useState(
    () => localStorage.getItem('resume-translated-en') === '1'
  )

  const hasEnContent = useCallback(() => {
    const d = useResumeStore.getState().data
    if (d.summaryEn || d.selfEvaluationEn || d.personalInfo.jobObjectiveEn || d.personalInfo.nameEn || d.personalInfo.locationEn) return true
    if (d.workExperience.some((w) => w.companyEn || w.roleEn || w.bulletsEn.length > 0)) return true
    if (d.aiProjects.some((p) => p.nameEn || p.directionEn || p.datesEn || p.descriptionEn)) return true
    if (d.education.some((e) => e.schoolEn)) return true
    if (d.skills.some((s) => s.categoryEn)) return true
    if (d.languagesEn.length > 0 && d.languagesEn.some((l) => l)) return true
    if (d.customSections.some((cs) => cs.labelEn || cs.contentEn)) return true
    return false
  }, [])

  const toggleLang = useCallback(async () => {
    const state = useResumeStore.getState()
    const currentLang = state.data.lang
    const newLang = currentLang === 'zh' ? 'en' : 'zh'

    // Always switch language first
    setLang(newLang)

    // Auto-translate when switching to EN
    if (newLang === 'en' && !translatedOnce) {
      setTranslateLoading(true)
      setTranslateError(null)
      try {
        const d = state.data
        const snapshot: Record<string, any> = {
          nameEn: d.personalInfo.name,
          locationEn: d.personalInfo.location,
          summaryEn: d.summary,
          selfEvaluationEn: d.selfEvaluation,
          jobObjectiveEn: d.personalInfo.jobObjective,
          workExperience: d.workExperience.map((w, i) => ({ index: i, companyEn: w.company, roleEn: w.role, datesEn: w.dates, bulletsEn: w.bullets })),
          aiProjects: d.aiProjects.map((p, i) => ({ index: i, nameEn: p.name, directionEn: p.direction, datesEn: p.dates, descriptionEn: p.description })),
          education: d.education.map((e, i) => ({ index: i, schoolEn: e.school, degreeEn: e.degree, majorEn: e.major, datesEn: e.dates, highlightsEn: e.highlights })),
          skills: d.skills.map((s, i) => ({ index: i, categoryEn: s.category, itemsEn: s.items })),
          languagesEn: d.languages,
          customSections: d.customSections.map((cs, i) => ({ index: i, labelEn: cs.label, contentEn: cs.content })),
        }

        const messages = buildTranslateMessages(JSON.stringify(snapshot, null, 2))
        const raw = await chatComplete(messages)
        const json = raw.replace(/```json\s*|```/g, '').trim()
        applyTranslation(JSON.parse(json))
        localStorage.setItem('resume-translated-en', '1')
        setTranslatedOnce(true)
      } catch (err: any) {
        console.error('Translation failed:', err)
        setTranslateError(err.message || '翻译失败')
      } finally {
        setTranslateLoading(false)
      }
    }
  }, [translatedOnce, setLang, setTranslateLoading, setTranslateError, applyTranslation])

  const handleSave = async () => {
    const name = prompt(t.draftName, draftId ? undefined : '我的简历')
    if (!name) return
    const id = await saveDraft(draftId || crypto.randomUUID(), name, data)
    setDraftInfo(id, name)
    alert(t.exportSuccess)
  }

  const handleExportPdf = async () => {
    const result = validateResume(data)
    if (!result.valid) {
      alert(t.validationRequired)
      return
    }
    setExportingPdf(true)
    try {
      await downloadPdf(data, lang, data.personalInfo.name || 'resume')
    } catch (err: any) {
      alert('PDF 导出失败: ' + (err?.message || String(err)))
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportPng = async () => {
    const result = validateResume(data)
    if (!result.valid) {
      alert(t.validationRequired)
      return
    }
    const el = document.getElementById('resume-preview')
    if (!el) {
      alert(t.noData)
      return
    }
    setExportingPng(true)
    try {
      await exportPng(el, (data.personalInfo.name || 'resume') + '.png')
    } finally {
      setExportingPng(false)
    }
  }

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ message: string; progress: number } | null>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const ext = file.name.split('.').pop()?.toLowerCase() || ''

    // MD/TXT → parse directly
    if (ext === 'md' || ext === 'txt') {
      try {
        const text = await file.text()
        const parsed = parseMarkdownResume(text)
        if (parsed) {
          loadData(parsed)
          alert(t.importSuccess)
        } else {
          alert(t.importError)
        }
      } catch {
        alert(t.importError)
      }
      return
    }

    // PDF / Image → full import pipeline
    setImporting(true)
    setImportProgress({ message: '准备导入…', progress: 0 })

    try {
      const { importResumeFromFile } = await import('../services/resumeImport')
      const result = await importResumeFromFile(file, (p) => {
        setImportProgress({ message: p.message, progress: p.progress })
      })
      loadData(result)
      setImportProgress({ message: '✅ 导入成功！', progress: 100 })
      setTimeout(() => {
        setImporting(false)
        setImportProgress(null)
      }, 1500)
    } catch (err: any) {
      setImportProgress({ message: `❌ ${err.message || '导入失败'}`, progress: 0 })
      setTimeout(() => {
        setImporting(false)
        setImportProgress(null)
      }, 3000)
    }
  }

  const handleNew = () => {
    if (confirm(t.confirmDelete)) {
      useResumeStore.getState().reset()
    }
  }

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 z-10">
      {/* ── Left: Logo + Title ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={onGoHome}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] text-gray-400 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors"
          title="返回首页"
        >
          🏠
        </button>
        <span className="text-lg">📄</span>
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-[13px] font-semibold text-text-primary">{t.appTitle}</h1>
          <span className="text-[11px] text-text-muted hidden sm:inline">· {lang === 'zh' ? 'Resume Editor' : '简历编辑器'}</span>
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <nav className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".md,.txt,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleImport} className="hidden" />

        {/* Group 1: File operations — ghost */}
        <button onClick={() => fileInputRef.current?.click()} className={btn('ghost')}>
          {t.toolbar.import}
        </button>
        <button onClick={handleSave} className={btn('ghost')}>
          {t.toolbar.save}
        </button>
        <button onClick={onOpenDrafts} className={btn('ghost')}>
          {t.toolbar.load}
        </button>

        <div className="w-px h-4 bg-border-default" />

        {/* Group 2: Exports — primary + outline */}
        <button onClick={handleExportPdf} disabled={exportingPdf} className={btn('primary', '', exportingPdf)}>
          {exportingPdf ? '⏳ ' + t.exporting : t.toolbar.exportPdf}
        </button>
        <button onClick={handleExportPng} disabled={exportingPng} className={btn('outline', '', exportingPng)}>
          {exportingPng ? '⏳ ' + t.exporting : t.toolbar.exportPng}
        </button>

        <div className="w-px h-4 bg-border-default" />

        {/* Group 3: Lang + New — pill + dashed */}
        <button onClick={toggleLang} disabled={translateLoading} className={btn('pill')} title={translateError || undefined}>
          {translateLoading ? '⏳' : t.toolbar.lang}
        </button>
        {translateLoading && <span className="text-[10px] text-gray-400">翻译中…</span>}
        {translateError && <span className="text-[10px] text-red-500" title={translateError}>翻译失败</span>}
        <button onClick={handleNew} className={btn('dashed')}>
          {t.toolbar.newDraft}
        </button>

        <div className="w-px h-4 bg-border-default" />

        {/* Group 4: AI tools */}
        <button onClick={togglePanel} className="h-8 rounded-md text-[11px] px-3 font-semibold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white inline-flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all">
          ✨ AI 工具
        </button>

        {/* Mobile: editor toggle */}
        <button onClick={onToggleEditor} className="lg:hidden h-8 rounded-md text-[11px] px-2.5 font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-[0.98] transition-all ml-auto">
          {showEditor ? '隐藏编辑' : '编辑'}
        </button>
      </nav>

      {/* ── Import Progress Overlay ── */}
      {importing && importProgress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[360px] text-center">
            <div className="text-3xl mb-3">
              {importProgress.progress >= 100 ? '✅' : importProgress.message.includes('❌') ? '❌' : '📄'}
            </div>
            <div className="text-[13px] font-semibold text-gray-800 mb-2">
              {importProgress.message}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  importProgress.message.includes('❌')
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]'
                }`}
                style={{ width: `${Math.min(importProgress.progress, 100)}%` }}
              />
            </div>
            {importProgress.progress < 100 && !importProgress.message.includes('❌') && (
              <p className="text-[10px] text-gray-400 mt-2">正在处理，请稍候…</p>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
