/**
 * MCP API Route - MCP 服务器管理
 * 
 * GET /api/mcp - 获取所有 MCP 服务器配置
 * POST /api/mcp - 添加新 MCP 服务器
 */

import { NextRequest } from 'next/server'
import { mcpConfigManager } from '@/src/services/mcp-config'

/**
 * 获取所有 MCP 服务器配置
 */
export async function GET() {
  try {
    const servers = mcpConfigManager.getServers()
    return Response.json({ servers })
  } catch (error) {
    console.error('MCP GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 添加新 MCP 服务器
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.name || typeof body.name !== 'string') {
      return Response.json(
        { error: 'Server name is required' },
        { status: 400 }
      )
    }
    
    if (!body.transport || !body.transport.type) {
      return Response.json(
        { error: 'Transport configuration is required' },
        { status: 400 }
      )
    }
    
    // 验证传输类型配置
    const transportType = body.transport.type
    if (transportType === 'stdio') {
      if (!body.transport.command) {
        return Response.json(
          { error: 'Command is required for stdio transport' },
          { status: 400 }
        )
      }
    } else if (transportType === 'sse' || transportType === 'http') {
      if (!body.transport.url) {
        return Response.json(
          { error: 'URL is required for SSE/HTTP transport' },
          { status: 400 }
        )
      }
    } else {
      return Response.json(
        { error: 'Invalid transport type. Must be stdio, sse, or http' },
        { status: 400 }
      )
    }
    
    mcpConfigManager.addServer(body.name, {
      transport: body.transport,
      enabled: body.enabled ?? true,
      description: body.description || ''
    })
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('MCP POST error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('already exists') ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}
