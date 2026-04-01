// ========== 消息类型（基于 OpenAI 格式，Qwen 原生兼容）==========

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ToolCallFunction {
  name: string
  arguments: string  // JSON string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: ToolCallFunction
}

export interface UniversalMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ContentPart[] | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

// ========== 工具定义 ==========

export interface ToolParameter {
  type: string
  description?: string
  enum?: string[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  required?: string[]
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolParameter & { type: 'object' }
  }
}

// ========== 请求参数 ==========

export interface ChatParams {
  model: string
  messages: UniversalMessage[]
  tools?: ToolDefinition[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stop?: string[]
}

// ========== 流式事件 ==========

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; toolCall: ToolCall }
  | { type: 'tool_call_delta'; index: number; argumentsDelta: string }
  | { type: 'tool_call_end'; index: number }
  | { type: 'message_end'; usage?: TokenUsage }
  | { type: 'error'; error: string }

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// ========== 模型信息 ==========

export interface ModelInfo {
  id: string
  name: string
  provider: string
  maxTokens: number
  supportsTools: boolean
  supportsVision: boolean
  description?: string
}

// ========== Provider 接口 ==========

export interface AIProvider {
  readonly name: string
  
  /** 发送消息，返回流式事件 */
  sendMessage(params: ChatParams): AsyncIterable<StreamEvent>
  
  /** 列出此 Provider 支持的模型 */
  listModels(): ModelInfo[]
  
  /** 检查 Provider 是否已配置（API Key 等） */
  isConfigured(): boolean
}

// ========== 配置类型 ==========

export interface ProviderConfig {
  apiKey: string
  baseURL?: string
  defaultModel?: string
  enabled?: boolean
}

export interface AIConfig {
  providers: Record<string, ProviderConfig>
  defaultProvider: string
  defaultModel: string
}
