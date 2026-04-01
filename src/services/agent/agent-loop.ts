/**
 * Agent Loop - 核心 Agent 循环
 * 
 * 实现完整的对话+工具调用循环：
 * 1. 发送用户消息和历史上下文给 AI 模型
 * 2. 接收流式响应（文本 + 工具调用）
 * 3. 如果有工具调用，执行工具并将结果加入上下文
 * 4. 带着工具结果继续对话（回到步骤 1）
 * 5. 直到 AI 不再调用工具（纯文本回复），结束循环
 */

import type {
  ChatParams,
  StreamEvent,
  UniversalMessage,
  ToolCall,
  ToolDefinition,
  TokenUsage,
} from '../ai-provider/types'
import { getProviderForModel } from '../ai-provider/registry'
import { ToolExecutor } from './tool-executor'
import { createDefaultTools } from './tools'

// ========== Agent 事件类型（给前端消费）==========

export type AgentEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; toolCall: ToolCall }
  | { type: 'tool_call_delta'; index: number; argumentsDelta: string }
  | { type: 'tool_call_end'; index: number; toolCall: ToolCall }
  | { type: 'tool_result'; toolCallId: string; toolName: string; result: string; isError: boolean }
  | { type: 'message_end'; usage?: TokenUsage }
  | { type: 'error'; error: string }
  | { type: 'status'; status: string }
  | { type: 'round_start'; round: number }

// ========== Agent 循环配置 ==========

export interface AgentLoopConfig {
  /** 使用的模型 ID */
  model: string
  /** 系统提示词 */
  systemPrompt?: string
  /** 温度参数 */
  temperature?: number
  /** 最大输出 token */
  maxTokens?: number
  /** 最大工具调用轮次，防止无限循环，默认 10 */
  maxToolRounds?: number
  /** 是否启用工具，默认 true */
  enableTools?: boolean
  /** 工作目录（用于工具执行） */
  cwd?: string
}

// ========== 默认系统提示词 ==========

const DEFAULT_SYSTEM_PROMPT = `你是一个强大的 AI 助手，可以帮助用户完成各种任务。你可以：
- 读取、创建和编辑文件
- 执行 Shell 命令
- 搜索文件和代码内容
- 回答问题和提供建议

请用中文回复用户。当需要执行操作时，使用提供的工具来完成任务。`

// ========== 核心 Agent 循环 ==========

/**
 * 运行 Agent 循环
 * 
 * 核心流程：
 * 1. 发送用户消息和历史上下文给 AI 模型
 * 2. 接收流式响应（文本 + 工具调用）
 * 3. 如果有工具调用，执行工具并将结果加入上下文
 * 4. 带着工具结果继续对话（回到步骤 1）
 * 5. 直到 AI 不再调用工具（纯文本回复），结束循环
 * 
 * @param messages 消息历史（包含用户最新消息）
 * @param config Agent 配置
 * @returns 异步迭代器，产生 AgentEvent 事件流
 */
