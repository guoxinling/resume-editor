import { useRef, useState, useCallback, useEffect } from 'react'
import { useAIStore } from '../../store/aiStore'
import { createWorker } from 'tesseract.js'

export default function OCRCROCRUpload() {
  const { ocrImageBase64, ocrProgress, ocrResult, setOcrImage, setOcrProgress, setOcrResult, setJdText } = useAIStore()
  const [dragOver, setDragOver] = useState(false)
  const [statusText, setStatusText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setOcrImage(base64)
      setOcrProgress(0)
      setOcrResult(null)
      setStatusText('正在加载 OCR 引擎…')

      try {
        const worker = await createWorker('chi_sim+eng')
        setStatusText('正在识别文字…')
        setOcrProgress(30)

        const { data: { text } } = await worker.recognize(base64)
        setOcrProgress(100)
        setStatusText('')
        setOcrResult(text.trim() || '(未识别到文字)')
        if (text.trim()) setJdText(text.trim())

        await worker.terminate()
      } catch (err) {
        console.error('OCR failed:', err)
        setOcrProgress(100)
        setStatusText('')
        setOcrResult('OCR 识别失败，请检查图片清晰度或手动输入')
      }
    }
    reader.readAsDataURL(file)
  }, [setOcrImage, setOcrProgress, setOcrResult, setJdText])

  // Ctrl+V paste handler
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { processFile(file); e.preventDefault(); break }
        }
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [processFile])

  if (ocrImageBase64) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-200 mb-2">
        <img src={ocrImageBase64} alt="截图预览" className="w-full max-h-[200px] object-contain bg-gray-100" />
        <button
          onClick={() => { setOcrImage(null); setOcrProgress(0); setOcrResult(null) }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
        >
          ✕
        </button>
        {ocrProgress < 100 && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.16s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: '0.32s' }} />
            </div>
            <div className="text-[13px] font-semibold text-[#4F46E5] mt-1">{statusText}</div>
          </div>
        )}
        {ocrProgress >= 100 && ocrResult && (
          <div className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            ✅ 已识别
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all mb-2 ${
        dragOver ? 'border-[#7C3AED] bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-[#7C3AED] hover:bg-indigo-50/50'
      }`}
    >
      <div className="text-xs text-gray-400 leading-relaxed">
        📷 点击此处上传截图<br />
        或直接 <strong className="text-[#7C3AED]">Ctrl+V</strong> 粘贴剪贴板截图<br />
        <span className="text-[10px] text-gray-400">支持 PNG / JPG（中英文识别）</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
        className="hidden"
      />
    </div>
  )
}
