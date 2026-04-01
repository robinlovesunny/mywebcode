/**
 * 精简版工具类型定义
 * 
 * 独立于原有 Tool.ts 的简化工具接口，专为 Web Agent 设计
 */

/**
 * 工具参数定义（JSON Schema 格式）
 */
export interface ToolParameters {
  type: 'object'
  properties: Record<string, PropertyDefinition>
  required?: string[]
}

/**
 * 属性定义
 */
export interface PropertyDefinition {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
  items?: PropertyDefinition
  properties?: Record<string, PropertyDefinition>
  required?: string[]
}

/**
 * 工具执行上下文
 */
export interface ToolContext {
  /** 当前工作目录 */
  cwd: string
  /** 中止信号 */
  abortSignal?: AbortSignal
  /** 环境变量 */
  env?: Record<string, string>
}

/**
 * 精简版工具接口
 */
export interface SimpleTool {
  /** 工具名称 */
  readonly name: string
  
  /** 工具描述 */
  readonly description: string
  
  /** 参数定义（JSON Schema 格式） */
  readonly parameters: ToolParameters
  
  /**
   * 执行工具
   * @param input 工具输入参数
   * @param context 执行上下文
   * @returns 执行结果（字符串）
   */
  call(input: Record<string, unknown>, context?: ToolContext): Promise<string>
}

/**
 * 工具构建器选项
 */
export interface ToolBuilderOptions {
  name: string
  description: string
  parameters: ToolParameters
  call: (input: Record<string, unknown>, context?: ToolContext) => Promise<string>
}

/**
 * 创建工具的辅助函数
 */
export function createTool(options: ToolBuilderOptions): SimpleTool {
  return {
    name: options.name,
    description: options.description,
    parameters: options.parameters,
    call: options.call,
  }
}

/**
 * 文本属性辅助函数
 */
export function stringParam(description: string, required = false): PropertyDefinition {
  return {
    type: 'string',
    description,
  }
}

/**
 * 数字属性辅助函数
 */
export function numberParam(description: string): PropertyDefinition {
  return {
    type: 'number',
    description,
  }
}

/**
 * 整数属性辅助函数
 */
export function integerParam(description: string): PropertyDefinition {
  return {
    type: 'integer',
    description,
  }
}

/**
 * 布尔属性辅助函数
 */
export function booleanParam(description: string): PropertyDefinition {
  return {
    type: 'boolean',
    description,
  }
}

/**
 * 数组属性辅助函数
 */
export function arrayParam(description: string, itemType: PropertyDefinition): PropertyDefinition {
  return {
    type: 'array',
    description,
    items: itemType,
  }
}

/**
 * 枚举属性辅助函数
 */
export function enumParam(description: string, values: string[]): PropertyDefinition {
  return {
    type: 'string',
    description,
    enum: values,
  }
}
