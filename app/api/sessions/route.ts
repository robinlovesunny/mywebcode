/**
 * Sessions API Route - 会话列表管理
 * 
 * GET  /api/sessions - 列出所有会话
 * POST /api/sessions - 创建新会话
 */

import { NextRequest } from 'next/server'
import { sessionManager } from '@/src/services/agent/session'
import { initProviders } from '@/src/services/ai-provider/config'
import { providerRegistry } from '@/src/services/ai-provider/registry'

/**
 * 列出所有会话
 */
export async function GET() {
  try {
    const sessions = sessionManager.getAllSessions()
    
    // 返回简化的会话列表（不包含完整消息历史）
    const sessionList = sessions.map(s => ({
      id: s.id,
      title: s.title,
      model: s.model,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
    
    return Response.json({ sessions: sessionList })
  } catch (error) {
    console.error('Sessions GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 创建新会话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    let { model } = body

    // 初始化 Provider 以获取默认模型
    initProviders()
    
    // 如果没有指定模型，使用默认模型
    if (!model) {
      model = providerRegistry.getDefaultModelId()
    }

    const session = sessionManager.createSession(model)
    
    return Response.json({
      session: {
        id: session.id,
        title: session.title,
        model: session.model,
        messageCount: 0,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }
    })
  } catch (error) {
    console.error('Sessions POST error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
