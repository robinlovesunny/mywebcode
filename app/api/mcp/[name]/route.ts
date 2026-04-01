/**
 * MCP 单个服务器 API Route
 * 
 * GET /api/mcp/[name] - 获取单个服务器配置
 * PUT /api/mcp/[name] - 更新服务器配置
 * DELETE /api/mcp/[name] - 删除服务器
 * PATCH /api/mcp/[name] - 启用/禁用服务器
 */

import { NextRequest } from 'next/server'
import { mcpConfigManager } from '@/src/services/mcp-config'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * 获取单个服务器配置
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const server = mcpConfigManager.getServer(decodeURIComponent(name))
    
    if (!server) {
      return Response.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    return Response.json({ server })
  } catch (error) {
    console.error('MCP GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 更新服务器配置
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const serverName = decodeURIComponent(name)
    const body = await request.json()
    
    // 验证服务器是否存在
    const existing = mcpConfigManager.getServer(serverName)
    if (!existing) {
      return Response.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    // 验证传输配置（如果提供）
    if (body.transport) {
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
      }
    }
    
    mcpConfigManager.updateServer(serverName, body)
    return Response.json({ success: true })
  } catch (error) {
    console.error('MCP PUT error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : 
                   message.includes('already exists') ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}

/**
 * 删除服务器
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const serverName = decodeURIComponent(name)
    const success = mcpConfigManager.removeServer(serverName)
    
    if (!success) {
      return Response.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('MCP DELETE error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 启用/禁用服务器
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const serverName = decodeURIComponent(name)
    const body = await request.json()
    
    if (typeof body.enabled !== 'boolean') {
      return Response.json(
        { error: 'enabled field must be a boolean' },
        { status: 400 }
      )
    }
    
    mcpConfigManager.setServerEnabled(serverName, body.enabled)
    return Response.json({ success: true })
  } catch (error) {
    console.error('MCP PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
