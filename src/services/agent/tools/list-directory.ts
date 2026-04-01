/**
 * ListDirectory Tool - 目录浏览工具
 * 
 * 列出目录内容，类似 ls/tree
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { SimpleTool, ToolContext } from './types'

// 默认最大深度
const DEFAULT_MAX_DEPTH = 3

// 要排除的目录
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '__pycache__',
  '.DS_Store',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.idea',
  '.vscode',
  'vendor',
])

/**
 * 目录项信息
 */
interface DirEntry {
  name: string
  isDirectory: boolean
  size: number
  children?: DirEntry[]
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`
}

/**
 * 递归读取目录内容
 */
async function readDirectoryRecursive(
  dirPath: string,
  currentDepth: number,
  maxDepth: number,
  showHidden: boolean
): Promise<DirEntry[]> {
  const entries: DirEntry[] = []
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    
    // 排序：目录在前，然后按名称排序
    items.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
    for (const item of items) {
      // 过滤隐藏文件
      if (!showHidden && item.name.startsWith('.')) {
        continue
      }
      
      // 过滤排除的目录
      if (item.isDirectory() && EXCLUDED_DIRS.has(item.name)) {
        continue
      }
      
      const itemPath = path.join(dirPath, item.name)
      
      try {
        const stats = await fs.stat(itemPath)
        
        const entry: DirEntry = {
          name: item.name,
          isDirectory: item.isDirectory(),
          size: stats.size,
        }
        
        // 递归读取子目录
        if (item.isDirectory() && currentDepth < maxDepth) {
          entry.children = await readDirectoryRecursive(
            itemPath,
            currentDepth + 1,
            maxDepth,
            showHidden
          )
        }
        
        entries.push(entry)
      } catch {
        // 无法访问的文件/目录，跳过
        continue
      }
    }
  } catch {
    // 读取目录失败
  }
  
  return entries
}

/**
 * 将目录结构格式化为 tree 形式
 */
function formatAsTree(
  entries: DirEntry[],
  prefix: string = '',
  isLast: boolean = true
): string {
  let output = ''
  
  entries.forEach((entry, index) => {
    const isLastEntry = index === entries.length - 1
    const connector = isLastEntry ? '└── ' : '├── '
    const typeIndicator = entry.isDirectory ? '/' : ''
    const sizeInfo = entry.isDirectory ? '' : ` (${formatSize(entry.size)})`
    
    output += `${prefix}${connector}${entry.name}${typeIndicator}${sizeInfo}\n`
    
    if (entry.children && entry.children.length > 0) {
      const newPrefix = prefix + (isLastEntry ? '    ' : '│   ')
      output += formatAsTree(entry.children, newPrefix, isLastEntry)
    }
  })
  
  return output
}

/**
 * 统计目录信息
 */
function countEntries(entries: DirEntry[]): { files: number; dirs: number } {
  let files = 0
  let dirs = 0
  
  for (const entry of entries) {
    if (entry.isDirectory) {
      dirs++
      if (entry.children) {
        const childCounts = countEntries(entry.children)
        files += childCounts.files
        dirs += childCounts.dirs
      }
    } else {
      files++
    }
  }
  
  return { files, dirs }
}

export const ListDirectoryTool: SimpleTool = {
  name: 'list_directory',
  description: `List directory contents in a tree-like format.

Parameters:
- path (required): Directory path to list
- recursive (optional): Whether to list recursively (default: false)
- max_depth (optional): Maximum recursion depth when recursive=true (default: 3)
- show_hidden (optional): Whether to show hidden files (default: false)

The tool will:
- Display files and directories in a tree structure
- Show file sizes for files
- Exclude common large directories (node_modules, .git, dist, etc.)
- Sort directories first, then files, alphabetically`,

  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to list recursively (default: false)',
      },
      max_depth: {
        type: 'integer',
        description: 'Maximum recursion depth when recursive=true (default: 3)',
      },
      show_hidden: {
        type: 'boolean',
        description: 'Whether to show hidden files (default: false)',
      },
    },
    required: ['path'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const inputPath = input.path as string
    const recursive = (input.recursive as boolean) ?? false
    const maxDepth = recursive ? ((input.max_depth as number) || DEFAULT_MAX_DEPTH) : 1
    const showHidden = (input.show_hidden as boolean) ?? false

    if (!inputPath) {
      return 'Error: path is required'
    }

    // 解析路径
    const resolvedPath = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(context?.cwd || process.cwd(), inputPath)

    try {
      // 检查路径是否存在
      const stats = await fs.stat(resolvedPath)
      
      if (!stats.isDirectory()) {
        return `Error: "${resolvedPath}" is not a directory`
      }

      // 读取目录内容
      const entries = await readDirectoryRecursive(
        resolvedPath,
        1,
        maxDepth,
        showHidden
      )

      if (entries.length === 0) {
        return `Directory: ${resolvedPath}\n(empty directory)`
      }

      // 统计信息
      const counts = countEntries(entries)
      
      // 格式化输出
      let result = `Directory: ${resolvedPath}\n`
      result += `Contents: ${counts.files} file(s), ${counts.dirs} directory(ies)\n`
      if (recursive && maxDepth > 1) {
        result += `Max depth: ${maxDepth}\n`
      }
      result += '---\n'
      result += formatAsTree(entries)

      return result.trim()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return `Error: Directory not found: ${resolvedPath}`
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        return `Error: Permission denied: ${resolvedPath}`
      }
      return `Error listing directory: ${error instanceof Error ? error.message : String(error)}`
    }
  },
}
