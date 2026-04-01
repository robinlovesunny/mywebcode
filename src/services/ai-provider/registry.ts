import type { AIProvider, ModelInfo, AIConfig } from './types'
import { QwenProvider } from './qwen'

class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map()
  private defaultProviderName: string = 'qwen'
  private defaultModelId: string = 'qwen-plus'

  /** 注册一个 Provider */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider)
  }

  /** 获取指定 Provider */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  /** 获取默认 Provider */
  getDefaultProvider(): AIProvider | undefined {
    return this.providers.get(this.defaultProviderName)
  }

  /** 获取默认模型 ID */
  getDefaultModelId(): string {
    return this.defaultModelId
  }

  /** 设置默认 Provider */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" is not registered`)
    }
    this.defaultProviderName = name
  }

  /** 设置默认模型 */
  setDefaultModel(modelId: string): void {
    this.defaultModelId = modelId
  }

  /** 获取所有已注册的 Provider */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  /** 获取所有可用模型（聚合所有 Provider） */
  getAllModels(): ModelInfo[] {
    const models: ModelInfo[] = []
    for (const provider of this.providers.values()) {
      models.push(...provider.listModels())
    }
    return models
  }

  /** 根据模型 ID 找到对应的 Provider */
  getProviderForModel(modelId: string): AIProvider | undefined {
    for (const provider of this.providers.values()) {
      const models = provider.listModels()
      if (models.some(m => m.id === modelId)) {
        return provider
      }
    }
    return undefined
  }

  /** 从配置初始化所有 Provider */
  initFromConfig(config: AIConfig): void {
    // 清除现有注册
    this.providers.clear()

    // Qwen Provider
    if (config.providers.qwen) {
      const qwenProvider = new QwenProvider(config.providers.qwen)
      this.register(qwenProvider)
    }

    // 设置默认值
    if (config.defaultProvider) {
      this.defaultProviderName = config.defaultProvider
    }
    if (config.defaultModel) {
      this.defaultModelId = config.defaultModel
    }
  }
}

// 全局单例
export const providerRegistry = new ProviderRegistry()

/** 便捷方法：获取指定模型的 Provider 并发送消息 */
export function getProviderForModel(modelId: string): AIProvider {
  const provider = providerRegistry.getProviderForModel(modelId)
  if (!provider) {
    throw new Error(`No provider found for model "${modelId}"`)
  }
  return provider
}
