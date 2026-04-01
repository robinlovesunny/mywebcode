/**
 * Bash Tool - Shell 命令执行工具
 * 
 * 执行 bash 命令并返回结果
 */

import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

const execAsync = promisify(execCallback)

// 默认超时时间（30秒）
const DEFAULT_TIMEOUT_MS = 30000

// 最大超时时间（5分钟）
const MAX_TIMEOUT_MS = 300000

// 输出截断限制（100KB）
const MAX_OUTPUT_SIZE = 100 * 1024

/**
 * 截断输出内容
 */
function truncateOutput(output: string, maxSize: number = MAX_OUTPUT_SIZE): string {
  if (output.length <= maxSize) {
    return output
  }
  
  const truncatedLength = maxSize
  const truncatedOutput = output.slice(0, truncatedLength)
  const remainingBytes = output.length - truncatedLength
  
  return `${truncatedOutput}\n\n... [Output truncated. ${remainingBytes} more bytes not shown]`
}

/**
 * 危险命令检测
 */
function isDangerousCommand(command: string): boolean {
  const dangerousPatterns = [
    /\brm\s+-rf?\s+[\/~]/i,           // rm -rf / or rm -rf ~
    /\brm\s+.*--no-preserve-root/i,    // rm with --no-preserve-root
    /\bmkfs\b/i,                       // mkfs (format filesystem)
    /\bdd\s+.*of=\/dev/i,              // dd writing to device
    />\s*\/dev\/[sh]d[a-z]/i,          // Redirect to disk device
    /\bchmod\s+-R\s+777\s+\//i,        // chmod -R 777 /
    /\bsudo\s+rm\b/i,                  // sudo rm (be extra careful)
    /:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;/i,  // Fork bomb
  ]
  
  return dangerousPatterns.some(pattern => pattern.test(command))
}

export const BashTool: SimpleTool = {
  name: 'bash',
  description: `Execute a bash command in the terminal.

Parameters:
- command (required): The bash command to execute
- timeout (optional): Timeout in milliseconds (default: 30000, max: 300000)

IMPORTANT:
- Commands are executed in the current working directory
- Output is limited to 100KB and will be truncated if exceeded
- Dangerous commands (rm -rf /, sudo rm, etc.) are blocked
- Long-running commands will be terminated after timeout

For file operations, prefer the dedicated file_read, file_write, file_edit tools.`,

  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      timeout: {
        type: 'integer',
        description: 'Timeout in milliseconds (default: 30000, max: 300000)',
      },
    },
    required: ['command'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const command = input.command as string
    const inputTimeout = input.timeout as number | undefined

    if (!command) {
      return 'Error: command is required'
    }

    // 危险命令检测
    if (isDangerousCommand(command)) {
      return 'Error: This command appears dangerous and has been blocked for safety. Dangerous operations like "rm -rf /" are not allowed.'
    }

    // 设置超时
    const timeout = Math.min(
      Math.max(inputTimeout || DEFAULT_TIMEOUT_MS, 1000),
      MAX_TIMEOUT_MS
    )

    // 设置工作目录
    const cwd = context?.cwd || process.cwd()

    // 设置环境变量
    const env = {
      ...process.env,
      ...context?.env,
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        env,
        timeout,
        maxBuffer: MAX_OUTPUT_SIZE * 2, // 给一些额外空间
        shell: '/bin/bash',
      })

      // 合并并截断输出
      let output = ''
      
      if (stdout) {
        output += stdout
      }
      
      if (stderr) {
        if (output) output += '\n'
        output += `[stderr]\n${stderr}`
      }
      
      if (!output.trim()) {
        output = '(Command completed with no output)'
      }

      return truncateOutput(output)
    } catch (error: unknown) {
      // 处理执行错误
      const execError = error as {
        code?: number | string
        signal?: string
        killed?: boolean
        stdout?: string
        stderr?: string
        message?: string
      }

      // 超时处理
      if (execError.killed || execError.signal === 'SIGTERM') {
        return `Error: Command timed out after ${timeout}ms and was terminated.`
      }

      // 命令执行失败但有输出
      let output = ''
      
      if (execError.stdout) {
        output += execError.stdout
      }
      
      if (execError.stderr) {
        if (output) output += '\n'
        output += `[stderr]\n${execError.stderr}`
      }
      
      // 添加退出码信息
      if (execError.code !== undefined) {
        if (output) output += '\n'
        output += `[Exit code: ${execError.code}]`
      }

      if (output) {
        return truncateOutput(output)
      }

      return `Error executing command: ${execError.message || String(error)}`
    }
  },
}
