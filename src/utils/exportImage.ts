import html2canvas from 'html2canvas'

export async function exportPng(element: HTMLElement, filename?: string): Promise<void> {
  // Hide page break indicator lines during capture
  const style = document.createElement('style')
  style.id = '_export-png-hide-breaks'
  style.textContent = '.page-break-indicator { visibility: hidden !important; }'
  document.head.appendChild(style)

  try {
    // Small delay to ensure style is applied
    await new Promise(r => requestAnimationFrame(r))

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve()
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'resume.png'
        a.click()
        URL.revokeObjectURL(url)
        resolve()
      }, 'image/png')
    })
  } finally {
    // Always clean up the injected style
    const s = document.getElementById('_export-png-hide-breaks')
    if (s) s.remove()
  }
}
