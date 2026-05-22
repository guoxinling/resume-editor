import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer'
import type { ResumeData, Lang } from '../types/resume'
import { useResumeStore } from '../store/resumeStore'

// ── Font: Noto Sans SC ──
// Regular + Bold from loli.net mirror (verified 2026-05-18)
// Bold URL uses FnYxN hash variant (different from regular EnYxN)
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    {
      src: 'https://gstatic.loli.net/s/notosanssc/v39/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_EnYxNbPzS5HE.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://gstatic.loli.net/s/notosanssc/v39/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.ttf',
      fontWeight: 700,
    },
  ],
})

// ── Layout values ──
const PAGE_W = 595.28  // A4 width in pt
const PADDING = 36     // page padding (was 40, reduced for header spacing)
const CONTENT_W = PAGE_W - PADDING * 2  // = ~523

const styles = StyleSheet.create({
  page: {
    padding: PADDING,
    paddingTop: 28,  // reduced top padding
    fontFamily: 'Noto Sans SC',
    fontSize: 10,
    lineHeight: 1.6,
    color: '#1a1a1a',
  },

  // ═══ Header ═══
  header: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '1 solid #e5e5e5',
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    paddingRight: 14,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.2,
    color: '#111',
    marginBottom: 3,
  },
  objectiveText: {
    fontSize: 10,
    fontWeight: 500,
    color: '#4F46E5',
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9,
    color: '#555',
    lineHeight: 1.6,
    marginBottom: 1,
  },
  linkLine: {
    fontSize: 9,
    color: '#2563eb',
    lineHeight: 1.6,
  },
  photo: {
    width: 58,
    height: 78,
    objectFit: 'cover',
  },

  // ═══ Section Title (matching preview: short purple accent + bold title) ═══
  sectionWrap: {
    marginTop: 12,
    marginBottom: 6,
  },
  accentLine: {
    width: 32,
    height: 2,
    backgroundColor: '#7C3AED',
    marginBottom: 4,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0F172A',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // ═══ Summary ═══
  summaryView: {
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.65,
    color: '#334155',
  },

  // ═══ Entry (Work + Education + Projects) ═══
  entry: {
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0F172A',
    lineHeight: 1.45,
    marginBottom: 1,
  },
  entrySub: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  entryDates: {
    fontSize: 9,
    color: '#94a3b8',
    flexShrink: 0,
  },
  entryDesc: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#475569',
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#475569',
    marginLeft: 12,
  },

  // ═══ Skills ═══
  skillRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  skillCat: {
    width: 84,
    fontSize: 10,
    fontWeight: 700,
    color: '#0F172A',
  },
  skillItems: {
    flex: 1,
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },

})

// ── Reusable Section Title (matches preview: short purple bar + bold) ──
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.accentLine} />
      <Text style={styles.sectionTitleText}>{children}</Text>
    </View>
  )
}

