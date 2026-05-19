import { useState, useRef, useCallback } from 'react'

interface UseAIStreamReturn {
  content: string
  loading: boolean
  error: string | null
  start: (prompt: () => Promise<void>) => void
  stop: () => void
  reset: () => void
}

export function useAIStream(): UseAIStreamReturn {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(async (prompt: () => Promise<void>) => {
    setContent('')
    setError(null)
    setLoading(true)
    abortRef.current = new AbortController()
    try {
      await prompt()
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || '未知错误')
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    setContent('')
    setError(null)
  }, [])

  return { content, loading, error, start, stop, reset }
}
