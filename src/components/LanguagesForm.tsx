import { useResumeStore } from '../store/resumeStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'

export default function LanguagesForm() {
  const { data, addLanguage, updateLanguage, removeLanguage, addLanguageEn, updateLanguageEn, removeLanguageEn } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en

  return (
    <div className="space-y-2">
      {lang === 'zh' && (
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">语言能力</label>
          <div className="space-y-1.5">
            {data.languages.map((l, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={l}
                  onChange={(e) => updateLanguage(i, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                  placeholder="例：中文（母语）"
                />
                {data.languages.length > 1 && (
                  <button onClick={() => removeLanguage(i)} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addLanguage} className="text-[10px] text-blue-600 hover:text-blue-800 mt-1.5 font-medium">+ 添加语言</button>
        </div>
      )}
      {lang === 'en' && (
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Languages</label>
          <div className="space-y-1.5">
            {data.languagesEn.map((l, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={l}
                  onChange={(e) => updateLanguageEn(i, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                  placeholder="e.g. Chinese (Native)"
                />
                {data.languagesEn.length > 1 && (
                  <button onClick={() => removeLanguageEn(i)} className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addLanguageEn} className="text-[10px] text-blue-600 hover:text-blue-800 mt-1.5 font-medium">+ Add Language</button>
        </div>
      )}
    </div>
  )
}
