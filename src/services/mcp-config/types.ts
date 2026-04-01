/**
 * MCP (Model Context Protocol) 配置类型定义
 */

// MCP 服务器传输类型
export type MCPTransportType = 'stdio' | 'sse' | 'http'

// stdio 传输配置
export interface StdioTransport {
  type: 'stdio'
  command: string
  args?: string[]
  env?: Record<string, string>
}

// SSE 传输配置
export interface SSETransport {
  type: 'sse'
  url: string
  headers?: Record<string, string>
}

// HTTP 传输配置
export interface HTTPTransport {
  type: 'http'
  url: string
  headers?: Record<string, string>
}

export type MCPTransport = StdioTransport | SSETransport | HTTPTransport

// MCP 服务器配置
export interface MCPServerConfig {
  name: string
  transport: MCPTransport
  enabled: boolean
  description?: string
}

// MCP 配置文件格式
export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>
}

// MCP 服务器创建/更新时的输入类型（不含 name）
export type MCPServerInput = Omit<MCPServerConfig, 'name'>
