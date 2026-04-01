/**
 * Tool Executor - 工具执行器
 * 
 * 负责：
 * - 管理工具注册
 * - 执行工具调用
 * - 格式化执行结果
 */

import type { ToolCall, ToolDefinition, UniversalMessage } from '../ai-provider/types'
import {
  createErrorResult,
  createSuccessResult,
  parseToolCall,
  toolResultToMessage,
  type ToolExecutionResult,
} from '../ai-provider/tool-adapter'
import type { SimpleTool, ToolContext } from './tools/types'

/**
 * 工具执行器配置
 */
export interface ToolExecutorConfig {
  /** 默认工作目录 */
  defaultCwd?: string
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number
  /** 环境变量 */
  env?: Record<string, string>
}

/**
 * 工具执行器
 */
export class ToolExecutor {
  private tools: Map<string, SimpleTool> = new Map()
  private config: ToolExecutorConfig

  constructor(config: ToolExecutorConfig = {}) {
    this.config = {
      defaultCwd: config.defaultCwd || process.cwd(),
      defaultTimeout: config.defaultTimeout || 30000,
      env: config.env || {},
    }
  }

  /**
   * 注册单个工具
   */
  registerTool(tool: SimpleTool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered, replacing...`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * 注册多个工具
   */
  registerTools(tools: SimpleTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool)
    }
  }

  /**
   * 注销工具
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * 获取已注册的工具
   */
  getTool(name: string): SimpleTool | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有已注册工具的名称
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * 获取所有已注册工具的 OpenAI 格式定义
   */
  getToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = []

    for (const tool of this.tools.values()) {
      definitions.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: tool.parameters.properties,
            required: tool.parameters.required,
          },
        },
      })
    }

    return definitions
  }

  /**
   * 执行工具调用
   */
  async executeTool(
    toolCall: ToolCall,
    contextOverrides?: Partial<ToolContext>
  ): Promise<ToolExecutionResult> {
    const parsed = parseToolCall(toolCall)
    const tool = this.tools.get(parsed.name)

    if (!tool) {
      return createErrorResult(
        parsed.id,
        parsed.name,
        `Unknown tool "${parsed.name}". Available tools: ${this.getToolNames().join(', ')}`
      )
    }

    const context: ToolContext = {
      cwd: contextOverrides?.cwd || this.config.defaultCwd || process.cwd(),
      abortSignal: contextOverrides?.abortSignal,
      env: { ...this.config.env, ...contextOverrides?.env },
    }

    try {
      // 创建超时 Promise
      const timeoutMs = this.config.defaultTimeout || 30000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool execution timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      // 执行工具（带超时）
      const result = await Promise.race([
        tool.call(parsed.arguments, context),
        timeoutPromise,
      ])

      return createSuccessResult(parsed.id, parsed.name, result)
    } catch (error) {
      return createErrorResult(parsed.id, parsed.name, error)
    }
  }

  /**
   * 批量执行工具调用
   */
  async executeTools(
    toolCalls: ToolCall[],
    contextOverrides?: Partial<ToolContext>
  ): Promise<ToolExecutionResult[]> {
    // 顺序执行，避免并发问题
    const results: ToolExecutionResult[] = []
    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall, contextOverrides)
      results.push(result)
    }
    return results
  }

  /**
   * 将执行结果转换为 AI 模型的 tool 消息
   */
  resultToMessage(result: ToolExecutionResult): UniversalMessage {
    return toolResultToMessage(result)
  }

  /**
   * 批量将执行结果转换为 AI 模型的 tool 消息
   */
  resultsToMessages(results: ToolExecutionResult[]): UniversalMessage[] {
    return results.map(this.resultToMessage)
  }

  /**
   * 执行工具并直接返回消息格式
   */
  async executeAndConvert(
    toolCall: ToolCall,
    contextOverrides?: Partial<ToolContext>
  ): Promise<UniversalMessage> {
    const result = await this.executeTool(toolCall, contextOverrides)
    return this.resultToMessage(result)
  }

  /**
   * 批量执行并直接返回消息格式
   */
  async executeAllAndConvert(
    toolCalls: ToolCall[],
    contextOverrides?: Partial<ToolContext>
  ): Promise<UniversalMessage[]> {
    const results = await this.executeTools(toolCalls, contextOverrides)
    return this.resultsToMessages(results)
  }

  /**
   * 清空所有已注册的工具
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ToolExecutorConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * 创建工具执行器实例
 */
export function createToolExecutor(config?: ToolExecutorConfig): ToolExecutor {
  return new ToolExecutor(config)
}
