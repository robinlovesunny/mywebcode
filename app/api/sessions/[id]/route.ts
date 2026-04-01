/**
 * Single Session API Route - 单个会话操作
 * 
 * GET    /api/sessions/[id] - 获取会话详情（包含消息历史）
 * PATCH  /api/sessions/[id] - 更新会话（标题、模型）
 * DELETE /api/sessions/[id] - 删除会话
 */

import { NextRequest } from 'next/server'
import { sessionManager } from '@/src/services/agent/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * 获取会话详情（包含消息历史）
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const session = sessionManager.getSession(id)
    
    if (!session) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    return Response.json({ session })
  } catch (error) {
    console.error('Session GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 更新会话（标题、模型）
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const session = sessionManager.getSession(id)
    
    if (!session) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { title, model } = body

    if (title !== undefined) {
      sessionManager.updateTitle(id, title)
    }

    if (model !== undefined) {
      sessionManager.updateModel(id, model)
    }

    const updatedSession = sessionManager.getSession(id)
    
    return Response.json({
      session: {
        id: updatedSession!.id,
        title: updatedSession!.title,
        model: updatedSession!.model,
        messageCount: updatedSession!.messages.length,
        createdAt: updatedSession!.createdAt,
        updatedAt: updatedSession!.updatedAt,
      }
    })
  } catch (error) {
    console.error('Session PATCH error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 删除会话
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const deleted = sessionManager.deleteSession(id)
    
    if (!deleted) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Session DELETE error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
