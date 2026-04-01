/**
 * FileEdit Tool - 文件编辑工具
 * 
 * 基于字符串查找替换的文件编辑
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

export const FileEditTool: SimpleTool = {
  name: 'file_edit',
  description: `Edit a file by performing string replacements.

Parameters:
- file_path (required): The absolute path to the file to edit
- old_text (required): The exact text to find and replace (must be unique in the file)
- new_text (required): The text to replace old_text with

IMPORTANT:
- The old_text must be an EXACT match including whitespace and indentation
- The old_text must be UNIQUE within the file (appears exactly once)
- For multiple replacements, call this tool multiple times

Use this for targeted edits. For complete file rewrites, use file_write instead.`,

  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to edit',
      },
      old_text: {
        type: 'string',
        description: 'The exact text to find and replace (must be unique in the file)',
      },
      new_text: {
        type: 'string',
        description: 'The text to replace old_text with',
      },
    },
    required: ['file_path', 'old_text', 'new_text'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const filePath = input.file_path as string
    const oldText = input.old_text as string
    const newText = input.new_text as string

    if (!filePath) {
      return 'Error: file_path is required'
    }

    if (!oldText) {
      return 'Error: old_text is required'
    }

    if (newText === undefined || newText === null) {
      return 'Error: new_text is required'
    }

    if (oldText === newText) {
      return 'Error: old_text and new_text are identical, no changes needed'
    }

    // 解析路径
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(context?.cwd || process.cwd(), filePath)

    try {
      // 读取文件内容
      const content = await fs.readFile(resolvedPath, 'utf-8')

      // 检查 old_text 出现次数
      const occurrences = countOccurrences(content, oldText)

      if (occurrences === 0) {
        // 尝试提供有用的错误信息
        const trimmedOldText = oldText.trim()
        if (trimmedOldText !== oldText && content.includes(trimmedOldText)) {
          return `Error: old_text not found in file. However, the trimmed version was found. Make sure whitespace and indentation match exactly.`
        }
        return `Error: old_text not found in file: ${filePath}\nMake sure the text matches exactly, including whitespace and indentation.`
      }

      if (occurrences > 1) {
        return `Error: old_text appears ${occurrences} times in the file. It must be unique (appear exactly once). Add more context to make it unique.`
      }

      // 执行替换
      const newContent = content.replace(oldText, newText)

      // 写入文件
      await fs.writeFile(resolvedPath, newContent, 'utf-8')

      // 计算变更统计
      const oldLines = oldText.split('\n').length
      const newLines = newText.split('\n').length
      const lineDiff = newLines - oldLines

      let message = `Successfully edited file: ${filePath}\n`
      message += `Replaced ${oldLines} line(s) with ${newLines} line(s)`
      if (lineDiff !== 0) {
        message += ` (${lineDiff > 0 ? '+' : ''}${lineDiff} lines)`
      }

      return message
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: File not found: ${resolvedPath}`
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return `Error: Permission denied: ${resolvedPath}`
      }
      return `Error editing file: ${error instanceof Error ? error.message : String(error)}`
    }
  },
}

/**
 * 计算字符串出现次数
 */
function countOccurrences(text: string, search: string): number {
  if (!search) return 0
  let count = 0
  let pos = 0
  while ((pos = text.indexOf(search, pos)) !== -1) {
    count++
    pos += search.length
  }
  return count
}
