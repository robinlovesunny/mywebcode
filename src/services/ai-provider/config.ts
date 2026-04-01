import type { AIConfig, ProviderConfig } from './types'
import { providerRegistry } from './registry'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.ai-agent')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/** 默认配置 */
function getDefaultConfig(): AIConfig {
  return {
    providers: {
      qwen: {
        apiKey: process.env.QWEN_API_KEY || '',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultModel: 'qwen-plus',
        enabled: true,
      },
    },
    defaultProvider: 'qwen',
    defaultModel: 'qwen-plus',
  }
}

/** 从文件和环境变量加载配置 */
export function loadConfig(): AIConfig {
  let config = getDefaultConfig()

  // 尝试从配置文件加载
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const fileConfig = JSON.parse(fileContent) as Partial<AIConfig>
      config = mergeConfig(config, fileConfig)
    }
  } catch (error) {
    console.warn('Failed to load config file:', error)
  }

  // 环境变量覆盖（优先级最高）
  if (process.env.QWEN_API_KEY) {
    if (!config.providers.qwen) {
      config.providers.qwen = { apiKey: '', enabled: true }
    }
    config.providers.qwen.apiKey = process.env.QWEN_API_KEY
  }

  if (process.env.DEFAULT_MODEL) {
    config.defaultModel = process.env.DEFAULT_MODEL
  }

  return config
}

/** 保存配置到文件 */
export function saveConfig(config: AIConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save config:', error)
    throw error
  }
}

/** 初始化 Provider 系统 */
export function initProviders(): AIConfig {
  const config = loadConfig()
  providerRegistry.initFromConfig(config)
  return config
}

/** 更新单个 Provider 的配置 */
export function updateProviderConfig(providerName: string, update: Partial<ProviderConfig>): AIConfig {
  const config = loadConfig()
  if (!config.providers[providerName]) {
    config.providers[providerName] = { apiKey: '', enabled: true }
  }
  Object.assign(config.providers[providerName], update)
  saveConfig(config)
  
  // 重新初始化
  providerRegistry.initFromConfig(config)
  return config
}

/** 合并配置 */
function mergeConfig(base: AIConfig, override: Partial<AIConfig>): AIConfig {
  return {
    providers: {
      ...base.providers,
      ...(override.providers || {}),
    },
    defaultProvider: override.defaultProvider || base.defaultProvider,
    defaultModel: override.defaultModel || base.defaultModel,
  }
}
