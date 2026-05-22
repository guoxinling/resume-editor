import { useState } from 'react'
import type { DraftMeta } from '../types/resume'

interface Props {
  isLoggedIn: boolean
  resumes: DraftMeta[]
  onLoadResume: (id: string) => void
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function HistoryPanel({ isLoggedIn, resumes, onLoadResume }: Props) {
  const [open, setOpen] = useState(false)

  if (!isLoggedIn) return null

  return (
    <aside
      className={`relative z-20 hidden h-full shrink-0 border-r border-[#CAC4D0]/70 bg-[#F3EDF7] transition-[width] duration-250 ease-out lg:block ${open ? 'w-[280px]' : 'w-12'}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="absolute left-0 top-0 h-full w-0.5 bg-[#6750A4]" />
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-full w-12 items-start justify-center pt-5 text-lg"
          title="我的简历"
        >
          📋
        </button>
      ) : (
        <div className="h-full overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-[#1C1B1F]">📋 我的简历</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-2 py-1 text-xs font-black text-[#6750A4] hover:bg-[#EADDFF]"
            >
              收起
            </button>
          </div>

          {resumes.length === 0 ? (
            <p className="rounded-2xl border border-[#CAC4D0]/70 bg-white/70 p-4 text-sm leading-6 text-[#79747E]">暂无保存的简历</p>
          ) : (
            <div className="space-y-2">
              {resumes.map((resume) => (
                <button
                  key={resume.id}
                  type="button"
                  onClick={() => onLoadResume(resume.id)}
                  className="w-full rounded-2xl border border-[#CAC4D0]/70 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#6750A4]/45 hover:shadow-md"
                >
                  <p className="truncate text-sm font-black text-[#1C1B1F]">{resume.name || '未命名简历'}</p>
                  <p className="mt-1 text-xs font-bold text-[#79747E]">{formatDate(resume.updatedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
