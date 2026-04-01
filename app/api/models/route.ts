/**
 * Models API Route - 模型管理
 * 
 * GET /api/models - 列出所有可用模型
 */

import { initProviders } from '@/src/services/ai-provider/config'
import { providerRegistry } from '@/src/services/ai-provider/registry'

/**
 * 列出所有可用模型
 */
export async function GET() {
  try {
    // 初始化 Provider
    initProviders()
    
    const models = providerRegistry.getAllModels()
    const defaultModel = providerRegistry.getDefaultModelId()
    
    // 转换为前端期望的格式
    const modelList = models.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
      maxTokens: m.maxTokens,
      supportsTools: m.supportsTools,
      supportsVision: m.supportsVision,
    }))
    
    return Response.json({
      models: modelList,
      defaultModel,
    })
  } catch (error) {
    console.error('Models GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
