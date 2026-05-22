interface Props {
  isOpen: boolean
  onClose: () => void
  onWizardClick: () => void
  onImportClick: () => void
  onBlankClick: () => void
  onTemplateSelect: (templateIndex: number) => void
  onViewAllTemplates: () => void
}

const templates = [
  { name: '经典商务', tag: '通用' },
  { name: '极简白纸', tag: '学生' },
  { name: '科技产品', tag: 'AI' },
  { name: '海外双语', tag: '双语' },
]

function TemplateThumb({ index, name, tag }: { index: number; name: string; tag: string }) {
  const bg =
    index === 1
      ? 'bg-white'
      : index === 2
        ? 'bg-[linear-gradient(180deg,#EADDFF_0_28%,#fff_28%_100%)]'
        : index === 3
          ? 'bg-[linear-gradient(90deg,#fff_0_52%,#F7F2FA_52%_100%)]'
          : 'bg-[linear-gradient(90deg,#F7F2FA_0_32%,#fff_32%_100%)]'

  return (
    <div className="group h-full">
      <div className={`h-[132px] rounded-2xl border border-[#CAC4D0]/80 p-3 shadow-inner transition group-hover:border-[#6750A4]/55 ${bg}`}>
        <div className="mb-3 h-3 w-16 rounded-full bg-[#1C1B1F]" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="mt-3">
            <div className="mb-2 h-1 w-8 rounded-full bg-[#6750A4]" />
            <div className="h-1.5 rounded-full bg-[#CAC4D0]" />
            <div className="mt-1.5 h-1.5 w-[70%] rounded-full bg-[#CAC4D0]" />
          </div>
        ))}
      </div>
      <div className="mt-2">
        <p className="text-sm font-black text-[#1C1B1F]">{name}</p>
        <p className="text-xs font-bold text-[#6750A4]">{tag}</p>
      </div>
    </div>
  )
}

function ActionCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border border-[#CAC4D0]/75 bg-[#FFFBFE] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#6750A4]/45 hover:bg-white hover:shadow-[0_8px_24px_rgba(28,27,31,0.08)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EADDFF] text-xl">{icon}</span>
        <div>
          <h3 className="text-base font-black text-[#1C1B1F]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#49454F]">{desc}</p>
        </div>
      </div>
    </button>
  )
}

export default function NewResumeModal({
  isOpen,
  onClose,
  onWizardClick,
  onImportClick,
  onBlankClick,
  onTemplateSelect,
  onViewAllTemplates,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[92vh] w-[min(760px,100%)] overflow-y-auto rounded-[32px] border border-[#CAC4D0]/75 bg-[#FFFBFE] p-5 shadow-2xl md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#6750A4]">新建简历</p>
            <h2 className="text-2xl font-black text-[#1C1B1F]">选择一种开始方式</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[#49454F] transition hover:bg-[#F3EDF7] hover:text-[#1C1B1F]"
            title="关闭"
          >
            x
          </button>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-[#1C1B1F]">从模板创建</h3>
            <button
              type="button"
              onClick={onViewAllTemplates}
              className="rounded-full px-3 py-1.5 text-sm font-black text-[#6750A4] transition hover:bg-[#EADDFF]"
            >
              查看全部模板 →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {templates.map((template, index) => (
              <button
                key={template.name}
                type="button"
                onClick={() => onTemplateSelect(index)}
                className="rounded-3xl border border-transparent p-2 text-left transition hover:-translate-y-0.5 hover:border-[#6750A4]/45 hover:bg-[#F7F2FA]"
              >
                <TemplateThumb index={index} name={template.name} tag={template.tag} />
              </button>
            ))}
          </div>
        </section>

        <div className="my-6 flex items-center gap-4 text-xs font-black text-[#79747E]">
          <span className="h-px flex-1 bg-[#CAC4D0]" />
          或
          <span className="h-px flex-1 bg-[#CAC4D0]" />
        </div>

        <div className="grid gap-3">
          <ActionCard icon="🤖" title="AI 对话生成" desc="通过对话收集信息创建简历，适合第一次写。" onClick={onWizardClick} />
          <ActionCard icon="📎" title="导入已有简历" desc="支持 PDF、图片、Markdown，导入后继续优化。" onClick={onImportClick} />
          <ActionCard icon="📝" title="空白简历" desc="从零开始手动填写，保留所有编辑能力。" onClick={onBlankClick} />
        </div>
      </div>
    </div>
  )
}
