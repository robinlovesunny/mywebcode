/**
 * Tool Adapter - 工具格式转换适配层
 * 
 * 负责在 OpenAI function calling 格式和内部工具格式之间进行转换：
 * - 工具定义转换：内部格式 → OpenAI function calling 格式
 * - 工具调用转换：AI 模型返回 → 内部执行格式
 * - 工具结果转换：执行结果 → AI 模型消息格式
 */

import type {
  ToolDefinition,
  ToolCall,
  ToolParameter,
  UniversalMessage,
} from './types'

// ========== 内部工具格式类型 ==========

/**
 * Anthropic 风格的工具定义（原有格式）
 */
export interface AnthropicToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties?: Record<string, JSONSchemaProperty>
    required?: string[]
  }
}

/**
 * JSON Schema 属性定义
 */
export interface JSONSchemaProperty {
  type?: string
  description?: string
  enum?: string[]
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  default?: unknown
  [key: string]: unknown
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  toolCallId: string
  toolName: string
  result: string
  isError: boolean
}

// ========== 格式转换函数 ==========

/**
 * A. 工具定义转换：Anthropic 格式 → OpenAI function calling 格式
 * 
 * Anthropic 格式：
 * {
 *   name: string,
 *   description: string,
 *   input_schema: { type: 'object', properties: {...}, required: [...] }
 * }
 * 
 * OpenAI 格式：
 * {
 *   type: 'function',
 *   function: {
 *     name: string,
 *     description: string,
 *     parameters: { type: 'object', properties: {...}, required: [...] }
 *   }
 * }
 */
export function convertAnthropicToOpenAI(
  anthropicTool: AnthropicToolDefinition
): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: anthropicTool.name,
      description: anthropicTool.description,
      parameters: convertSchemaToParameters(anthropicTool.input_schema),
    },
  }
}

/**
 * 将 JSON Schema 转换为 OpenAI 的 parameters 格式
 */
function convertSchemaToParameters(
  schema: AnthropicToolDefinition['input_schema']
): ToolParameter & { type: 'object' } {
  const parameters: ToolParameter & { type: 'object' } = {
    type: 'object',
    properties: {},
    required: schema.required,
  }

  if (schema.properties) {
    parameters.properties = {}
    for (const [key, prop] of Object.entries(schema.properties)) {
      parameters.properties[key] = convertProperty(prop)
    }
  }

  return parameters
}

/**
 * 转换单个属性定义
 */
function convertProperty(prop: JSONSchemaProperty): ToolParameter {
  const result: ToolParameter = {
    type: prop.type || 'string',
  }

  if (prop.description) {
    result.description = prop.description
  }

  if (prop.enum) {
    result.enum = prop.enum
  }

  // 处理数组类型
  if (prop.type === 'array' && prop.items) {
    result.items = convertProperty(prop.items)
  }

  // 处理对象类型
  if (prop.type === 'object' && prop.properties) {
    result.properties = {}
    for (const [key, subProp] of Object.entries(prop.properties)) {
      result.properties[key] = convertProperty(subProp)
    }
    if (prop.required) {
      result.required = prop.required
    }
  }

  return result
}

/**
 * 批量转换工具定义
 */
export function convertToolsToOpenAIFormat(
  anthropicTools: AnthropicToolDefinition[]
): ToolDefinition[] {
  return anthropicTools.map(convertAnthropicToOpenAI)
}

/**
 * B. 工具调用转换：AI 模型返回 → 内部执行格式
 * 
 * 解析 ToolCall 中的参数，返回可用于执行的格式
 */
export interface ParsedToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export function parseToolCall(toolCall: ToolCall): ParsedToolCall {
  let args: Record<string, unknown> = {}
  
  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch (error) {
    // 如果解析失败，返回空对象
    console.error(`Failed to parse tool call arguments: ${error}`)
  }

  return {
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: args,
  }
}

/**
 * 批量解析工具调用
 */
export function parseToolCalls(toolCalls: ToolCall[]): ParsedToolCall[] {
  return toolCalls.map(parseToolCall)
}

/**
 * C. 工具结果转换：执行结果 → AI 模型的 tool 消息格式
 */
export function toolResultToMessage(
  result: ToolExecutionResult
): UniversalMessage {
  return {
    role: 'tool',
    content: result.result,
    tool_call_id: result.toolCallId,
    name: result.toolName,
  }
}

/**
 * 批量转换工具结果
 */
export function toolResultsToMessages(
  results: ToolExecutionResult[]
): UniversalMessage[] {
  return results.map(toolResultToMessage)
}

// ========== 辅助函数 ==========

/**
 * 创建错误结果
 */
export function createErrorResult(
  toolCallId: string,
  toolName: string,
  error: unknown
): ToolExecutionResult {
  const errorMessage = error instanceof Error ? error.message : String(error)
  return {
    toolCallId,
    toolName,
    result: `Error: ${errorMessage}`,
    isError: true,
  }
}

/**
 * 创建成功结果
 */
export function createSuccessResult(
  toolCallId: string,
  toolName: string,
  result: unknown
): ToolExecutionResult {
  const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return {
    toolCallId,
    toolName,
    result: resultStr,
    isError: false,
  }
}

/**
 * 验证工具定义格式
 */
export function validateToolDefinition(tool: ToolDefinition): boolean {
  if (tool.type !== 'function') return false
  if (!tool.function) return false
  if (!tool.function.name || typeof tool.function.name !== 'string') return false
  if (!tool.function.description || typeof tool.function.description !== 'string') return false
  if (!tool.function.parameters || tool.function.parameters.type !== 'object') return false
  return true
}

/**
 * 验证工具调用格式
 */
export function validateToolCall(toolCall: ToolCall): boolean {
  if (!toolCall.id || typeof toolCall.id !== 'string') return false
  if (toolCall.type !== 'function') return false
  if (!toolCall.function) return false
  if (!toolCall.function.name || typeof toolCall.function.name !== 'string') return false
  if (typeof toolCall.function.arguments !== 'string') return false
  return true
}
