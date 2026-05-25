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
import type { ResumeData } from '../types/resume'
import { useAuthStore } from '../store/authStore'
import AppModal from './shared/AppModal'
import AppProgressOverlay from './shared/AppProgressOverlay'

interface Props {
  onOpenDrafts: () => void
  showEditor: boolean
  onToggleEditor: () => void
  onGoHome: () => void
}

/* ── Reusable button style factory ── */

function btn(
  variant: 'ghost' | 'primary' | 'outline' | 'dashed' | 'pill' | 'tonal',
  active = '',
  disabled = false,
): string {
  const base = `h-8 rounded-full text-[11px] px-3 transition-all duration-150 inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}`
  const variants: Record<string, string> = {
    ghost:  `bg-white/70 text-text-secondary border border-transparent hover:bg-white hover:border-border-default hover:shadow-sm`,
    primary:`bg-brand-primary text-white border border-brand-primary shadow-sm hover:shadow-md hover:shadow-violet-900/10`,
    outline:`bg-white border border-border-default text-brand-primary hover:border-brand-primary/40 hover:bg-accent-muted/40`,
    dashed: `bg-white/60 border border-dashed border-border-default text-text-muted hover:border-brand-primary/40 hover:text-brand-primary hover:bg-accent-muted/30`,
    pill:   `bg-[#1D1B20] text-white border border-[#1D1B20] px-3`,
    tonal:  `bg-accent-muted text-brand-primary border border-transparent hover:bg-[#E7D9FA]`,
  }
  return `${base} ${variants[variant]} ${active}`
}

function hasResumeContent(data: ResumeData): boolean {
  return !!(
    data.personalInfo.name ||
    data.personalInfo.nameEn ||
    data.personalInfo.phone ||
    data.personalInfo.email ||
    data.personalInfo.location ||
    data.personalInfo.locationEn ||
    data.personalInfo.portfolio ||
    data.personalInfo.age ||
    data.personalInfo.photo ||
    data.personalInfo.jobObjective ||
    data.personalInfo.jobObjectiveEn ||
    data.personalInfo.customFields.length > 0 ||
    data.summary ||
    data.summaryEn ||
    data.workExperience.length > 0 ||
    data.aiProjects.length > 0 ||
    data.education.length > 0 ||
    data.skills.length > 0 ||
    data.languages.length > 0 ||
    data.languagesEn.length > 0 ||
    data.selfEvaluation ||
    data.selfEvaluationEn ||
    data.customSections.length > 0
  )
}

