/**
 * Skills 单个技能 API Route
 * 
 * GET /api/skills/[name] - 获取单个技能详情
 * PUT /api/skills/[name] - 更新技能
 * DELETE /api/skills/[name] - 删除技能
 * PATCH /api/skills/[name] - 启用/禁用技能
 */

import { NextRequest } from 'next/server'
import { skillsConfigManager } from '@/src/services/skills-config'

interface RouteParams {
  params: Promise<{ name: string }>
}

/**
 * 获取单个技能详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const skill = skillsConfigManager.getSkill(decodeURIComponent(name))
    
    if (!skill) {
      return Response.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }
    
    return Response.json({ skill })
  } catch (error) {
    console.error('Skills GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 更新技能
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const skillName = decodeURIComponent(name)
    const body = await request.json()
    
    // 验证技能是否存在
    const existing = skillsConfigManager.getSkill(skillName)
    if (!existing) {
      return Response.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }
    
    skillsConfigManager.updateSkill(skillName, body)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Skills PUT error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : 
                   message.includes('already exists') ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}

/**
 * 删除技能
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const skillName = decodeURIComponent(name)
    const success = skillsConfigManager.removeSkill(skillName)
    
    if (!success) {
      return Response.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Skills DELETE error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 启用/禁用技能
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params
    const skillName = decodeURIComponent(name)
    const body = await request.json()
    
    if (typeof body.enabled !== 'boolean') {
      return Response.json(
        { error: 'enabled field must be a boolean' },
        { status: 400 }
      )
    }
    
    skillsConfigManager.setSkillEnabled(skillName, body.enabled)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Skills PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
