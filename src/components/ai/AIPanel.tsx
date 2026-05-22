import { useAIStore } from '../../store/aiStore'
import AITabs from './AITabs'
import Wizard from './Wizard'
import ExperiencePolish from './ExperiencePolish'
import JDAdapt from './JDAdapt'
import InterviewPredict from './InterviewPredict'
import ConfigPanel from './ConfigPanel'

export default function AIPanel() {
  const isOpen = useAIStore((s) => s.isOpen)
  const closePanel = useAIStore((s) => s.closePanel)
  const activeTab = useAIStore((s) => s.activeTab)

  return (
    <>
      {/* Backdrop — fades in/out */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closePanel}
      />

      {/* Panel — slides in/out. On large screens pushes layout; on mobile overlays */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[520px] max-w-[100vw] bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-sm">
              ✨
            </span>
            <span className="text-[15px] font-semibold text-gray-900">AI 工具箱</span>
          </div>
          <button
            onClick={closePanel}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-lg"
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
            {activeTab === 'config' && <ConfigPanel />}
          </div>
        )}
      </div>
    </>
  )
}
