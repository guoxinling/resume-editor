import { useState } from 'react'
import { useAIStore } from '../../store/aiStore'

export default function ConfigPanel() {
  const config = useAIStore((s) => s.config)
  const setConfig = useAIStore((s) => s.setConfig)

  const [apiKey, setApiKey] = useState(config.apiKey)
  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [model, setModel] = useState(config.model)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setConfig({ apiKey, baseURL, model })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">配置 AI 服务连接参数，支持兼容 OpenAI 接口的服务</p>

      {/* API Key */}
      <div>
        <label className="block text-[11px] font-medium text-gray-700 mb-1">API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 pr-16 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 font-mono"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-[11px] font-medium text-gray-700 mb-1">API 地址</label>
        <input
          type="text"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.deepseek.com/v1"
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 font-mono"
        />
        <p className="text-[10px] text-gray-400 mt-0.5">
          支持 DeepSeek、OpenAI 等兼容接口
        </p>
      </div>

      {/* Model */}
      <div>
        <label className="block text-[11px] font-medium text-gray-700 mb-1">模型</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
        >
          <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
        </select>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`h-[34px] px-4 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white hover:shadow-lg hover:shadow-indigo-500/20'
        } active:scale-[0.98]`}
      >
        {saved ? '✅ 已保存' : '💾 保存配置'}
      </button>

      {/* Quick presets */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 mb-2">快捷预设</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
            { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setBaseURL(preset.url); setModel(preset.model) }}
              className={`px-2.5 py-1 text-[10px] rounded-full border transition-all ${
                baseURL === preset.url
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-600 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