export default function Toolbar({ onOpenDrafts, showEditor, onToggleEditor, onGoHome }: Props) {
  const { data, draftId, draftName, setLang, setDraftInfo, loadData, applyTranslation, translateLoading, translateError, setTranslateLoading, setTranslateError } = useResumeStore()
  const aiPanelOpen = useAIStore((s) => s.isOpen)
  const togglePanel = useAIStore((s) => s.togglePanel)
  const lang = data.lang
  const t = lang === 'zh' ? zh : en
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPng, setExportingPng] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [showNewConfirm, setShowNewConfirm] = useState(false)
  const [showSaveDraft, setShowSaveDraft] = useState(false)
  const [saveDraftName, setSaveDraftName] = useState(draftName || '我的简历')
  const [modalSaving, setModalSaving] = useState(false)
  const user = useAuthStore((s) => s.user)
  const balance = useAuthStore((s) => s.balance)
  const totalCredits = useAuthStore((s) => s.totalCredits)
  const openAuthModal = useAuthStore((s) => s.openAuthModal)
  const openCreditModal = useAuthStore((s) => s.openCreditModal)
  const signOut = useAuthStore((s) => s.signOut)

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
        const raw = await chatComplete(messages, 'translate')
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
    setSaveDraftName(draftName || data.personalInfo.name || '我的简历')
    setShowSaveDraft(true)
  }

  const confirmSaveDraft = async () => {
    const name = saveDraftName.trim()
    if (!name) return
    setModalSaving(true)
    try {
      const id = await saveDraft(draftId || crypto.randomUUID(), name, data)
      setDraftInfo(id, name)
      setShowSaveDraft(false)
    } finally {
      setModalSaving(false)
    }
  }

  const saveCurrentDraftSilently = async () => {
    setModalSaving(true)
    try {
      const name = draftName || data.personalInfo.name || '我的简历'
      const id = await saveDraft(draftId || crypto.randomUUID(), name, data)
      setDraftInfo(id, name)
      setShowImportConfirm(false)
      setShowNewConfirm(false)
    } finally {
      setModalSaving(false)
    }
  }

  const handleExportPdf = async () => {
    setShowExportMenu(false)
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
    setShowExportMenu(false)
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

  const requestImport = () => {
    if (hasResumeContent(data)) {
      setShowImportConfirm(true)
      return
    }
    fileInputRef.current?.click()
  }

  const confirmImportNewResume = () => {
    setShowImportConfirm(false)
    fileInputRef.current?.click()
  }

  const handleNew = () => {
    if (hasResumeContent(data)) {
      setShowNewConfirm(true)
      return
    }
    useResumeStore.getState().reset()
  }

  const confirmNew = () => {
    setShowNewConfirm(false)
    useResumeStore.getState().reset()
  }

  return (
    <header className="min-h-14 bg-bg-toolbar/90 backdrop-blur-xl border-b border-border-default/70 flex items-center justify-between gap-3 px-4 py-2 shrink-0 z-10">
      {/* ── Left: Logo + Title ── */}
      <button
        onClick={onGoHome}
        className="flex items-center gap-2 rounded-2xl px-1.5 py-1 transition-colors hover:bg-white/70"
        title="返回首页"
      >
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-[14px] shadow-md shadow-violet-900/10">鸭</span>
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-[13px] font-semibold text-text-primary">简历鸭</h1>
          <span className="text-[11px] text-text-muted hidden sm:inline">· {lang === 'zh' ? 'Resume Editor' : '简历编辑器'}</span>
        </div>
      </button>

      {/* ── Right: Actions ── */}
      <nav className="flex items-center justify-end gap-2 flex-wrap">
        <input ref={fileInputRef} type="file" accept=".md,.txt,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleImport} className="hidden" />

        {/* Group 1: File operations — ghost */}
        <button onClick={requestImport} className={btn('ghost')}>
          导入
        </button>
        <button onClick={handleSave} className={btn('ghost')}>
          {t.toolbar.save}
        </button>
        <button onClick={onOpenDrafts} className={btn('ghost')}>
          历史记录
        </button>

        <div className="w-px h-4 bg-border-default" />

        {/* Group 2: Lang + New */}
        <button onClick={toggleLang} disabled={translateLoading} className={btn('ghost')} title={translateError || undefined}>
          {translateLoading ? '⏳' : t.toolbar.lang}
        </button>
        {translateLoading && <span className="text-[10px] text-gray-400">翻译中…</span>}
        {translateError && <span className="text-[10px] text-red-500" title={translateError}>翻译失败</span>}
        <button onClick={handleNew} className={btn('dashed')}>
          {t.toolbar.newDraft}
        </button>

        <div className="w-px h-4 bg-border-default" />

        {/* Group 3: Account + AI tools */}
        {user ? (
          <>
            <button onClick={openCreditModal} className={btn('ghost')}>
              {balance ?? 0}/{totalCredits ?? 20}
            </button>
            <button onClick={() => signOut()} className={btn('ghost')}>
              退出
            </button>
          </>
        ) : (
          <button onClick={openAuthModal} className={btn('ghost')}>
            注册/登录
          </button>
        )}
        <button onClick={togglePanel} className={btn(aiPanelOpen ? 'primary' : 'tonal')}>
          {aiPanelOpen ? '手动编辑' : '✨ AI 助手'}
        </button>

        {/* Group 4: Export as final action */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={exportingPdf || exportingPng}
            className={btn('primary', '', exportingPdf || exportingPng)}
          >
            {exportingPdf || exportingPng ? '⏳ ' + t.exporting : '导出'} ▾
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-36 rounded-2xl border border-border-default bg-white p-1.5 shadow-xl shadow-slate-900/10 z-30">
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-text-primary hover:bg-bg-hover disabled:opacity-50"
              >
                {t.toolbar.exportPdf}
              </button>
              <button
                onClick={handleExportPng}
                disabled={exportingPng}
                className="w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-text-primary hover:bg-bg-hover disabled:opacity-50"
              >
                {t.toolbar.exportPng}
              </button>
            </div>
          )}
        </div>

        {/* Mobile: editor toggle */}
        <button onClick={onToggleEditor} className="lg:hidden h-8 rounded-full text-[11px] px-3 font-semibold border border-border-default text-text-secondary bg-white hover:bg-bg-hover active:scale-[0.98] transition-all ml-auto">
          {showEditor ? '隐藏编辑' : '编辑'}
        </button>
      </nav>

      {/* ── Import Progress Overlay ── */}
      {importing && importProgress && (
        <AppProgressOverlay
          icon={importProgress.progress >= 100 ? '✅' : importProgress.message.includes('❌') ? '❌' : '📄'}
          message={importProgress.message}
          progress={importProgress.progress}
          failed={importProgress.message.includes('❌')}
        />
      )}

      {showSaveDraft && (
        <AppModal
          title="保存草稿"
          description="给当前简历起一个容易识别的名称，之后可以在历史记录中继续编辑。"
          onClose={() => setShowSaveDraft(false)}
          icon={<div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-muted text-sm font-black text-brand-primary">存</div>}
        >
          <div className="space-y-4">
            <input
              value={saveDraftName}
              onChange={(event) => setSaveDraftName(event.target.value)}
              autoFocus
              className="w-full rounded-2xl border border-border-default bg-white px-4 py-3 text-sm font-semibold text-text-primary outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-accent-muted/80"
              placeholder={t.draftName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirmSaveDraft()
              }}
            />
            <div className="grid gap-3">
              <button
                type="button"
                onClick={confirmSaveDraft}
                disabled={modalSaving || !saveDraftName.trim()}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {modalSaving ? '保存中…' : '确认保存'}
              </button>
              <button
                type="button"
                onClick={() => setShowSaveDraft(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-black text-text-secondary transition hover:bg-bg-hover"
              >
                取消
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {showImportConfirm && (
        <AppModal
          title="检测到你有未完成的草稿"
          description="导入新简历会替换当前编辑内容。你可以先保存当前草稿，或确认导入新的简历。"
          onClose={() => setShowImportConfirm(false)}
          icon={<div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF3D6] text-sm font-black text-[#8A4B00]">!</div>}
        >
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportConfirm(false)
                  saveCurrentDraftSilently()
                }}
                disabled={modalSaving}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                {modalSaving ? '保存中…' : '先保存草稿'}
              </button>
              <button
                type="button"
                onClick={confirmImportNewResume}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-border-default bg-white px-5 text-sm font-black text-brand-primary transition hover:-translate-y-0.5 hover:bg-accent-muted active:translate-y-0"
              >
                确认导入新简历
              </button>
              <button
                type="button"
                onClick={() => setShowImportConfirm(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-black text-text-secondary transition hover:bg-bg-hover"
              >
                取消
              </button>
            </div>
        </AppModal>
      )}

      {showNewConfirm && (
        <AppModal
          title="新建一份简历？"
          description="新建简历会清空当前编辑内容。你可以先保存当前草稿，或确认创建一份空白简历。"
          onClose={() => setShowNewConfirm(false)}
          icon={<div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-muted text-sm font-black text-brand-primary">+</div>}
        >
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewConfirm(false)
                  saveCurrentDraftSilently()
                }}
                disabled={modalSaving}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                {modalSaving ? '保存中…' : '先保存草稿'}
              </button>
              <button
                type="button"
                onClick={confirmNew}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-border-default bg-white px-5 text-sm font-black text-brand-primary transition hover:-translate-y-0.5 hover:bg-accent-muted active:translate-y-0"
              >
                确认新建
              </button>
              <button
                type="button"
                onClick={() => setShowNewConfirm(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-black text-text-secondary transition hover:bg-bg-hover"
              >
                取消
              </button>
            </div>
        </AppModal>
      )}
    </header>
  )
}
