/**
 * Skills API Route - 技能管理
 * 
 * GET /api/skills - 获取所有技能列表
 * POST /api/skills - 添加新技能
 */

import { NextRequest } from 'next/server'
import { skillsConfigManager } from '@/src/services/skills-config'

/**
 * 获取所有技能列表
 */
export async function GET() {
  try {
    const skills = skillsConfigManager.getSkills()
    return Response.json({ skills })
  } catch (error) {
    console.error('Skills GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 添加新技能
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.name || typeof body.name !== 'string') {
      return Response.json(
        { error: 'Skill name is required' },
        { status: 400 }
      )
    }
    
    if (!body.description || typeof body.description !== 'string') {
      return Response.json(
        { error: 'Skill description is required' },
        { status: 400 }
      )
    }
    
    if (!body.content || typeof body.content !== 'string') {
      return Response.json(
        { error: 'Skill content is required' },
        { status: 400 }
      )
    }
    
    skillsConfigManager.addSkill({
      name: body.name,
      displayName: body.displayName || body.name,
      description: body.description,
      whenToUse: body.whenToUse || '',
      allowedTools: body.allowedTools || [],
      arguments: body.arguments || [],
      argumentHint: body.argumentHint || '',
      userInvocable: body.userInvocable ?? true,
      version: body.version || '1.0.0',
      paths: body.paths || [],
      context: body.context || 'inline',
      content: body.content,
      enabled: body.enabled ?? true,
      source: body.source || 'user'
    })
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Skills POST error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('already exists') ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}
