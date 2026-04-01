/**
 * FileRead Tool - 文件读取工具
 * 
 * 读取指定路径的文件内容，支持指定行范围
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

/**
 * 添加行号到内容
 */
function addLineNumbers(content: string, startLine: number): string {
  const lines = content.split('\n')
  return lines
    .map((line, index) => {
      const lineNum = (startLine + index).toString().padStart(6, ' ')
      return `${lineNum}→${line}`
    })
    .join('\n')
}

/**
 * 读取文件的指定行范围
 */
async function readFileRange(
  filePath: string,
  startLine?: number,
  endLine?: number
): Promise<{ content: string; totalLines: number; readLines: number; actualStart: number }> {
  const fileContent = await fs.readFile(filePath, 'utf-8')
  const lines = fileContent.split('\n')
  const totalLines = lines.length

  // 默认从第 1 行开始
  const start = Math.max(1, startLine || 1)
  // 默认读取到最后一行
  const end = endLine ? Math.min(endLine, totalLines) : totalLines

  // 提取指定范围的行（1-indexed）
  const selectedLines = lines.slice(start - 1, end)
  const readLines = selectedLines.length

  return {
    content: selectedLines.join('\n'),
    totalLines,
    readLines,
    actualStart: start,
  }
}

export const FileReadTool: SimpleTool = {
  name: 'file_read',
  description: `Read the contents of a file from the local filesystem.

Parameters:
- file_path (required): The absolute path to the file to read
- start_line (optional): The line number to start reading from (1-indexed)
- end_line (optional): The line number to stop reading at (inclusive, 1-indexed)

Returns the file content with line numbers prefixed to each line.
For binary files or very large files, appropriate error messages will be returned.`,

  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to read',
      },
      start_line: {
        type: 'integer',
        description: 'The line number to start reading from (1-indexed). Optional.',
      },
      end_line: {
        type: 'integer',
        description: 'The line number to stop reading at (inclusive, 1-indexed). Optional.',
      },
    },
    required: ['file_path'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const filePath = input.file_path as string
    const startLine = input.start_line as number | undefined
    const endLine = input.end_line as number | undefined

    if (!filePath) {
      return 'Error: file_path is required'
    }

    // 解析路径
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context?.cwd || process.cwd(), filePath)

    try {
      // 检查文件是否存在
      const stats = await fs.stat(resolvedPath)
      
      if (!stats.isFile()) {
        return `Error: "${resolvedPath}" is not a file`
      }

      // 检查文件大小（限制为 10MB）
      const maxSize = 10 * 1024 * 1024
      if (stats.size > maxSize) {
        return `Error: File is too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB. Use start_line and end_line to read specific portions.`
      }

      // 读取文件
      const { content, totalLines, readLines, actualStart } = await readFileRange(
        resolvedPath,
        startLine,
        endLine
      )

      // 添加行号
      const numberedContent = addLineNumbers(content, actualStart)

      // 构建输出
      let result = ''
      if (startLine || endLine) {
        result += `File: ${filePath}\n`
        result += `Lines ${actualStart}-${actualStart + readLines - 1} of ${totalLines}\n`
        result += '---\n'
      } else {
        result += `File: ${filePath} (${totalLines} lines)\n`
        result += '---\n'
      }
      result += numberedContent

      return result
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: File not found: ${resolvedPath}`
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return `Error: Permission denied: ${resolvedPath}`
      }
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`
    }
  },
}
