import { useRef } from 'react'
import { useResumeStore } from '../store/resumeStore'
import ResumePreview from './ResumePreview'

export default function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <main className="h-full preview-bg preview-scroll overflow-auto flex justify-center py-8 px-4">
      <div className="preview-a4" id="resume-preview" ref={containerRef}>
        <ResumePreview />
      </div>
    </main>
  )
}
