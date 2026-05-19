import type { ResumeData, PersonalInfo } from '../types/resume'

// ─── Utility ───

function extract(text: string, regex: RegExp, group = 1): string {
  const m = text.match(regex)
  return m?.[group]?.trim() || ''
}

/** Check if a string looks like a date range: 2021年11月 - 2023年9月 / 2023年9月 - 至今 */
const RE_DATE_RANGE = /\d{4}年\d{1,2}月\s*[-–—]\s*(至今|\d{4}年\d{1,2}月)/

function isDateRange(s: string): boolean {
  return RE_DATE_RANGE.test(s.trim())
}

/** Split body text into non-empty, trimmed lines */
function getLines(body: string): string[] {
  return body.split('\n').map((l) => l.trim()).filter(Boolean)
}

/** Parse old "- label：value" bullet list into a Record */
function parseKeyValueList(lines: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of lines) {
    const m = line.match(/^[*-]\s*(.+?)[：:]\s*(.+)/)
    if (m) map[m[1].trim()] = m[2].trim()
  }
  return map
}

// ─── Phone / Email / City helpers (same as before) ───

const RE_PHONE_DIGITS = /1[3-9]\d{9}/
function extractPhone(text: string): string {
  const digits = text.replace(/\D/g, '')
  return digits.match(RE_PHONE_DIGITS)?.[0] || digits.slice(0, 15)
}

const RE_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

const KNOWN_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆',
  '苏州', '西安', '长沙', '郑州', '天津', '济南', '青岛', '合肥', '福州',
  '厦门', '东莞', '佛山', '宁波', '昆明', '大连', '沈阳', '无锡', '南昌',
  '南宁', '贵阳', '太原', '石家庄', '哈尔滨', '长春', '兰州', '海口', '珠海',
]
function tryMatchCity(text: string): string {
  // Only return if text is a pure city name or city+known district
  const trimmed = text.trim()
  for (const city of KNOWN_CITIES) {
    if (trimmed === city) return city
    // "北京海淀" pattern: city + 2-3 char district
    if (trimmed.startsWith(city) && /^[\u4e00-\u9fff]{2,3}$/.test(trimmed.slice(city.length))) {
      return trimmed
    }
  }
  // "北京" appears in longer strings like "北京贝塔公司" — don't match
  return ''
}

// ─── Personal Info (free format + old format) ───

const LOCATION_PREFIX = /^(?:现居|📍|📍)/
const JOB_INTENT_LABELS = /^\*\*求职意向[：:]\s*\*\*\s*/