export async function* runAgentLoop(
  messages: UniversalMessage[],
  config: AgentLoopConfig,
): AsyncIterable<AgentEvent> {
  // 获取 Provider
  const provider = getProviderForModel(config.model)
  
  // 初始化工具执行器
  const toolExecutor = new ToolExecutor({
    defaultCwd: config.cwd,
  })
  const defaultTools = createDefaultTools()
  toolExecutor.registerTools(defaultTools)

  // 获取工具定义（如果启用工具）
  const toolDefinitions: ToolDefinition[] | undefined = 
    config.enableTools !== false ? toolExecutor.getToolDefinitions() : undefined

  const maxRounds = config.maxToolRounds || 10
  let currentMessages = [...messages]
  let round = 0

  // Agent 主循环
  while (round < maxRounds) {
    round++
    yield { type: 'round_start', round }

    // 构建请求参数
    const chatParams: ChatParams = {
      model: config.model,
      messages: currentMessages,
      tools: toolDefinitions,
      systemPrompt: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    }

    // 收集本轮的 AI 回复内容
    let assistantText = ''
    const assistantToolCalls: ToolCall[] = []
    const toolCallArgBuffers: Map<number, string> = new Map()
    let hasError = false
    let usage: TokenUsage | undefined

    // 流式发送请求
    try {
      for await (const event of provider.sendMessage(chatParams)) {
        switch (event.type) {
          case 'text_delta':
            assistantText += event.text
            yield { type: 'text_delta', text: event.text }
            break

          case 'tool_call_start':
            assistantToolCalls.push(event.toolCall)
            toolCallArgBuffers.set(
              assistantToolCalls.length - 1,
              event.toolCall.function.arguments
            )
            yield { type: 'tool_call_start', toolCall: event.toolCall }
            break

          case 'tool_call_delta':
            const buf = toolCallArgBuffers.get(event.index) || ''
            toolCallArgBuffers.set(event.index, buf + event.argumentsDelta)
            yield { 
              type: 'tool_call_delta', 
              index: event.index, 
              argumentsDelta: event.argumentsDelta 
            }
            break

          case 'tool_call_end':
            // 更新完整的 arguments
            if (assistantToolCalls[event.index]) {
              const fullArgs = toolCallArgBuffers.get(event.index) || ''
              assistantToolCalls[event.index].function.arguments = fullArgs
            }
            yield { 
              type: 'tool_call_end', 
              index: event.index, 
              toolCall: assistantToolCalls[event.index] 
            }
            break

          case 'message_end':
            usage = event.usage
            yield { type: 'message_end', usage: event.usage }
            break

          case 'error':
            yield { type: 'error', error: event.error }
            hasError = true
            break
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      yield { type: 'error', error: errorMsg }
      return
    }

    // 如果发生错误，退出循环
    if (hasError) return

    // 将 AI 回复添加到消息历史
    const assistantMessage: UniversalMessage = {
      role: 'assistant',
      content: assistantText || null,
    }
    if (assistantToolCalls.length > 0) {
      assistantMessage.tool_calls = assistantToolCalls
    }
    currentMessages.push(assistantMessage)

    // 如果没有工具调用，循环结束
    if (assistantToolCalls.length === 0) {
      break
    }

    // 执行所有工具调用
    yield { type: 'status', status: '正在执行工具...' }
    
    for (const toolCall of assistantToolCalls) {
      const result = await toolExecutor.executeTool(toolCall)
      
      // 推送工具结果事件
      yield {
        type: 'tool_result',
        toolCallId: result.toolCallId,
        toolName: result.toolName,
        result: result.result,
        isError: result.isError,
      }

      // 将工具结果添加到消息历史
      currentMessages.push(toolExecutor.resultToMessage(result))
    }

    // 继续循环，让 AI 处理工具结果
  }

  // 检查是否达到最大轮次
  if (round >= maxRounds) {
    yield { 
      type: 'error', 
      error: `已达到最大工具调用轮次 (${maxRounds})，循环终止` 
    }
  }
}

// ========== 辅助函数 ==========

/**
 * 获取可用工具列表（用于前端展示）
 * @returns 工具名称和描述数组
 */
export function getAvailableTools(): { name: string; description: string }[] {
  const tools = createDefaultTools()
  return tools.map(t => ({ 
    name: t.name, 
    description: t.description.split('\n')[0]  // 只取第一行作为简短描述
  }))
}

/**
 * 获取默认系统提示词
 */
export function getDefaultSystemPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT
}

/**
 * 运行单轮对话（不执行工具，仅获取 AI 回复）
 * 
 * 用于简单场景，不需要工具调用时使用
 * 
 * @param messages 消息历史
 * @param config Agent 配置
 * @returns 异步迭代器，产生 AgentEvent 事件流
 */
export async function* runSingleTurn(
  messages: UniversalMessage[],
  config: Omit<AgentLoopConfig, 'enableTools' | 'maxToolRounds'>
): AsyncIterable<AgentEvent> {
  yield* runAgentLoop(messages, {
    ...config,
    enableTools: false,
    maxToolRounds: 1,
  })
}

/**
 * 聚合 Agent 事件流，收集完整回复
 * 
 * 用于需要一次性获取完整回复的场景
 * 
 * @param events Agent 事件流
 * @returns 聚合后的结果
 */
export async function aggregateAgentEvents(
  events: AsyncIterable<AgentEvent>
): Promise<{
  text: string
  toolCalls: ToolCall[]
  toolResults: Array<{ toolCallId: string; toolName: string; result: string; isError: boolean }>
  usage?: TokenUsage
  error?: string
}> {
  let text = ''
  const toolCalls: ToolCall[] = []
  const toolResults: Array<{ toolCallId: string; toolName: string; result: string; isError: boolean }> = []
  let usage: TokenUsage | undefined
  let error: string | undefined

  for await (const event of events) {
    switch (event.type) {
      case 'text_delta':
        text += event.text
        break
      case 'tool_call_end':
        toolCalls.push(event.toolCall)
        break
      case 'tool_result':
        toolResults.push({
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          result: event.result,
          isError: event.isError,
        })
        break
      case 'message_end':
        usage = event.usage
        break
      case 'error':
        error = event.error
        break
    }
  }

  return { text, toolCalls, toolResults, usage, error }
}

// ========== 类型导出 ==========

export type { TokenUsage } from '../ai-provider/types'
