import { useEffect, useState } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { listDrafts, loadDraft, deleteDraft } from '../utils/storage'
import type { DraftMeta } from '../types/resume'

interface Props {
  onClose: () => void
}

export default function DraftManager({ onClose }: Props) {
  const [drafts, setDrafts] = useState<DraftMeta[]>([])
  const lang = useResumeStore((s) => s.data.lang)
  const { loadData, setDraftInfo } = useResumeStore()
  const t = lang === 'zh' ? zh : en

  useEffect(() => {
    listDrafts().then((all) => setDrafts(all.filter((d) => d.id !== 'auto-save')))
  }, [])

  const handleLoad = async (draft: DraftMeta) => {
    const data = await loadDraft(draft.id)
    if (data) {
      loadData(data)
      setDraftInfo(draft.id, draft.name)
      onClose()
    }
  }

  const handleDelete = async (draft: DraftMeta) => {
    if (!confirm(t.confirmDelete)) return
    await deleteDraft(draft.id)
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id))
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">{t.toolbar.drafts}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {drafts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t.toolbar.noDrafts}</p>
          ) : (
            drafts.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                  <p className="text-[11px] text-gray-400">{formatDate(d.updatedAt)}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleLoad(d)} className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors">
                    {t.toolbar.load}
                  </button>
                  <button onClick={() => handleDelete(d)} className="px-3 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors">
                    {t.toolbar.delete}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
