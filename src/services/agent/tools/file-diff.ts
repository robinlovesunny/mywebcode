/**
 * FileDiff Tool - 文件对比工具
 * 
 * 对比两个文件的差异
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import type { SimpleTool, ToolContext } from './types'

const execAsync = promisify(execCallback)

// diff 命令超时（10秒）
const DIFF_TIMEOUT_MS = 10000

// 最大输出大小（100KB）
const MAX_OUTPUT_SIZE = 100 * 1024

/**
 * 截断输出
 */
function truncateOutput(output: string, maxSize: number = MAX_OUTPUT_SIZE): string {
  if (output.length <= maxSize) {
    return output
  }
  
  const truncated = output.slice(0, maxSize)
  const remaining = output.length - maxSize
  
  return `${truncated}\n\n... [Output truncated. ${remaining} more characters not shown]`
}

export const FileDiffTool: SimpleTool = {
  name: 'file_diff',
  description: `Compare two files and show their differences.

Parameters:
- file_a (required): Path to the first file
- file_b (required): Path to the second file

Returns a unified diff showing the differences between the two files.
If the files are identical, returns "Files are identical".`,

  parameters: {
    type: 'object',
    properties: {
      file_a: {
        type: 'string',
        description: 'Path to the first file',
      },
      file_b: {
        type: 'string',
        description: 'Path to the second file',
      },
    },
    required: ['file_a', 'file_b'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const fileA = input.file_a as string
    const fileB = input.file_b as string

    if (!fileA) {
      return 'Error: file_a is required'
    }

    if (!fileB) {
      return 'Error: file_b is required'
    }

    // 解析路径
    const cwd = context?.cwd || process.cwd()
    const resolvedPathA = path.isAbsolute(fileA) ? fileA : path.resolve(cwd, fileA)
    const resolvedPathB = path.isAbsolute(fileB) ? fileB : path.resolve(cwd, fileB)

    // 检查文件是否存在
    try {
      const statsA = await fs.stat(resolvedPathA)
      if (!statsA.isFile()) {
        return `Error: "${resolvedPathA}" is not a file`
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: File not found: ${resolvedPathA}`
      }
      return `Error accessing file "${resolvedPathA}": ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      const statsB = await fs.stat(resolvedPathB)
      if (!statsB.isFile()) {
        return `Error: "${resolvedPathB}" is not a file`
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: File not found: ${resolvedPathB}`
      }
      return `Error accessing file "${resolvedPathB}": ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // 使用 diff 命令生成 unified diff
      // 注意：diff 返回 0 表示相同，1 表示不同，2 表示错误
      const { stdout, stderr } = await execAsync(
        `diff -u "${resolvedPathA}" "${resolvedPathB}"`,
        {
          timeout: DIFF_TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_SIZE * 2,
          cwd,
        }
      )

      // 如果 stdout 为空，文件相同
      if (!stdout.trim()) {
        return `Files are identical:\n- ${resolvedPathA}\n- ${resolvedPathB}`
      }

      // 格式化输出
      let result = `Diff between:\n- ${resolvedPathA}\n- ${resolvedPathB}\n`
      result += '---\n'
      result += truncateOutput(stdout)

      return result
    } catch (error: unknown) {
      const execError = error as {
        code?: number | string
        stdout?: string
        stderr?: string
        message?: string
        killed?: boolean
        signal?: string
      }

      // diff 返回退出码 1 表示文件不同，这不是错误
      if (execError.code === 1 && execError.stdout) {
        let result = `Diff between:\n- ${resolvedPathA}\n- ${resolvedPathB}\n`
        result += '---\n'
        result += truncateOutput(execError.stdout)
        return result
      }

      // 超时处理
      if (execError.killed || execError.signal === 'SIGTERM') {
        return `Error: Diff command timed out after ${DIFF_TIMEOUT_MS / 1000} seconds`
      }

      // 其他错误
      if (execError.stderr) {
        return `Error running diff: ${execError.stderr}`
      }

      return `Error comparing files: ${execError.message || String(error)}`
    }
  },
}
