/**
 * CodeStats Tool - 代码统计工具
 * 
 * 统计项目代码信息
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

// 要排除的目录
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.idea',
  '.vscode',
  'vendor',
  'target',
  'out',
  'bin',
  'obj',
])

// 默认统计的扩展名
const DEFAULT_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.java', '.go', '.rs',
  '.c', '.cpp', '.h', '.hpp',
  '.rb', '.php', '.swift', '.kt',
  '.vue', '.svelte', '.html', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.xml',
  '.md', '.txt',
  '.sh', '.bash', '.zsh',
  '.sql',
]

/**
 * 文件统计信息
 */
interface FileStats {
  extension: string
  files: number
  lines: number
  blankLines: number
  codeLines: number
}

/**
 * 统计单个文件的行数
 */
async function countFileLines(filePath: string): Promise<{ total: number; blank: number; code: number }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    const total = lines.length
    const blank = lines.filter(line => line.trim() === '').length
    const code = total - blank
    
    return { total, blank, code }
  } catch {
    return { total: 0, blank: 0, code: 0 }
  }
}

/**
 * 递归遍历目录并统计
 */
async function traverseDirectory(
  dirPath: string,
  extensions: Set<string>,
  stats: Map<string, FileStats>
): Promise<void> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name)
      
      if (item.isDirectory()) {
        // 跳过排除的目录
        if (EXCLUDED_DIRS.has(item.name) || item.name.startsWith('.')) {
          continue
        }
        await traverseDirectory(itemPath, extensions, stats)
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase()
        
        // 如果指定了扩展名，只统计指定的扩展名
        // 如果没有指定，统计默认扩展名
        if (!extensions.has(ext)) {
          continue
        }
        
        const lineCounts = await countFileLines(itemPath)
        
        if (!stats.has(ext)) {
          stats.set(ext, {
            extension: ext,
            files: 0,
            lines: 0,
            blankLines: 0,
            codeLines: 0,
          })
        }
        
        const stat = stats.get(ext)!
        stat.files++
        stat.lines += lineCounts.total
        stat.blankLines += lineCounts.blank
        stat.codeLines += lineCounts.code
      }
    }
  } catch {
    // 无法访问的目录，跳过
  }
}

/**
 * 格式化统计结果为表格
 */
function formatStatsTable(stats: Map<string, FileStats>): string {
  // 按代码行数排序
  const sortedStats = Array.from(stats.values())
    .sort((a, b) => b.codeLines - a.codeLines)
  
  if (sortedStats.length === 0) {
    return 'No matching files found.'
  }
  
  // 计算列宽
  const extWidth = Math.max(9, ...sortedStats.map(s => s.extension.length)) + 2
  const filesWidth = Math.max(5, ...sortedStats.map(s => s.files.toString().length)) + 2
  const linesWidth = Math.max(5, ...sortedStats.map(s => s.lines.toString().length)) + 2
  const blankWidth = Math.max(5, ...sortedStats.map(s => s.blankLines.toString().length)) + 2
  const codeWidth = Math.max(4, ...sortedStats.map(s => s.codeLines.toString().length)) + 2
  
  // 表头
  let table = ''
  table += 'Extension'.padEnd(extWidth)
  table += 'Files'.padStart(filesWidth)
  table += 'Lines'.padStart(linesWidth)
  table += 'Blank'.padStart(blankWidth)
  table += 'Code'.padStart(codeWidth)
  table += '\n'
  
  // 分隔线
  table += '-'.repeat(extWidth + filesWidth + linesWidth + blankWidth + codeWidth)
  table += '\n'
  
  // 数据行
  for (const stat of sortedStats) {
    table += stat.extension.padEnd(extWidth)
    table += stat.files.toString().padStart(filesWidth)
    table += stat.lines.toString().padStart(linesWidth)
    table += stat.blankLines.toString().padStart(blankWidth)
    table += stat.codeLines.toString().padStart(codeWidth)
    table += '\n'
  }
  
  // 总计
  const totals = sortedStats.reduce(
    (acc, s) => ({
      files: acc.files + s.files,
      lines: acc.lines + s.lines,
      blankLines: acc.blankLines + s.blankLines,
      codeLines: acc.codeLines + s.codeLines,
    }),
    { files: 0, lines: 0, blankLines: 0, codeLines: 0 }
  )
  
  table += '-'.repeat(extWidth + filesWidth + linesWidth + blankWidth + codeWidth)
  table += '\n'
  table += 'Total'.padEnd(extWidth)
  table += totals.files.toString().padStart(filesWidth)
  table += totals.lines.toString().padStart(linesWidth)
  table += totals.blankLines.toString().padStart(blankWidth)
  table += totals.codeLines.toString().padStart(codeWidth)
  
  return table
}

export const CodeStatsTool: SimpleTool = {
  name: 'code_stats',
  description: `Count lines of code and files in a directory.

Parameters:
- path (required): Directory path to analyze
- extensions (optional): Array of file extensions to include (e.g., [".ts", ".js"])

The tool will:
- Recursively traverse the directory
- Count files, total lines, blank lines, and code lines
- Group statistics by file extension
- Exclude common non-source directories (node_modules, .git, dist, etc.)

Output is a formatted table showing statistics per extension and totals.`,

  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to analyze',
      },
      extensions: {
        type: 'array',
        description: 'File extensions to include (e.g., [".ts", ".js"]). If not specified, common code file extensions are used.',
        items: {
          type: 'string',
        },
      },
    },
    required: ['path'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const inputPath = input.path as string
    const inputExtensions = input.extensions as string[] | undefined

    if (!inputPath) {
      return 'Error: path is required'
    }

    // 解析路径
    const resolvedPath = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(context?.cwd || process.cwd(), inputPath)

    // 检查路径是否存在
    try {
      const stats = await fs.stat(resolvedPath)
      if (!stats.isDirectory()) {
        return `Error: "${resolvedPath}" is not a directory`
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: Directory not found: ${resolvedPath}`
      }
      return `Error accessing directory: ${error instanceof Error ? error.message : String(error)}`
    }

    // 准备扩展名集合
    const extensions = new Set<string>(
      inputExtensions 
        ? inputExtensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`)
        : DEFAULT_EXTENSIONS
    )

    // 遍历并统计
    const statsMap = new Map<string, FileStats>()
    await traverseDirectory(resolvedPath, extensions, statsMap)

    // 格式化输出
    let result = `Code Statistics for: ${resolvedPath}\n`
    if (inputExtensions) {
      result += `Filtered extensions: ${inputExtensions.join(', ')}\n`
    }
    result += '---\n\n'
    result += formatStatsTable(statsMap)

    return result
  },
}
