/**
 * Glob Tool - 文件搜索工具
 * 
 * 使用 glob 模式搜索文件（通过执行 find 命令实现）
 */

import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

const execAsync = promisify(execCallback)

// 最大结果数量
const MAX_RESULTS = 100

// 超时时间（10秒）
const TIMEOUT_MS = 10000

export const GlobTool: SimpleTool = {
  name: 'glob',
  description: `Search for files matching a glob pattern.

Parameters:
- pattern (required): The glob pattern to match (e.g., "*.ts", "**/*.json", "src/**/*.tsx")
- path (optional): The directory to search in (default: current working directory)

Returns a list of matching file paths, limited to ${MAX_RESULTS} results.

Common patterns:
- "*.ts" - All TypeScript files in current directory
- "**/*.ts" - All TypeScript files recursively
- "src/**/*.{ts,tsx}" - TypeScript files in src directory
- "**/test*.ts" - Files starting with "test" ending in .ts`,

  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The glob pattern to match (e.g., "*.ts", "**/*.json")',
      },
      path: {
        type: 'string',
        description: 'The directory to search in (default: current working directory)',
      },
    },
    required: ['pattern'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const pattern = input.pattern as string
    const searchPath = input.path as string | undefined

    if (!pattern) {
      return 'Error: pattern is required'
    }

    // 设置搜索目录
    const baseDir = searchPath
      ? path.isAbsolute(searchPath)
        ? searchPath
        : path.resolve(context?.cwd || process.cwd(), searchPath)
      : context?.cwd || process.cwd()

    try {
      // 将 glob 模式转换为 find 命令
      const findCommand = buildFindCommand(pattern, baseDir)
      
      const { stdout } = await execAsync(findCommand, {
        cwd: baseDir,
        timeout: TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
      })

      const files = stdout
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .slice(0, MAX_RESULTS)

      if (files.length === 0) {
        return `No files found matching pattern "${pattern}" in ${baseDir}`
      }

      let result = `Found ${files.length} file(s) matching "${pattern}":\n\n`
      result += files.join('\n')

      if (files.length >= MAX_RESULTS) {
        result += `\n\n... (Results limited to ${MAX_RESULTS} files)`
      }

      return result
    } catch (error: unknown) {
      const execError = error as {
        code?: number | string
        stderr?: string
        message?: string
      }

      // 没有找到文件时 find 可能返回非零退出码
      if (execError.code === 1 && !execError.stderr) {
        return `No files found matching pattern "${pattern}" in ${baseDir}`
      }

      return `Error searching files: ${execError.message || String(error)}`
    }
  },
}

/**
 * 将 glob 模式转换为 find 命令
 */
function buildFindCommand(pattern: string, baseDir: string): string {
  // 处理常见的 glob 模式转换
  let findPattern = pattern

  // 处理 **/ 递归模式
  const isRecursive = pattern.includes('**')
  
  // 提取文件名模式
  let namePattern: string
  let searchDir = baseDir

  if (isRecursive) {
    // 对于 **/*.ts 这样的模式
    const parts = pattern.split('**/')
    if (parts.length === 2 && parts[0] === '') {
      // **/*.ts -> 搜索所有子目录中匹配的文件
      namePattern = parts[1]
    } else if (parts.length === 2 && parts[0]) {
      // src/**/*.ts -> 在 src 目录下搜索
      searchDir = path.join(baseDir, parts[0].replace(/\/$/, ''))
      namePattern = parts[1]
    } else {
      // 复杂模式，使用原始模式
      namePattern = pattern.replace(/\*\*\//g, '')
    }
  } else {
    namePattern = pattern
  }

  // 处理花括号扩展 {ts,tsx}
  if (namePattern.includes('{') && namePattern.includes('}')) {
    const match = namePattern.match(/\{([^}]+)\}/)
    if (match) {
      const extensions = match[1].split(',')
      const prefix = namePattern.substring(0, namePattern.indexOf('{'))
      const suffix = namePattern.substring(namePattern.indexOf('}') + 1)
      
      const findExpressions = extensions
        .map(ext => `-name "${prefix}${ext.trim()}${suffix}"`)
        .join(' -o ')
      
      return `find "${searchDir}" -type f \\( ${findExpressions} \\) 2>/dev/null | head -n ${MAX_RESULTS}`
    }
  }

  // 简单模式
  return `find "${searchDir}" -type f -name "${namePattern}" 2>/dev/null | head -n ${MAX_RESULTS}`
}
