export default function ConfigPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="mb-2 text-sm font-semibold text-[#4F46E5]">AI 服务已由简历鸭托管</div>
        <p className="text-xs leading-6 text-gray-600">
          用户无需填写 API Key。模型与服务密钥会在后端环境变量中统一配置，前端不会保存或暴露密钥。
        </p>
      </div>
    </div>
  )
}