function parseFreeFormatLine(line: string, pi: PersonalInfo): { extra: string } {
  const result = { extra: '' }

  if (JOB_INTENT_LABELS.test(line)) {
    result.extra = line.replace(JOB_INTENT_LABELS, '').trim()
    return result
  }

  const genericBoldLabel = line.match(/^\*\*(.+?)[：:]\s*\*\*\s*(.+)/)
  if (genericBoldLabel) {
    result.extra = `${genericBoldLabel[1]}：${genericBoldLabel[2]}`
    return result
  }

  const segments = line.split('|').map((s) => s.trim()).filter(Boolean)
  for (const seg of segments) {
    // **Name** → name
    const boldOnly = seg.match(/^\*\*(.+?)\*\*$/)
    if (boldOnly && !pi.name) { pi.name = boldOnly[1].trim(); continue }

    // **Name** + rest
    const boldPrefix = seg.match(/^\*\*(.+?)\*\*\s*(.*)/)
    if (boldPrefix && !pi.name) {
      pi.name = boldPrefix[1].trim()
      const rest = boldPrefix[2].trim()
      if (rest) parseFreeFormatLine(rest, pi)
      continue
    }

    // (\\d+)岁 → age
    const ageMatch = seg.match(/(\d+)岁/)
    if (ageMatch && !pi.age) {
      pi.age = ageMatch[1]
      const after = seg.replace(ageMatch[0], '').trim()
      if (after && !pi.location) pi.location = after.replace(LOCATION_PREFIX, '').trim() || tryMatchCity(after)
      continue
    }

    // 现居 / 📍 → location
    if (LOCATION_PREFIX.test(seg) && !pi.location) { pi.location = seg.replace(LOCATION_PREFIX, '').trim(); continue }

    // 📞 → phone
    if (/📞/.test(seg) && !pi.phone) {
      const clean = seg.replace(/📞\s*/, '').replace(/\s/g, '')
      pi.phone = extractPhone(clean); continue
    }

    const phoneLabel = seg.match(/(?:电话|Phone)[：:]\s*(.+)/i)
    if (phoneLabel && !pi.phone) { pi.phone = extractPhone(phoneLabel[1].trim()); continue }

    // ✉️ → email
    if (/✉️/.test(seg) && !pi.email) {
      const clean = seg.replace(/✉️\s*/, '')
      pi.email = clean.match(RE_EMAIL)?.[0] || clean.trim(); continue
    }

    const emailLabel = seg.match(/(?:邮箱|Email)[：:]\s*(.+)/i)
    if (emailLabel && !pi.email) {
      const clean = emailLabel[1].trim()
      pi.email = clean.match(RE_EMAIL)?.[0] || clean; continue
    }

    // 📍 → location (alt)
    const locEmoji = seg.match(/📍\s*(.+)/)
    if (locEmoji && !pi.location) { pi.location = locEmoji[1].trim(); continue }

    // URL → portfolio
    const urlMatch = seg.match(/(https?:\/\/[^\s)]+)/)
    if (urlMatch && !pi.portfolio) { pi.portfolio = urlMatch[1]; continue }

    // Fallback city
    if (!pi.location) {
      const city = tryMatchCity(seg)
      if (city) { pi.location = city; continue }
    }

    // Fallback phone
    if (!pi.phone) {
      const digits = seg.replace(/\s/g, '')
      if (/^1[3-9]\d{9}$/.test(digits)) { pi.phone = extractPhone(digits); continue }
    }
  }

  return result
}

function parseOldFormatPersonalInfo(section: string, pi: PersonalInfo) {
  if (!pi.name) pi.name = extract(section, /[*-]\s*姓名[：:]\s*(.+)/) || extract(section, /Name[：:]\s*(.+)/i)
  if (!pi.nameEn) pi.nameEn = extract(section, /[*-]\s*(?:英文名|英文姓名|NameEn)[：:]\s*(.+)/i)
  if (!pi.phone) {
    const raw = extract(section, /[*-]\s*(?:电话|Phone|📞)[：:]*\s*(.+)/i)
    if (raw) pi.phone = extractPhone(raw)
  }
  if (!pi.email) pi.email = extract(section, /[*-]\s*(?:邮箱|Email|✉️)[：:]*\s*(.+)/i)
  if (!pi.location) pi.location = extract(section, /[*-]\s*(?:所在地|Location|现居|📍)[：:]*\s*(.+)/i)
  if (!pi.age) pi.age = extract(section, /[*-]\s*(?:年龄|Age)[：:]\s*(\d+)/i)
  if (!pi.portfolio) pi.portfolio = extract(section, /https?:\/\/[^\s)]+/)
}

// ─── Work Experience (new + old format) ───

