import OpenAI from 'openai'
import type {
  AIProvider,
  ChatParams,
  StreamEvent,
  ModelInfo,
  ProviderConfig,
  UniversalMessage,
} from './types'

const QWEN_MODELS: ModelInfo[] = [
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    provider: 'qwen',
    maxTokens: 8192,
    supportsTools: true,
    supportsVision: false,
    description: '通义千问超大规模语言模型，速度快，成本低',
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    provider: 'qwen',
    maxTokens: 32768,
    supportsTools: true,
    supportsVision: false,
    description: '通义千问增强版，平衡效果与成本',
  },
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    provider: 'qwen',
    maxTokens: 32768,
    supportsTools: true,
    supportsVision: true,
    description: '通义千问最强模型，效果最优',
  },
  {
    id: 'qwen-long',
    name: 'Qwen Long',
    provider: 'qwen',
    maxTokens: 1000000,
    supportsTools: true,
    supportsVision: false,
    description: '通义千问长文本模型，支持超长上下文',
  },
]

export class QwenProvider implements AIProvider {
  readonly name = 'qwen'
  private client: OpenAI
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey !== '' && this.config.apiKey !== 'your-qwen-api-key-here'
  }

  listModels(): ModelInfo[] {
    return QWEN_MODELS
  }

  async *sendMessage(params: ChatParams): AsyncIterable<StreamEvent> {
    const messages: OpenAI.ChatCompletionMessageParam[] = []

    // 添加系统消息
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt })
    }

    // 转换消息格式
    for (const msg of params.messages) {
      messages.push(this.toOpenAIMessage(msg))
    }

    try {
      const requestParams: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: params.model,
        messages,
        stream: true,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        stop: params.stop,
      }

      // 只在有工具定义时添加 tools
      if (params.tools && params.tools.length > 0) {
        requestParams.tools = params.tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters as unknown as Record<string, unknown>,
          },
        }))
      }

      const stream = await this.client.chat.completions.create(requestParams)

      // 追踪当前的 tool calls
      const activeToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()

      for await (const chunk of stream) {
        const choice = chunk.choices[0]
        if (!choice) continue

        const delta = choice.delta

        // 处理文本内容
        if (delta.content) {
          yield { type: 'text_delta', text: delta.content }
        }

        // 处理工具调用
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index

            if (tc.id) {
              // 新工具调用开始
              activeToolCalls.set(index, {
                id: tc.id,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              })
              
              if (tc.function?.name) {
                yield {
                  type: 'tool_call_start',
                  toolCall: {
                    id: tc.id,
                    type: 'function',
                    function: {
                      name: tc.function.name,
                      arguments: tc.function.arguments || '',
                    },
                  },
                }
              }
            } else if (tc.function?.arguments) {
              // 工具调用参数增量
              const existing = activeToolCalls.get(index)
              if (existing) {
                existing.arguments += tc.function.arguments
              }
              yield {
                type: 'tool_call_delta',
                index,
                argumentsDelta: tc.function.arguments,
              }
            }
          }
        }

        // 处理结束
        if (choice.finish_reason) {
          // 结束所有活跃的工具调用
          for (const [index] of activeToolCalls) {
            yield { type: 'tool_call_end', index }
          }
          activeToolCalls.clear()

          // 使用信息
          const usage = chunk.usage
          yield {
            type: 'message_end',
            usage: usage
              ? {
                  promptTokens: usage.prompt_tokens,
                  completionTokens: usage.completion_tokens,
                  totalTokens: usage.total_tokens,
                }
              : undefined,
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      yield { type: 'error', error: errorMessage }
    }
  }

  private toOpenAIMessage(msg: UniversalMessage): OpenAI.ChatCompletionMessageParam {
    switch (msg.role) {
      case 'system':
        return { role: 'system', content: msg.content as string }
      case 'user':
        return { role: 'user', content: msg.content as string | OpenAI.ChatCompletionContentPart[] }
      case 'assistant':
        const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: msg.content as string | null,
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          assistantMsg.tool_calls = msg.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }))
        }
        return assistantMsg
      case 'tool':
        return {
          role: 'tool',
          content: msg.content as string,
          tool_call_id: msg.tool_call_id!,
        }
      default:
        return { role: 'user', content: msg.content as string }
    }
  }
}
