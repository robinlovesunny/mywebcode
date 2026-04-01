"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export type MessageRole = "user" | "assistant" | "tool"

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  status: "pending" | "running" | "success" | "error"
  result?: string
  error?: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
  toolCalls?: ToolCall[]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function useChat(sessionId: string | null, model: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // 当 sessionId 变化时从 API 加载消息
  useEffect(() => {
    if (sessionId) {
      loadMessagesFromAPI(sessionId)
    } else {
      setMessages([])
    }
    setStreamingContent("")
    setCurrentToolCalls([])
  }, [sessionId])

  // 从 API 加载会话消息
  const loadMessagesFromAPI = async (sid: string) => {
    try {
      const response = await fetch(`/api/sessions/${sid}`)
      if (response.ok) {
        const data = await response.json()
        if (data.session?.messages) {
          // 转换后端消息格式为前端格式
          const frontendMessages: Message[] = data.session.messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({
              id: generateId(),
              role: m.role as MessageRole,
              content: typeof m.content === 'string' ? m.content : '',
              createdAt: new Date(),
              toolCalls: m.tool_calls?.map((tc: any) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments || '{}'),
                status: 'success' as const,
              })),
            }))
          setMessages(frontendMessages)
        }
      }
    } catch (e) {
      console.error("Failed to load messages from API:", e)
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // 创建用户消息
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setStreamingContent("")
    setCurrentToolCalls([])

    // 创建 AbortController 用于取消
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content.trim(),
          model,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let currentContent = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              // 流结束，添加完整的 AI 消息
              if (currentContent) {
                const assistantMessage: Message = {
                  id: generateId(),
                  role: "assistant",
                  content: currentContent,
                  createdAt: new Date(),
                  toolCalls: currentToolCalls.length > 0 ? [...currentToolCalls] : undefined,
                }
                setMessages(prev => [...prev, assistantMessage])
              }
              break
            }

            try {
              const event = JSON.parse(data)
              
              switch (event.type) {
                case 'session_info':
                  // 可用于更新 sessionId（如果需要）
                  break

                case 'text_delta':
                  currentContent += event.text
                  setStreamingContent(currentContent)
                  break

                case 'tool_call_start':
                  const newToolCall: ToolCall = {
                    id: event.toolCall.id,
                    name: event.toolCall.function.name,
                    arguments: {},
                    status: 'pending',
                  }
                  setCurrentToolCalls(prev => [...prev, newToolCall])
                  break

                case 'tool_call_delta':
                  // 累积工具调用参数
                  break

                case 'tool_call_end':
                  setCurrentToolCalls(prev => prev.map((tc, idx) => {
                    if (idx === event.index && event.toolCall) {
                      try {
                        const args = JSON.parse(event.toolCall.function.arguments || '{}')
                        return { ...tc, arguments: args, status: 'running' as const }
                      } catch {
                        return { ...tc, status: 'running' as const }
                      }
                    }
                    return tc
                  }))
                  break

                case 'tool_result':
                  setCurrentToolCalls(prev => prev.map(tc => {
                    if (tc.id === event.toolCallId) {
                      return {
                        ...tc,
                        status: event.isError ? 'error' as const : 'success' as const,
                        result: event.result,
                        error: event.isError ? event.result : undefined,
                      }
                    }
                    return tc
                  }))
                  break

                case 'error':
                  console.error('Stream error:', event.error)
                  // 添加错误消息
                  const errorMessage: Message = {
                    id: generateId(),
                    role: "assistant",
                    content: `错误: ${event.error}`,
                    createdAt: new Date(),
                  }
                  setMessages(prev => [...prev, errorMessage])
                  break

                case 'status':
                case 'round_start':
                case 'message_end':
                  // 可选处理状态更新
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e, data)
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // 用户取消
        if (streamingContent) {
          const partialMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: streamingContent + "\n\n*[生成已停止]*",
            createdAt: new Date(),
          }
          setMessages(prev => [...prev, partialMessage])
        }
      } else {
        console.error("Error sending message:", error)
        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: `发送消息失败: ${(error as Error).message}`,
          createdAt: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      setStreamingContent("")
      setCurrentToolCalls([])
      abortControllerRef.current = null
    }
  }, [sessionId, model, isLoading, streamingContent, currentToolCalls])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    streamingContent,
    currentToolCalls,
    sendMessage,
    stopGeneration,
    clearMessages,
  }
}