function parseWorkExperience(body: string, data: ResumeData) {
  const entries = body.split(/\n(?=###\s)/)

  for (const entry of entries) {
    const role = extract(entry, /^###\s+(.+)/)
    if (!role) continue

    const lines = getLines(entry.replace(/^###\s+.+\n?/, ''))
    let company = ''
    let dates = ''
    const bullets: string[] = []

    // Phase 1: detect format
    const hasBoldLine = lines.some((l) => l.startsWith('**'))
    const hasKeyValue = lines.some((l) => /^[*-]\s*(?:时间|公司|Dates?|Company)[：:]\s*/.test(l))

    // Helper: is this a bullet line (starts with - or * but NOT **bold** and NOT ---)
    const isBullet = (l: string) =>
      (l.startsWith('-') && !l.startsWith('---') || l.startsWith('*') && !l.startsWith('**')) &&
      l.trim().length > 1

    if (hasBoldLine) {
      // ── New format: ### role, **company | dates** or **dates | location** ──
      for (const line of lines) {
        if (isBullet(line)) {
          bullets.push(line.replace(/^[*-]\s*/, '').trim())
        } else if (line.startsWith('**')) {
          const boldMatch = line.match(/^\*\*(.+?)\*\*/)
          const boldContent = boldMatch?.[1]?.trim() || ''
          if (!boldContent) continue
          const parts = boldContent.split('|').map((s) => s.trim()).filter(Boolean)
          for (const part of parts) {
            if (isDateRange(part)) {
              dates = part
            } else if (!company && !tryMatchCity(part)) {
              company = part
            }
          }
        }
      }
    } else if (hasKeyValue) {
      // ── Old format: - 公司：xxx, - 时间：xxx ──
      const kv = parseKeyValueList(lines)
      company = kv['公司'] || kv['Company'] || ''
      dates = kv['时间'] || kv['Dates'] || ''
      for (const line of lines) {
        if (!/^[*-]\s*(?:公司|时间|Company|Dates?)[：:]\s*/.test(line) && isBullet(line)) {
          bullets.push(line.replace(/^[*-]\s*/, '').trim())
        }
      }
    } else {
      // ── Fallback: just collect bullets ──
      for (const line of lines) {
        if (isBullet(line)) {
          bullets.push(line.replace(/^[*-]\s*/, '').trim())
        }
      }
    }

    data.workExperience.push({
      id: crypto.randomUUID(),
      company,
      companyEn: '',
      role: role.split(/[|｜·-]/).map((s) => s.trim())[0] || role,
      roleEn: '',
      dates,
      datesEn: '',
      bullets,
      bulletsEn: bullets.map(() => ''),
    })
  }
}

// ─── Education (new + old format) ───

function parseEducation(body: string, data: ResumeData) {
  // Detect format: new uses **bold** lines, old uses ### headers
  const hasBoldLine = body.includes('**')
  const hasTripleHash = /^###\s/m.test(body)

  if (hasBoldLine && !hasTripleHash) {
    // ── New format: single block with **bold** item line(s) ──
    const lines = getLines(body)
    let boldLineIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('**')) { boldLineIdx = i; break }
    }

    if (boldLineIdx >= 0) {
      // Split by ** to isolate the school name from the rest
      const boldSegments = lines[boldLineIdx].split('**').map((s) => s.trim()).filter(Boolean)
      const school = boldSegments[0] || ''
      // Remaining segments after the first **...** — split by | for degree/dates
      const rest = boldSegments.slice(1).join(' ').trim()
      const restParts = rest.split('|').map((s) => s.trim()).filter(Boolean)
      const degree = restParts[0] || ''
      const dates = restParts.find(isDateRange) || restParts[1] || ''

      const highlights: string[] = []
      for (let i = boldLineIdx + 1; i < lines.length; i++) {
        if ((lines[i].startsWith('-') && !lines[i].startsWith('--')) || (lines[i].startsWith('*') && !lines[i].startsWith('**'))) {
          highlights.push(lines[i].replace(/^[*-]\s*/, '').trim())
        }
      }

      data.education.push({
        id: crypto.randomUUID(),
        school,
        schoolEn: '',
        degree,
        degreeEn: '',
        major: '',
        majorEn: '',
        dates,
        datesEn: '',
        highlights,
        highlightsEn: highlights.map(() => ''),
      })
    }
  } else {
    // ── Old format: ### header entries ──
    const entries = body.split(/\n(?=###\s)/)
    for (const entry of entries) {
      const entryHeader = extract(entry, /^###\s+(.+)/)
      if (!entryHeader) continue
      const parts = entryHeader.split(/[|｜·-]/).map((s) => s.trim())
      const lines = getLines(entry.replace(/^###\s+.+\n?/, ''))
      const bullets = lines.filter((l) => l.startsWith('-')).map((l) => l.replace(/^-\s*/, '').trim())
      const kv = parseKeyValueList(lines)
      data.education.push({
        id: crypto.randomUUID(),
        school: parts[0] || '',
        schoolEn: '',
        degree: parts[1] || '',
        degreeEn: '',
        major: parts[2] || '',
        majorEn: '',
        dates: kv['时间'] || kv['Dates'] || extract(entry, /[*-]\s*(?:时间|Dates?)[：:]\s*(.+)/i),
        datesEn: '',
        highlights: bullets,
        highlightsEn: bullets.map(() => ''),
      })
    }
  }
}

// ─── AI Projects (3/4 column table) ───

function parseAIProjects(body: string, data: ResumeData) {
  const lines = getLines(body)
  const tableStart = lines.findIndex((l) => l.startsWith('|'))
  if (tableStart < 0) return

  const separator = lines[tableStart + 1]
  if (!separator || !/^\|[\s\-|]+\|$/.test(separator)) return

  // Determine column count from header
  const headerCells = lines[tableStart].split('|').filter(Boolean).map((c) => c.trim())
  const colCount = headerCells.length

  for (let i = tableStart + 2; i < lines.length; i++) {
    if (!lines[i].startsWith('|')) break
    const cells = lines[i].split('|').filter(Boolean).map((c) => c.trim())
    if (cells.length < 2) continue

    data.aiProjects.push({
      id: crypto.randomUUID(),
      name: cells[0] || '',
      nameEn: '',
      direction: cells[1] || '',
      directionEn: '',
      dates: '',
      datesEn: '',
      description: colCount >= 4 ? (cells[2] || '') : '',
      descriptionEn: '',
    })
  }
}

// ─── Skills (table or list) ───

function parseSkills(body: string, data: ResumeData) {
  const lines = getLines(body)
  const tableStart = lines.findIndex((l) => l.startsWith('|'))

  if (tableStart >= 0) {
    // ── Table format: | 类别 | 技能 | ──
    const separator = lines[tableStart + 1]
    if (separator && /^\|[\s\-|]+\|$/.test(separator)) {
      for (let i = tableStart + 2; i < lines.length; i++) {
        if (!lines[i].startsWith('|')) break
        const cells = lines[i].split('|').filter(Boolean).map((c) => c.trim())
        if (cells.length >= 2) {
          data.skills.push({ category: cells[0], categoryEn: '', items: cells[1], itemsEn: '' })
        }
      }
      return
    }
  }

  // ── List format: - 类别：技能 ──
  for (const line of lines) {
    const m = line.match(/^[*-]\s*(.+?)[：:]\s*(.+)/)
    if (m) data.skills.push({ category: m[1].trim(), categoryEn: '', items: m[2].trim(), itemsEn: '' })
  }
}

// ─── Languages (new **bold** format + old) ───

function parseLanguages(body: string, data: ResumeData) {
  const lines = getLines(body)

  // ── New format: - **中文：** 母语 ──
  const boldLangLines = lines.filter((l) => /\*\*.+?[：:]\s*\*\*/.test(l))
  if (boldLangLines.length > 0) {
    const langs: string[] = []
    for (const line of boldLangLines) {
      const m = line.match(/^[*-]\s*\*\*(.+?)[：:]\s*\*\*\s*(.+)/)
      if (m) langs.push(`${m[1].trim()}（${m[2].trim()}）`)
    }
    if (langs.length > 0) { data.languages = langs; return }
  }

  // ── Old format: - 中文 / 英语 / 德语 ──
  for (const line of lines) {
    if (line.startsWith('-') || line.startsWith('*')) {
      const content = line.replace(/^[*-]\s*/, '')
      const langs = content.split(/[,，、/]/).map((l) => l.trim()).filter(Boolean)
      if (langs.length > 0) data.languages = langs
      break
    }
  }
}

// ─── Core Competencies (new) ───

function parseCoreCompetencies(body: string, data: ResumeData) {
  const backtickItems = body.match(/`([^`]+)`/g)
  if (!backtickItems || backtickItems.length === 0) return
  const items = backtickItems.map((t) => t.replace(/`/g, '').trim()).join(' | ').replace(/\s*\|\s*$/, '')
  data.skills.push({ category: '核心能力', categoryEn: 'Core Competencies', items, itemsEn: items })
}

// ─── Main parser ───

export function parseMarkdownResume(md: string): ResumeData | null {
  try {
    const data: ResumeData = {
      personalInfo: { name: '', nameEn: '', phone: '', email: '', location: '', locationEn: '', portfolio: '', age: '', jobObjective: '', jobObjectiveEn: '', customFields: [] },
      summary: '',
      summaryEn: '',
      workExperience: [],
      aiProjects: [],
      education: [],
      skills: [],
      languages: [],
      languagesEn: [],
      selfEvaluation: '',
      selfEvaluationEn: '',
      customSections: [],
      lang: 'zh',
    }

    const sections = md.split(/\n(?=##\s)/)

    for (const section of sections) {
      const header = extract(section, /^##\s+(.+)/)
      const body = section.replace(/^##\s+.*\n/, '').trim()

      // ─── Personal Info ───
      if (/基本信息/.test(header) || /个人信息/.test(header) || /Personal Info/i.test(header)) {
        const lines = getLines(body)
        const hasFreeFormat = lines.some(
          (l) => (/\*\*/.test(l) || /[📞✉️📍🎓🏠💼🔗🌐]/.test(l)) && !l.startsWith('-') && !l.startsWith('*')
        )
        if (hasFreeFormat) {
          let extraSummaryParts: string[] = []
          for (const line of lines) {
            const { extra } = parseFreeFormatLine(line, data.personalInfo)
            if (extra) extraSummaryParts.push(extra)
          }
          if (extraSummaryParts.length > 0 && !data.summary) data.summary = extraSummaryParts.join('\n')
        }
        parseOldFormatPersonalInfo(section, data.personalInfo)
      }

      // ─── Summary ───
      else if (/个人概述/.test(header) || /Summary/i.test(header)) {
        data.summary = body  // overwrites 求职意向 stash
      }

      // ─── Core Competencies ───
      else if (/核心能力/.test(header) || /Core Competenc/i.test(header)) {
        parseCoreCompetencies(body, data)
      }

      // ─── Work Experience ───
      else if (/工作经历/.test(header) || /Work Experience/i.test(header)) {
        parseWorkExperience(body, data)
      }

      // ─── AI Projects ───
      else if (/AI产品实践/.test(header) || /AI Project/i.test(header)) {
        parseAIProjects(body, data)
      }

      // ─── Education ───
      else if (/教育背景/.test(header) || /Education/i.test(header)) {
        parseEducation(body, data)
      }

      // ─── Skills ───
      else if (/专业技能|技能/.test(header) || /Skills/i.test(header) && !/Language/i.test(header)) {
        parseSkills(body, data)
      }

      // ─── Languages ───
      else if (/语言/.test(header) || /Language/i.test(header)) {
        parseLanguages(body, data)
      }

      // ─── Self Evaluation ───
      else if (/自我评价/.test(header) || /Self[- ]Evaluation/i.test(header)) {
        data.selfEvaluation = body
      }

      // ─── Anything else → custom section ───
      else {
        const label = header.trim()
        if (label) {
          data.customSections.push({ id: `custom_${data.customSections.length}`, label, labelEn: label, content: body, contentEn: body })
        }
      }
    }

    return data
  } catch (e) {
    console.error('Markdown parse error:', e)
    return null
  }
}
