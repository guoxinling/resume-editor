import type { ChatMessage } from '../types/ai'

interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
      signal: abortSignal,
    })

    if (!response.ok) {
      if (response.status === 401) callbacks.onError('AI 服务鉴权失败，请稍后重试')
      else if (response.status === 429) callbacks.onError('请求频率过高，请稍后再试')
      else callbacks.onError('AI 服务暂时不可用，请稍后重试')
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
export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('AI 服务鉴权失败')
    if (response.status === 429) throw new Error('请求频率过高')
    throw new Error('AI 服务暂时不可用，请稍后重试')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
