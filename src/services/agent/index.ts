/**
 * Agent 服务模块
 * 
 * 提供 Agent 循环、会话管理、工具执行等功能
 */

// 导出 Agent 循环
export {
  runAgentLoop,
  runSingleTurn,
  aggregateAgentEvents,
  getAvailableTools,
  getDefaultSystemPrompt,
  type AgentEvent,
  type AgentLoopConfig,
  type TokenUsage,
} from './agent-loop'

// 导出会话管理
export {
  SessionManager,
  sessionManager,
  type Session,
} from './session'

// 导出工具执行器
export {
  ToolExecutor,
  createToolExecutor,
  type ToolExecutorConfig,
} from './tool-executor'

// 导出所有工具及相关类型
export {
  // 类型
  type SimpleTool,
  type ToolContext,
  type ToolParameters,
  type PropertyDefinition,
  type ToolBuilderOptions,
  type ToolInfo,
  // 辅助函数
  createTool,
  stringParam,
  numberParam,
  integerParam,
  booleanParam,
  arrayParam,
  enumParam,
  // 工具集合
  createDefaultTools,
  getAvailableToolNames,
  getToolByName,
  createToolMap,
  getToolsInfo,
  // 具体工具
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  BashTool,
  GlobTool,
  GrepTool,
} from './tools'
