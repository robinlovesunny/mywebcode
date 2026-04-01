/**
 * Grep Tool - 内容搜索工具
 * 
 * 在文件中搜索文本/正则表达式（通过执行 grep 命令实现）
 */

import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

const execAsync = promisify(execCallback)

// 最大结果数量
const MAX_RESULTS = 50

// 超时时间（30秒）
const TIMEOUT_MS = 30000

// 上下文行数
const CONTEXT_LINES = 2

export const GrepTool: SimpleTool = {
  name: 'grep',
  description: `Search for text patterns in files.

Parameters:
- pattern (required): The text or regex pattern to search for
- path (optional): The file or directory to search in (default: current working directory)
- include (optional): File glob pattern to include (e.g., "*.ts", "*.{js,jsx}")
- case_sensitive (optional): Whether the search is case-sensitive (default: false)
- regex (optional): Whether to treat pattern as a regex (default: false)

Returns matching lines with file paths and line numbers.
Results are limited to ${MAX_RESULTS} matches.

Example patterns:
- "TODO" - Find TODO comments
- "function\\s+\\w+" - Find function declarations (regex)
- "import.*from" - Find import statements (regex)`,

  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The text or regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'The file or directory to search in (default: current working directory)',
      },
      include: {
        type: 'string',
        description: 'File glob pattern to include (e.g., "*.ts", "*.{js,jsx}")',
      },
      case_sensitive: {
        type: 'boolean',
        description: 'Whether the search is case-sensitive (default: false)',
      },
      regex: {
        type: 'boolean',
        description: 'Whether to treat pattern as a regex (default: false)',
      },
    },
    required: ['pattern'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const pattern = input.pattern as string
    const searchPath = input.path as string | undefined
    const includePattern = input.include as string | undefined
    const caseSensitive = input.case_sensitive as boolean | undefined
    const isRegex = input.regex as boolean | undefined

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
      // 构建 grep 命令
      const grepCommand = buildGrepCommand(
        pattern,
        baseDir,
        includePattern,
        caseSensitive ?? false,
        isRegex ?? false
      )

      const { stdout, stderr } = await execAsync(grepCommand, {
        cwd: baseDir,
        timeout: TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
      })

      if (!stdout.trim()) {
        return `No matches found for pattern "${pattern}" in ${baseDir}`
      }

      const lines = stdout.trim().split('\n')
      const matchCount = lines.length

      let result = `Found ${matchCount} match(es) for "${pattern}":\n\n`
      result += lines.slice(0, MAX_RESULTS * 5).join('\n') // 考虑上下文行

      if (matchCount > MAX_RESULTS) {
        result += `\n\n... (Results limited to ${MAX_RESULTS} matches)`
      }

      return result
    } catch (error: unknown) {
      const execError = error as {
        code?: number | string
        stderr?: string
        stdout?: string
        message?: string
      }

      // grep 返回 1 表示没有找到匹配
      if (execError.code === 1 && !execError.stderr) {
        return `No matches found for pattern "${pattern}" in ${baseDir}`
      }

      // grep 返回 2 表示错误
      if (execError.stderr) {
        return `Error searching: ${execError.stderr}`
      }

      return `Error searching files: ${execError.message || String(error)}`
    }
  },
}

/**
 * 构建 grep 命令
 */
function buildGrepCommand(
  pattern: string,
  baseDir: string,
  includePattern?: string,
  caseSensitive?: boolean,
  isRegex?: boolean
): string {
  const args: string[] = ['grep']

  // 递归搜索
  args.push('-r')

  // 显示行号
  args.push('-n')

  // 显示上下文
  args.push(`-C ${CONTEXT_LINES}`)

  // 大小写
  if (!caseSensitive) {
    args.push('-i')
  }

  // 正则模式
  if (isRegex) {
    args.push('-E')
  } else {
    // 固定字符串模式
    args.push('-F')
  }

  // 文件过滤
  if (includePattern) {
    // 处理花括号扩展
    if (includePattern.includes('{') && includePattern.includes('}')) {
      const match = includePattern.match(/\{([^}]+)\}/)
      if (match) {
        const extensions = match[1].split(',')
        const prefix = includePattern.substring(0, includePattern.indexOf('{'))
        const suffix = includePattern.substring(includePattern.indexOf('}') + 1)
        
        for (const ext of extensions) {
          args.push(`--include="${prefix}${ext.trim()}${suffix}"`)
        }
      }
    } else {
      args.push(`--include="${includePattern}"`)
    }
  }

  // 排除常见的不需要搜索的目录
  args.push('--exclude-dir=node_modules')
  args.push('--exclude-dir=.git')
  args.push('--exclude-dir=dist')
  args.push('--exclude-dir=build')
  args.push('--exclude-dir=coverage')
  args.push('--exclude-dir=.next')
  args.push('--exclude-dir=__pycache__')

  // 搜索模式（需要转义特殊字符）
  const escapedPattern = pattern.replace(/"/g, '\\"')
  args.push(`"${escapedPattern}"`)

  // 搜索路径
  args.push(`"${baseDir}"`)

  // 限制结果数量
  args.push(`| head -n ${MAX_RESULTS * 10}`) // 考虑上下文行

  return args.join(' ')
}
