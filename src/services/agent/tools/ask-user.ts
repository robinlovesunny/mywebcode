/**
 * AskUserQuestion Tool - 用户交互工具
 * 
 * 在 Web UI 中向用户提问并等待回答
 */

import type { SimpleTool, ToolContext } from './types'

/**
 * 格式化选项列表
 */
function formatOptions(options: string[]): string {
  if (options.length === 0) {
    return ''
  }
  
  return options
    .map((option, index) => `${index + 1}. ${option}`)
    .join('\n')
}

export const AskUserQuestionTool: SimpleTool = {
  name: 'ask_user',
  description: `Ask the user a question and wait for their response.

Parameters:
- question (required): The question to ask the user
- options (optional): An array of options for the user to choose from

This tool is used when you need additional information or clarification from the user.
The response will indicate that user input is needed, and the conversation will wait for the user's reply.

Example usage:
- Asking for confirmation before making changes
- Requesting clarification on ambiguous requirements
- Offering multiple options for the user to choose from`,

  parameters: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask the user',
      },
      options: {
        type: 'array',
        description: 'Optional list of choices for the user to select from',
        items: {
          type: 'string',
        },
      },
    },
    required: ['question'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const question = input.question as string
    const options = (input.options as string[]) || []

    if (!question) {
      return 'Error: question is required'
    }

    if (question.length > 2000) {
      return 'Error: Question is too long (maximum 2000 characters)'
    }

    // 构建等待用户输入的响应
    let result = '[等待用户回答]\n\n'
    result += `问题: ${question}\n`
    
    if (options.length > 0) {
      result += '\n选项:\n'
      result += formatOptions(options)
      result += '\n'
    }
    
    result += '\n请用户在对话中回复...'

    return result
  },
}
