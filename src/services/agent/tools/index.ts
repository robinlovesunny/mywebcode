/**
 * 工具索引文件
 * 
 * 导出所有精简版工具并提供创建默认工具集的函数
 */

// 导出类型定义
export type {
  SimpleTool,
  ToolContext,
  ToolParameters,
  PropertyDefinition,
  ToolBuilderOptions,
} from './types'

// 导出辅助函数
export {
  createTool,
  stringParam,
  numberParam,
  integerParam,
  booleanParam,
  arrayParam,
  enumParam,
} from './types'

// 导出各个工具
export { FileReadTool } from './file-read'
export { FileWriteTool } from './file-write'
export { FileEditTool } from './file-edit'
export { BashTool } from './bash'
export { GlobTool } from './glob'
export { GrepTool } from './grep'
export { WebFetchTool } from './web-fetch'
export { WebSearchTool } from './web-search'
export { ListDirectoryTool } from './list-directory'
export { AskUserQuestionTool } from './ask-user'
export { FileDiffTool } from './file-diff'
export { CodeStatsTool } from './code-stats'

// 导入工具用于创建默认工具集
import { FileReadTool } from './file-read'
import { FileWriteTool } from './file-write'
import { FileEditTool } from './file-edit'
import { BashTool } from './bash'
import { GlobTool } from './glob'
import { GrepTool } from './grep'
import { WebFetchTool } from './web-fetch'
import { WebSearchTool } from './web-search'
import { ListDirectoryTool } from './list-directory'
import { AskUserQuestionTool } from './ask-user'
import { FileDiffTool } from './file-diff'
import { CodeStatsTool } from './code-stats'
import type { SimpleTool } from './types'

/**
 * 创建默认工具集
 * 
 * 包含所有核心工具：
 * - file_read: 文件读取
 * - file_write: 文件写入
 * - file_edit: 文件编辑
 * - bash: Shell 命令执行
 * - glob: 文件搜索
 * - grep: 内容搜索
 * - web_fetch: 网页抓取
 * - web_search: 网页搜索
 * - list_directory: 目录浏览
 * - ask_user: 用户交互
 * - file_diff: 文件对比
 * - code_stats: 代码统计
 */
export function createDefaultTools(): SimpleTool[] {
  return [
    FileReadTool,
    FileWriteTool,
    FileEditTool,
    BashTool,
    GlobTool,
    GrepTool,
    WebFetchTool,
    WebSearchTool,
    ListDirectoryTool,
    AskUserQuestionTool,
    FileDiffTool,
    CodeStatsTool,
  ]
}

/**
 * 获取所有可用工具的名称
 */
export function getAvailableToolNames(): string[] {
  return createDefaultTools().map(tool => tool.name)
}

/**
 * 根据名称获取工具
 */
export function getToolByName(name: string): SimpleTool | undefined {
  const tools = createDefaultTools()
  return tools.find(tool => tool.name === name)
}

/**
 * 创建工具映射表
 */
export function createToolMap(): Map<string, SimpleTool> {
  const map = new Map<string, SimpleTool>()
  for (const tool of createDefaultTools()) {
    map.set(tool.name, tool)
  }
  return map
}

/**
 * 工具信息（用于显示）
 */
export interface ToolInfo {
  name: string
  description: string
  requiredParams: string[]
  optionalParams: string[]
}

/**
 * 获取所有工具的信息
 */
export function getToolsInfo(): ToolInfo[] {
  return createDefaultTools().map(tool => ({
    name: tool.name,
    description: tool.description.split('\n')[0], // 只取第一行作为简短描述
    requiredParams: tool.parameters.required || [],
    optionalParams: Object.keys(tool.parameters.properties).filter(
      key => !(tool.parameters.required || []).includes(key)
    ),
  }))
}
