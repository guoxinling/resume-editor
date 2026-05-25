import type { ChatMessage } from '../types/ai'
import { useAuthStore } from '../store/authStore'

export type AIFeature = 'wizard' | 'polish' | 'adapt' | 'interview' | 'translate' | 'import_parse'

interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: () => void
  onError: (error: string) => void
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return fallback
    try {
      const data = JSON.parse(text)
      return data?.error || data?.message || fallback
    } catch {
      return text.slice(0, 240)
    }
  } catch {
    return fallback
  }
}

export async function streamChat(
  messages: ChatMessage[],
  feature: AIFeature,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  try {
    const token = await useAuthStore.getState().getAccessToken()
    if (!token) {
      useAuthStore.getState().openAuthModal()
      callbacks.onError('请先登录后使用 AI 功能')
      return
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        feature,
        stream: true,
      }),
      signal: abortSignal,
    })

    if (!response.ok) {
      if (response.status === 401) callbacks.onError('AI 服务鉴权失败，请稍后重试')
      else if (response.status === 429) callbacks.onError('请求频率过高，请稍后再试')
      else if (response.status === 402) {
        useAuthStore.getState().openCreditModal()
        callbacks.onError('点数不足，请先充值')
      }
      else callbacks.onError(await readErrorMessage(response, 'AI 服务暂时不可用，请稍后重试'))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('无法读取响应流')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          useAuthStore.getState().refreshCredits().catch(() => {})
          callbacks.onDone()
          return
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) callbacks.onToken(content)
        } catch { /* skip malformed chunks */ }
      }
    }
    useAuthStore.getState().refreshCredits().catch(() => {})
    callbacks.onDone()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      callbacks.onDone()
      return
    }
    callbacks.onError(err.message || '网络错误，请检查连接')
  }
}

/** Non-streaming chat — used for adapt / interview results */
export async function chatComplete(messages: ChatMessage[], feature: AIFeature): Promise<string> {
  const token = await useAuthStore.getState().getAccessToken()
  if (!token) {
    useAuthStore.getState().openAuthModal()
    throw new Error('请先登录后使用 AI 功能')
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      feature,
      stream: false,
    }),
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('AI 服务鉴权失败')
    if (response.status === 402) {
      useAuthStore.getState().openCreditModal()
      throw new Error('点数不足，请先充值')
    }
    if (response.status === 429) throw new Error('请求频率过高')
    throw new Error(await readErrorMessage(response, 'AI 服务暂时不可用，请稍后重试'))
  }

  const data = await response.json()
  useAuthStore.getState().refreshCredits().catch(() => {})
  return data.choices?.[0]?.message?.content || ''
}