function PDFResume({ data, lang }: { data: ResumeData; lang: Lang }) {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en)

  // Section title helper: uses store's user-editable labels, falls back to defaults
  const storeState = useResumeStore.getState()
  const sectionOrder = storeState.sectionOrder
  const fallbackLabels: Record<string, { zh: string; en: string }> = {
    summary: { zh: '个人概述', en: 'PROFESSIONAL SUMMARY' },
    workExperience: { zh: '工作经历', en: 'WORK EXPERIENCE' },
    aiProjects: { zh: '项目经历', en: 'PROJECTS' },
    education: { zh: '教育背景', en: 'EDUCATION' },
    skills: { zh: '专业技能', en: 'SKILLS' },
    languages: { zh: '语言能力', en: 'LANGUAGES' },
    selfEvaluation: { zh: '自我评价', en: 'SELF EVALUATION' },
  }

  const st = (sectionKey: string): string => {
    const sl = storeState.sectionLabels
    if (sl[sectionKey]) return lang === 'zh' ? sl[sectionKey].zh : sl[sectionKey].en
    // For custom sections, use the section's own label
    if (sectionKey.startsWith('custom_')) {
      const cs = data.customSections.find((c) => c.id === sectionKey)
      if (cs) return t(cs.label, cs.labelEn)
    }
    // Built-in fallback
    const fb = fallbackLabels[sectionKey]
    return fb ? (lang === 'zh' ? fb.zh : fb.en) : sectionKey
  }

  const pi = data.personalInfo

  const nameDisplay = t(pi.name, pi.nameEn || pi.name)
  const locationDisplay = t(pi.location, pi.locationEn || pi.location)
  const hasPhoto = !!pi.photo

  const contactLine1 = [
    pi.phone, pi.email, locationDisplay,
    pi.age ? t(`${pi.age}岁`, `${pi.age} y/o`) : '',
  ].filter(Boolean).join('  |  ')

  const customFieldsLine = pi.customFields
    .filter((f) => f.key && f.value)
    .map((f) => `${f.key}: ${f.value}`)
    .join('  |  ')

  // Check if a section has content to render
  const sectionHasContent = (key: string): boolean => {
    switch (key) {
      case 'summary':
        return !!t(data.summary, data.summaryEn)
      case 'workExperience':
        return data.workExperience.some((w) => w.company || w.companyEn)
      case 'aiProjects':
        return data.aiProjects.some((p) => p.name || p.nameEn)
      case 'education':
        return data.education.some((e) => e.school || e.schoolEn)
      case 'skills':
        return data.skills.some((s) => s.category || s.categoryEn)
      case 'languages':
        return data.languages.length > 0 || data.languagesEn.length > 0
      case 'selfEvaluation':
        return !!(lang === 'zh' ? data.selfEvaluation : data.selfEvaluationEn)
      default:
        if (key.startsWith('custom_')) {
          const cs = data.customSections.find((c) => c.id === key)
          return !!(cs && t(cs.content, cs.contentEn))
        }
        return false
    }
  }

  /** Render a section by key (driven by sectionOrder, same as preview) */
  const renderSection = (key: string) => {
    if (!sectionHasContent(key)) return null
    const title = st(key)
    if (!title) return null

    // ── Summary ──
    if (key === 'summary') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          <View style={styles.summaryView}>
            <Text style={styles.summaryText}>{t(data.summary, data.summaryEn)}</Text>
          </View>
        </React.Fragment>
      )
    }

    // ── Work Experience ──
    if (key === 'workExperience') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          {data.workExperience.map((w) => {
            const company = t(w.company, w.companyEn)
            const role = t(w.role, w.roleEn)
            const dates = t(w.dates, w.datesEn)
            const bullets = lang === 'zh' ? w.bullets : w.bulletsEn
            if (!company && !role) return null
            return (
              <View key={w.id} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>
                  {[company, role].filter(Boolean).join(' | ')}
                </Text>
                {dates ? <Text style={styles.entrySub}>{dates}</Text> : null}
                {bullets.filter(Boolean).map((b, i) => (
                  <Text key={i} style={styles.bullet}>• {b}</Text>
                ))}
              </View>
            )
          })}
        </React.Fragment>
      )
    }

    // ── Projects ──
    if (key === 'aiProjects') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          {data.aiProjects.map((p) => {
            const name = t(p.name, p.nameEn)
            const role = t(p.direction, p.directionEn)
            const dates = t(p.dates, p.datesEn)
            const desc = t(p.description, p.descriptionEn)
            if (!name && !role) return null
            return (
              <View key={p.id} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>
                  {[name, role].filter(Boolean).join(' · ')}
                </Text>
                {dates ? <Text style={styles.entrySub}>{dates}</Text> : null}
                {desc ? desc.split('\n').filter(Boolean).map((line, i) => (
                  <Text key={i} style={styles.bullet}>– {line}</Text>
                )) : null}
              </View>
            )
          })}
        </React.Fragment>
      )
    }

    // ── Education ──
    if (key === 'education') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          {data.education.map((e) => {
            const school = t(e.school, e.schoolEn)
            if (!school) return null
            const highlights = lang === 'zh' ? e.highlights : e.highlightsEn
            return (
              <View key={e.id} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>
                  {[school, t(e.degree, e.degreeEn), t(e.major, e.majorEn)].filter(Boolean).join(' | ')}
                </Text>
                {t(e.dates, e.datesEn) ? <Text style={styles.entrySub}>{t(e.dates, e.datesEn)}</Text> : null}
                {highlights.filter(Boolean).map((h, i) => (
                  <Text key={i} style={styles.bullet}>• {h}</Text>
                ))}
              </View>
            )
          })}
        </React.Fragment>
      )
    }

    // ── Skills ──
    if (key === 'skills') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          {data.skills.map((s, i) => {
            const cat = t(s.category, s.categoryEn)
            if (!cat) return null
            return (
              <View key={i} style={styles.skillRow} wrap={false}>
                <Text style={styles.skillCat}>{cat}</Text>
                <Text style={styles.skillItems}>{t(s.items, s.itemsEn)}</Text>
              </View>
            )
          })}
        </React.Fragment>
      )
    }

    // ── Languages ──
    if (key === 'languages') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          <Text style={styles.summaryText}>
            {t(data.languages.join(' / '), data.languagesEn.join(' / '))}
          </Text>
        </React.Fragment>
      )
    }

    // ── Self Evaluation ──
    if (key === 'selfEvaluation') {
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          <Text style={styles.summaryText}>
            {t(data.selfEvaluation, data.selfEvaluationEn)}
          </Text>
        </React.Fragment>
      )
    }

    // ── Custom Section ──
    if (key.startsWith('custom_')) {
      const cs = data.customSections.find((c) => c.id === key)
      if (!cs) return null
      const content = t(cs.content, cs.contentEn)
      if (!content) return null
      return (
        <React.Fragment key={key}>
          <SectionTitle>{title}</SectionTitle>
          <Text style={styles.summaryText}>{content}</Text>
        </React.Fragment>
      )
    }

    return null
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ═══ Header ═══ */}
        {(nameDisplay || hasPhoto) ? (
          <View style={styles.header}>
            <View style={styles.headerInner}>
              <View style={styles.headerText}>
                {nameDisplay ? <Text style={styles.nameText}>{nameDisplay}</Text> : null}
                {t(pi.jobObjective, pi.jobObjectiveEn) ? (
                  <Text style={styles.objectiveText}>{t(pi.jobObjective, pi.jobObjectiveEn)}</Text>
                ) : null}
                {contactLine1 ? <Text style={styles.contactLine}>{contactLine1}</Text> : null}
                {pi.portfolio ? <Text style={styles.linkLine}>{pi.portfolio}</Text> : null}
                {customFieldsLine ? <Text style={styles.linkLine}>{customFieldsLine}</Text> : null}
              </View>
              {hasPhoto ? <Image src={pi.photo!} style={styles.photo} /> : null}
            </View>
          </View>
        ) : null}

        {/* ═══ Sections driven by editor sectionOrder (matching preview) ═══ */}
        {sectionOrder.filter((k) => k !== 'personalInfo').map(renderSection)}
      </Page>
    </Document>
  )
}

export async function exportPdf(data: ResumeData, lang: Lang): Promise<Uint8Array> {
  const blob = await pdf(<PDFResume data={data} lang={lang} />).toBlob()
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

export async function downloadPdf(data: ResumeData, lang: Lang, filename?: string): Promise<void> {
  const blob = await pdf(<PDFResume data={data} lang={lang} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'resume.pdf'
  a.click()
  URL.revokeObjectURL(url)
}
