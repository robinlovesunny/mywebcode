/**
 * MCP 配置管理器
 */
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { MCPConfig, MCPServerConfig, MCPServerInput } from './types'

const CONFIG_DIR = path.join(os.homedir(), '.ai-agent')
const MCP_CONFIG_FILE = path.join(CONFIG_DIR, 'mcp.json')

/** 获取默认配置 */
function getDefaultConfig(): MCPConfig {
  return {
    mcpServers: {}
  }
}

/** 确保配置目录存在 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export class MCPConfigManager {
  /**
   * 加载所有 MCP 服务器配置
   */
  loadConfig(): MCPConfig {
    try {
      if (fs.existsSync(MCP_CONFIG_FILE)) {
        const content = fs.readFileSync(MCP_CONFIG_FILE, 'utf-8')
        const config = JSON.parse(content) as MCPConfig
        return {
          mcpServers: config.mcpServers || {}
        }
      }
    } catch (error) {
      console.warn('Failed to load MCP config:', error)
    }
    return getDefaultConfig()
  }

  /**
   * 保存配置
   */
  saveConfig(config: MCPConfig): void {
    try {
      ensureConfigDir()
      fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save MCP config:', error)
      throw error
    }
  }

  /**
   * 添加 MCP 服务器
   */
  addServer(name: string, input: MCPServerInput): void {
    if (!name || !name.trim()) {
      throw new Error('Server name is required')
    }
    
    const config = this.loadConfig()
    
    if (config.mcpServers[name]) {
      throw new Error(`Server "${name}" already exists`)
    }
    
    config.mcpServers[name] = {
      name,
      ...input
    }
    
    this.saveConfig(config)
  }

  /**
   * 删除 MCP 服务器
   */
  removeServer(name: string): boolean {
    const config = this.loadConfig()
    
    if (!config.mcpServers[name]) {
      return false
    }
    
    delete config.mcpServers[name]
    this.saveConfig(config)
    return true
  }

  /**
   * 更新服务器配置
   */
  updateServer(name: string, updates: Partial<MCPServerConfig>): void {
    const config = this.loadConfig()
    
    if (!config.mcpServers[name]) {
      throw new Error(`Server "${name}" not found`)
    }
    
    // 如果更新了 name，需要移动配置
    if (updates.name && updates.name !== name) {
      const newName = updates.name
      if (config.mcpServers[newName]) {
        throw new Error(`Server "${newName}" already exists`)
      }
      
      config.mcpServers[newName] = {
        ...config.mcpServers[name],
        ...updates
      }
      delete config.mcpServers[name]
    } else {
      config.mcpServers[name] = {
        ...config.mcpServers[name],
        ...updates,
        name // 确保 name 保持一致
      }
    }
    
    this.saveConfig(config)
  }

  /**
   * 启用/禁用服务器
   */
  setServerEnabled(name: string, enabled: boolean): void {
    this.updateServer(name, { enabled })
  }

  /**
   * 获取所有服务器列表
   */
  getServers(): MCPServerConfig[] {
    const config = this.loadConfig()
    return Object.values(config.mcpServers)
  }

  /**
   * 获取单个服务器
   */
  getServer(name: string): MCPServerConfig | undefined {
    const config = this.loadConfig()
    return config.mcpServers[name]
  }
}

// 导出单例
export const mcpConfigManager = new MCPConfigManager()
