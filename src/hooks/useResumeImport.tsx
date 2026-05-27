import { useRef, useState } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { saveDraft } from '../utils/storage'
import { parseMarkdownResume } from '../utils/markdownParser'
import type { ResumeData } from '../types/resume'
import AppModal from '../components/shared/AppModal'
import AppProgressOverlay from '../components/shared/AppProgressOverlay'

export function hasResumeContent(data: ResumeData): boolean {
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

type ImportProgressState = {
  message: string
  progress: number
}

type UseResumeImportOptions = {
  onImported?: (file: File, data: ResumeData) => void
}

export function useResumeImport(options: UseResumeImportOptions = {}) {
  const data = useResumeStore((s) => s.data)
  const draftId = useResumeStore((s) => s.draftId)
  const draftName = useResumeStore((s) => s.draftName)
  const loadData = useResumeStore((s) => s.loadData)
  const setDraftInfo = useResumeStore((s) => s.setDraftInfo)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null)

  const openFilePicker = () => fileInputRef.current?.click()

  const requestImport = () => {
    if (hasResumeContent(data)) {
      setShowImportConfirm(true)
      return
    }
    openFilePicker()
  }

  const saveCurrentDraftSilently = async () => {
    setModalSaving(true)
    try {
      const name = draftName || data.personalInfo.name || '我的简历'
      const id = await saveDraft(draftId || crypto.randomUUID(), name, data)
      setDraftInfo(id, name)
      setShowImportConfirm(false)
    } finally {
      setModalSaving(false)
    }
  }

  const confirmImportNewResume = () => {
    setShowImportConfirm(false)
    openFilePicker()
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    setImporting(true)
    setImportProgress({ message: '准备导入…', progress: 0 })

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let result: ResumeData | null = null

      if (ext === 'md' || ext === 'txt') {
        setImportProgress({ message: '正在读取文件…', progress: 30 })
        const text = await file.text()
        setImportProgress({ message: '正在解析简历内容…', progress: 70 })
        result = parseMarkdownResume(text)
        if (!result) throw new Error('暂时没有识别出有效的简历结构')
      } else {
        const { importResumeFromFile } = await import('../services/resumeImport')
        result = await importResumeFromFile(file, (progress) => {
          setImportProgress({ message: progress.message, progress: progress.progress })
        })
      }

      loadData(result)
      options.onImported?.(file, result)
      setImportProgress({ message: '✅ 导入成功！', progress: 100 })
      setTimeout(() => {
        setImporting(false)
        setImportProgress(null)
      }, 1200)
    } catch (error: any) {
      setImportProgress({ message: `❌ ${error?.message || '导入失败'}`, progress: 0 })
      setTimeout(() => {
        setImporting(false)
        setImportProgress(null)
      }, 3000)
    }
  }

  const renderImportInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      accept=".md,.txt,.pdf,.jpg,.jpeg,.png,.webp"
      onChange={handleImport}
      className="hidden"
    />
  )

  const renderImportUI = () => (
    <>
      {importing && importProgress && (
        <AppProgressOverlay
          icon={importProgress.progress >= 100 ? '✅' : importProgress.message.includes('❌') ? '❌' : '📄'}
          message={importProgress.message}
          progress={importProgress.progress}
          failed={importProgress.message.includes('❌')}
        />
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
              onClick={saveCurrentDraftSilently}
              disabled={modalSaving}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-primary px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
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
    </>
  )

  return {
    importing,
    requestImport,
    renderImportInput,
    renderImportUI,
  }
}
