import { useAIStore } from '../../store/aiStore'
import AITabs from './AITabs'
import Wizard from './Wizard'
import ExperiencePolish from './ExperiencePolish'
import JDAdapt from './JDAdapt'
import InterviewPredict from './InterviewPredict'

export default function AIPanel() {
  const isOpen = useAIStore((s) => s.isOpen)
  const closePanel = useAIStore((s) => s.closePanel)
  const activeTab = useAIStore((s) => s.activeTab)

  if (!isOpen) return null

  return (
    <>
      {/* Mobile keeps the drawer modal. Desktop panel participates in the content layout. */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex w-[520px] max-w-[calc(100vw-20px)] flex-col border-l border-border-default bg-white shadow-2xl shadow-slate-900/15 lg:static lg:z-auto lg:h-full lg:w-[440px] lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[520px]"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-toolbar/90">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center text-white text-sm shadow-md shadow-violet-900/10">
              ✨
            </span>
            <span className="text-[15px] font-bold text-text-primary">AI 助手</span>
          </div>
          <button
            onClick={closePanel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <AITabs />

        {/* Content */}
        {activeTab === 'wizard' ? (
          <Wizard />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            {activeTab === 'polish' && <ExperiencePolish />}
            {activeTab === 'adapt' && <JDAdapt />}
            {activeTab === 'interview' && <InterviewPredict />}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
