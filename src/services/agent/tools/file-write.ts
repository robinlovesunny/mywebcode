/**
 * FileWrite Tool - 文件写入工具
 * 
 * 创建或覆盖文件内容
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

export const FileWriteTool: SimpleTool = {
  name: 'file_write',
  description: `Create a new file or completely overwrite an existing file with new content.

Parameters:
- file_path (required): The absolute path to the file to write
- content (required): The content to write to the file

IMPORTANT: This will completely replace the file contents. Use file_edit for partial modifications.
Parent directories will be created automatically if they don't exist.`,

  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['file_path', 'content'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const filePath = input.file_path as string
    const content = input.content as string

    if (!filePath) {
      return 'Error: file_path is required'
    }

    if (content === undefined || content === null) {
      return 'Error: content is required'
    }

    // 解析路径
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context?.cwd || process.cwd(), filePath)

    try {
      // 检查文件是否已存在
      let fileExists = false
      try {
        await fs.access(resolvedPath)
        fileExists = true
      } catch {
        fileExists = false
      }

      // 确保父目录存在
      const parentDir = path.dirname(resolvedPath)
      await fs.mkdir(parentDir, { recursive: true })

      // 写入文件
      await fs.writeFile(resolvedPath, content, 'utf-8')

      // 计算行数
      const lineCount = content.split('\n').length

      if (fileExists) {
        return `Successfully overwrote file: ${filePath}\nLines written: ${lineCount}`
      } else {
        return `Successfully created file: ${filePath}\nLines written: ${lineCount}`
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return `Error: Permission denied: ${resolvedPath}`
      }
      if ((error as NodeJS.ErrnoException).code === 'EISDIR') {
        return `Error: Cannot write to a directory: ${resolvedPath}`
      }
      return `Error writing file: ${error instanceof Error ? error.message : String(error)}`
    }
  },
}
