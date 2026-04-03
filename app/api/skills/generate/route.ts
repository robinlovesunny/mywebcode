/**
 * AI 生成技能 API Route
 * 
 * POST /api/skills/generate - 根据用户需求描述，AI 自动生成技能配置
 */

import { NextRequest } from 'next/server'
import { initProviders } from '@/src/services/ai-provider/config'
import { runSingleTurn, aggregateAgentEvents } from '@/src/services/agent/agent-loop'
import { SKILL_GENERATE_SYSTEM_PROMPT, parseSkillFromAIResponse } from '@/src/services/skills-config'
import type { UniversalMessage } from '@/src/services/ai-provider/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return Response.json(
        { error: '请输入技能需求描述' },
        { status: 400 }
      )
    }

    // 初始化 AI Provider
    let config
    try {
      config = initProviders()
    } catch (error) {
      return Response.json(
        { error: 'AI 服务未配置，请先在设置中配置 API Key' },
        { status: 400 }
      )
    }

    // 构建消息
    const messages: UniversalMessage[] = [
      {
        role: 'system',
        content: SKILL_GENERATE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `请根据以下需求生成一个技能配置：\n\n${prompt.trim()}`,
      },
    ]

    // 调用 AI（单轮对话，无工具调用）
    const events = runSingleTurn(messages, {
      model: config.defaultModel || 'qwen-plus',
      temperature: 0.7,
    })

    const result = await aggregateAgentEvents(events)

    if (result.error) {
      return Response.json(
        { error: `AI 生成失败: ${result.error}` },
        { status: 500 }
      )
    }

    if (!result.text) {
      return Response.json(
        { error: 'AI 未返回有效回复，请重试' },
        { status: 422 }
      )
    }

    // 解析 AI 回复为 SkillConfig
    try {
      const skill = parseSkillFromAIResponse(result.text)
      return Response.json({ skill })
    } catch (parseError) {
      console.error('Failed to parse AI response:', result.text)
      return Response.json(
        { error: parseError instanceof Error ? parseError.message : '解析 AI 回复失败，请重试' },
        { status: 422 }
      )
    }
  } catch (error) {
    console.error('Skills generate error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    )
  }
}
