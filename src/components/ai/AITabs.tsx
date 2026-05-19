import { useAIStore } from '../../store/aiStore'
import type { AITab } from '../../types/ai'

const tabs: { key: AITab; icon: string; label: string }[] = [
  { key: 'wizard', icon: '🤖', label: '简历向导' },
  { key: 'polish', icon: '✨', label: '经历润色' },
  { key: 'adapt', icon: '🎯', label: '岗位适配' },
  { key: 'interview', icon: '💬', label: '面试预测' },
  { key: 'config', icon: '⚙️', label: '配置' },
]

export default function AITabs() {
  const activeTab = useAIStore((s) => s.activeTab)
  const setActiveTab = useAIStore((s) => s.setActiveTab)

  return (
    <div className="flex gap-1 px-5 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200 border
            ${activeTab === tab.key
              ? 'bg-white text-[#4F46E5] border-gray-200 shadow-sm font-semibold'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
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
