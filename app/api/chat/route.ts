/**
 * Chat API Route - 聊天接口 (SSE 流式响应)
 * 
 * 处理聊天请求并返回 Server-Sent Events 流
 * POST /api/chat
 */

import { NextRequest } from 'next/server'
import { initProviders } from '@/src/services/ai-provider/config'
import { sessionManager } from '@/src/services/agent/session'
import { runAgentLoop } from '@/src/services/agent/agent-loop'
import type { UniversalMessage } from '@/src/services/ai-provider/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, model } = body

    // 验证请求参数
    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 初始化 Provider
    initProviders()

    // 获取或创建会话
    let session = sessionId ? sessionManager.getSession(sessionId) : null
    if (!session) {
      session = sessionManager.createSession(model || 'qwen-plus')
    }

    // 如果指定了不同的模型，更新会话模型
    if (model && session.model !== model) {
      sessionManager.updateModel(session.id, model)
    }

    // 添加用户消息
    const userMessage: UniversalMessage = {
      role: 'user',
      content: message,
    }
    sessionManager.addMessage(session.id, userMessage)

    // 创建 SSE 流
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 先发送 sessionId（前端需要知道）
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'session_info', 
              sessionId: session!.id,
              model: session!.model 
            })}\n\n`)
          )

          // 获取当前会话的消息
          const currentSession = sessionManager.getSession(session!.id)
          if (!currentSession) {
            throw new Error('Session not found')
          }

          // 运行 Agent 循环
          const agentEvents = runAgentLoop(currentSession.messages, {
            model: currentSession.model,
          })

          let fullAssistantText = ''

          for await (const event of agentEvents) {
            // 收集完整的 assistant 文本用于保存到会话
            if (event.type === 'text_delta') {
              fullAssistantText += event.text
            }

            // 发送 SSE 事件
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }

          // 保存 assistant 回复到会话
          if (fullAssistantText) {
            sessionManager.addMessage(session!.id, {
              role: 'assistant',
              content: fullAssistantText,
            })
          }

          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
