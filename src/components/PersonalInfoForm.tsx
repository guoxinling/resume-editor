import { useMemo } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { zh } from '../i18n/zh'
import { en } from '../i18n/en'
import { validateResume } from '../utils/validation'
import type { Lang } from '../types/resume'

function shouldShowField(key: string, lang: Lang): boolean {
  if (key.endsWith('En')) return lang === 'en'
  const hasEnCounterpart = ['name', 'nameEn'].includes(key)
  if (!hasEnCounterpart) return true
  return lang === 'zh'
}

export default function PersonalInfoForm() {
  const { data, setPersonalInfo, addCustomField, updateCustomField, removeCustomField } = useResumeStore()
  const lang = data.lang
  const t = lang === 'zh' ? zh : en
  const pi = data.personalInfo

  const errors = useMemo(() => {
    const result = validateResume(data)
    return new Map(result.errors.map((e) => [e.field, e.message]))
  }, [data])

  const allFields: { key: string; label: string; required?: boolean; fullWidth?: boolean }[] = [
    { key: 'name', label: t.personalInfo.name, required: true },
    { key: 'nameEn', label: t.personalInfo.nameEn },
    { key: 'phone', label: t.personalInfo.phone, required: true },
    { key: 'email', label: t.personalInfo.email, required: true },
    { key: 'location', label: t.personalInfo.location },
    { key: 'age', label: t.personalInfo.age },
    { key: 'portfolio', label: t.personalInfo.portfolio },
    { key: 'jobObjective', label: t.personalInfo.jobObjective },
    { key: 'jobObjectiveEn', label: t.personalInfo.jobObjective },
  ]

  const fields = allFields.filter(({ key }) => shouldShowField(key, lang))

  const inputValue = (key: string) => (pi as unknown as Record<string, unknown>)[key] as string ?? ''

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {fields.map(({ key, label, required, fullWidth }) => {
          const fieldError = errors.get(key)
          return (
            <div key={key} className={key === 'name' || key === 'nameEn' || fullWidth ? 'col-span-2' : ''}>
              <label className="block text-[11px] text-gray-500 mb-0.5">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type="text"
                value={inputValue(key)}
                onChange={(e) => setPersonalInfo(key, e.target.value)}
                className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:border-gray-400 transition-colors ${
                  fieldError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder={label}
              />
              {fieldError && (
                <p className="text-[10px] text-red-500 mt-0.5">{fieldError}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Custom fields ── */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-[10px] text-gray-400 mb-2">自定义字段（如 GitHub、微信等）</p>
        <div className="space-y-1.5">
          {pi.customFields.map((f, i) => (
            <div key={i} className="flex gap-1 items-center group">
              <input
                value={f.key}
                onChange={(e) => updateCustomField(i, 'key', e.target.value)}
                placeholder="字段名"
                className="w-[30%] px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
              <input
                value={f.value}
                onChange={(e) => updateCustomField(i, 'value', e.target.value)}
                placeholder="值"
                className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={() => removeCustomField(i)}
                className="text-gray-300 hover:text-red-500 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addCustomField}
          className="text-[10px] text-blue-600 hover:text-blue-800 mt-1.5 font-medium"
        >
          + 添加自定义字段
        </button>
      </div>
    </div>
  )
}
