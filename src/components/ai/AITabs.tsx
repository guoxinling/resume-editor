import { useAIStore } from '../../store/aiStore'
import type { AITab } from '../../types/ai'

const tabs: { key: AITab; icon: string; label: string }[] = [
  { key: 'wizard', icon: '🤖', label: '简历向导' },
  { key: 'polish', icon: '✨', label: '经历润色' },
  { key: 'adapt', icon: '🎯', label: '岗位适配' },
  { key: 'interview', icon: '💬', label: '面试预测' },
]

export default function AITabs() {
  const activeTab = useAIStore((s) => s.activeTab)
  const setActiveTab = useAIStore((s) => s.setActiveTab)

  return (
    <div className="grid grid-cols-2 gap-2 px-5 py-3 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`
            flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-xs font-semibold
            transition-all duration-200 border
            ${activeTab === tab.key
              ? 'bg-accent-muted text-brand-primary border-transparent shadow-sm'
              : 'text-text-secondary border-transparent bg-bg-hover/70 hover:text-text-primary hover:bg-bg-hover'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
