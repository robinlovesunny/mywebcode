/**
 * Settings API Route - 设置管理
 * 
 * GET /api/settings - 读取当前配置
 * PUT /api/settings - 更新配置
 */

import { NextRequest } from 'next/server'
import { loadConfig, saveConfig, initProviders } from '@/src/services/ai-provider/config'
import type { ProviderConfig } from '@/src/services/ai-provider/types'

/**
 * 读取当前配置
 */
export async function GET() {
  try {
    const config = loadConfig()
    
    // 不返回完整 API Key，只返回是否已配置和后四位
    const safeConfig = {
      providers: Object.fromEntries(
        Object.entries(config.providers).map(([name, provider]) => [
          name,
          {
            ...provider,
            apiKey: provider.apiKey ? '***' + provider.apiKey.slice(-4) : '',
            isConfigured: !!provider.apiKey && 
              provider.apiKey !== 'your-qwen-api-key-here' &&
              provider.apiKey.length > 10,
          },
        ])
      ),
      defaultProvider: config.defaultProvider,
      defaultModel: config.defaultModel,
    }
    
    return Response.json({ config: safeConfig })
  } catch (error) {
    console.error('Settings GET error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 更新配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const config = loadConfig()

    // 更新 providers
    if (body.providers) {
      for (const [name, update] of Object.entries(body.providers)) {
        if (update && typeof update === 'object') {
          if (!config.providers[name]) {
            config.providers[name] = { apiKey: '', enabled: true }
          }
          
          const upd = update as Partial<ProviderConfig & { isConfigured?: boolean }>
          
          // 只有非 mask 的 apiKey 才更新
          if (upd.apiKey && !upd.apiKey.startsWith('***')) {
            config.providers[name].apiKey = upd.apiKey
          }
          if (upd.baseURL !== undefined) {
            config.providers[name].baseURL = upd.baseURL
          }
          if (upd.enabled !== undefined) {
            config.providers[name].enabled = upd.enabled
          }
          if (upd.defaultModel !== undefined) {
            config.providers[name].defaultModel = upd.defaultModel
          }
        }
      }
    }

    if (body.defaultProvider) {
      config.defaultProvider = body.defaultProvider
    }
    if (body.defaultModel) {
      config.defaultModel = body.defaultModel
    }

    // 保存配置
    saveConfig(config)
    
    // 重新初始化 Provider
    initProviders()

    return Response.json({ success: true })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
