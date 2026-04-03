"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Eye, EyeOff, Save, Plus, Trash2, Edit2, 
  Server, Wand2, Settings2, X, Terminal, Globe, Radio, Sparkles, RotateCcw, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useModels } from "@/hooks/useModels"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// Types
interface Settings {
  apiKey: string
  defaultModel: string
  temperature: number
  maxTokens: number
}

interface MCPTransport {
  type: 'stdio' | 'sse' | 'http'
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
}

interface MCPServer {
  name: string
  transport: MCPTransport
  enabled: boolean
  description?: string
}

interface Skill {
  name: string
  displayName?: string
  description: string
  whenToUse?: string
  allowedTools?: string[]
  arguments?: string[]
  argumentHint?: string
  userInvocable?: boolean
  version?: string
  paths?: string[]
  context?: 'inline' | 'fork'
  content: string
  enabled: boolean
  source: 'user' | 'project'
}

type TabType = 'general' | 'mcp' | 'skills'

const SETTINGS_STORAGE_KEY = "ai-agent-settings"

const defaultSettings: Settings = {
  apiKey: "",
  defaultModel: "qwen-plus",
  temperature: 0.7,
  maxTokens: 4096,
}

function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error("Failed to load settings:", e)
  }
  return defaultSettings
}

function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error("Failed to save settings:", e)
  }
}

// Tab Button Component
function TabButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        active 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

// Toggle Switch Component
function Toggle({ 
  checked, 
  onChange, 
  disabled 
}: { 
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean 
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

// MCP Server Card Component
function MCPServerCard({ 
  server, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  server: MCPServer
  onToggle: (enabled: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const getTransportIcon = () => {
    switch (server.transport.type) {
      case 'stdio': return Terminal
      case 'sse': return Radio
      case 'http': return Globe
    }
  }
  const TransportIcon = getTransportIcon()
  
  return (
    <Card className={cn(!server.enabled && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{server.name}</h4>
              <Badge variant="outline" className="shrink-0">
                <TransportIcon className="h-3 w-3 mr-1" />
                {server.transport.type.toUpperCase()}
              </Badge>
            </div>
            {server.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {server.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {server.transport.type === 'stdio' 
                ? server.transport.command 
                : server.transport.url}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Toggle checked={server.enabled} onChange={onToggle} />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skill Card Component
function SkillCard({ 
  skill, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  skill: Skill
  onToggle: (enabled: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className={cn(!skill.enabled && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium">{skill.displayName || skill.name}</h4>
              <Badge variant={skill.source === 'user' ? 'default' : 'secondary'}>
                {skill.source === 'user' ? '用户' : '项目'}
              </Badge>
              {skill.version && (
                <Badge variant="outline">v{skill.version}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {skill.description}
            </p>
            {skill.paths && skill.paths.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                激活路径: {skill.paths.join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Toggle checked={skill.enabled} onChange={onToggle} />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// MCP Form Component
function MCPForm({ 
  server, 
  onSave, 
  onCancel 
}: { 
  server?: MCPServer
  onSave: (data: Omit<MCPServer, 'enabled'> & { enabled?: boolean }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(server?.name || '')
  const [description, setDescription] = useState(server?.description || '')
  const [transportType, setTransportType] = useState<'stdio' | 'sse' | 'http'>(
    server?.transport.type || 'stdio'
  )
  const [command, setCommand] = useState(server?.transport.command || '')
  const [args, setArgs] = useState(server?.transport.args?.join(' ') || '')
  const [url, setUrl] = useState(server?.transport.url || '')
  const [headers, setHeaders] = useState(
    server?.transport.headers ? JSON.stringify(server.transport.headers, null, 2) : ''
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('名称不能为空')
      return
    }

    if (transportType === 'stdio' && !command.trim()) {
      setError('命令不能为空')
      return
    }

    if ((transportType === 'sse' || transportType === 'http') && !url.trim()) {
      setError('URL 不能为空')
      return
    }

    let parsedHeaders: Record<string, string> | undefined
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers)
      } catch {
        setError('Headers 格式错误，请输入有效的 JSON')
        return
      }
    }

    const transport: MCPTransport = transportType === 'stdio'
      ? { type: 'stdio', command, args: args.trim() ? args.split(/\s+/) : undefined }
      : { type: transportType, url, headers: parsedHeaders }

    onSave({
      name: name.trim(),
      description: description.trim(),
      transport,
      enabled: server?.enabled ?? true
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{server ? '编辑 MCP 服务器' : '添加 MCP 服务器'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">名称 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-mcp-server"
              disabled={!!server}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">传输类型</label>
            <div className="flex gap-2">
              {(['stdio', 'sse', 'http'] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={transportType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransportType(type)}
                >
                  {type.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {transportType === 'stdio' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">命令 *</label>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npx -y @modelcontextprotocol/server"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">参数</label>
                <Input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="--flag value （空格分隔）"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL *</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/mcp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Headers (JSON)</label>
                <Textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder='{"Authorization": "Bearer xxx"}'
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="服务器功能描述"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit">
              {server ? '保存' : '添加'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Skill Form Component
function SkillForm({ 
  skill, 
  onSave, 
  onCancel 
}: { 
  skill?: Skill
  onSave: (data: Omit<Skill, 'enabled' | 'source'> & { enabled?: boolean; source?: 'user' | 'project' }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(skill?.name || '')
  const [displayName, setDisplayName] = useState(skill?.displayName || '')
  const [description, setDescription] = useState(skill?.description || '')
  const [whenToUse, setWhenToUse] = useState(skill?.whenToUse || '')
  const [allowedTools, setAllowedTools] = useState(skill?.allowedTools?.join(', ') || '')
  const [content, setContent] = useState(skill?.content || '')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('名称不能为空')
      return
    }

    if (!description.trim()) {
      setError('描述不能为空')
      return
    }

    if (!content.trim()) {
      setError('技能内容不能为空')
      return
    }

    onSave({
      name: name.trim(),
      displayName: displayName.trim() || name.trim(),
      description: description.trim(),
      whenToUse: whenToUse.trim(),
      allowedTools: allowedTools.trim() ? allowedTools.split(',').map(s => s.trim()) : [],
      content: content.trim(),
      enabled: skill?.enabled ?? true,
      source: skill?.source ?? 'user'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{skill ? '编辑技能' : '添加技能'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称 *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-skill"
                disabled={!!skill}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">显示名称</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="我的技能"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">描述 *</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个技能的功能描述"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">触发条件 (when_to_use)</label>
            <Input
              value={whenToUse}
              onChange={(e) => setWhenToUse(e.target.value)}
              placeholder="当用户请求...时触发"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">允许的工具</label>
            <Input
              value={allowedTools}
              onChange={(e) => setAllowedTools(e.target.value)}
              placeholder="read_file, write_file （逗号分隔）"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">技能内容 (Markdown) *</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# 技能指令&#10;&#10;在这里编写技能的具体指令..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit">
              {skill ? '保存' : '添加'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// General Settings Tab
function GeneralSettingsTab({ 
  settings, 
  onSettingsChange, 
  onSave, 
  isSaved 
}: { 
  settings: Settings
  onSettingsChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onSave: () => void
  isSaved: boolean
}) {
  const { models } = useModels()
  const [showApiKey, setShowApiKey] = useState(false)
  
  const currentModelName = models.find(m => m.id === settings.defaultModel)?.name || "选择模型"

  return (
    <div className="space-y-6">
      {/* API 配置 */}
      <Card>
        <CardHeader>
          <CardTitle>API 配置</CardTitle>
          <CardDescription>
            配置 AI 服务的 API Key，用于与模型通信
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="请输入 API Key"
                value={settings.apiKey}
                onChange={(e) => onSettingsChange("apiKey", e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              API Key 将安全地存储在本地浏览器中
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 模型配置 */}
      <Card>
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
          <CardDescription>
            选择默认模型和调整生成参数
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 默认模型 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">默认模型</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {currentModelName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {models.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onSettingsChange("defaultModel", model.id)}
                  >
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      {model.description && (
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Temperature</label>
              <span className="text-sm text-muted-foreground">
                {settings.temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => onSettingsChange("temperature", parseFloat(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>精确 (0)</span>
              <span>平衡 (1)</span>
              <span>创意 (2)</span>
            </div>
          </div>

          <Separator />

          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="text-sm font-medium">最大输出长度 (Max Tokens)</label>
            <Input
              type="number"
              min="1"
              max="128000"
              value={settings.maxTokens}
              onChange={(e) => onSettingsChange("maxTokens", parseInt(e.target.value) || 4096)}
            />
            <p className="text-xs text-muted-foreground">
              控制 AI 回复的最大长度，范围 1-128000
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-4">
        <Link href="/">
          <Button variant="outline">取消</Button>
        </Link>
        <Button onClick={onSave} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaved ? "已保存" : "保存设置"}
        </Button>
      </div>
    </div>
  )
}

// MCP Settings Tab
function MCPSettingsTab() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPServer | undefined>()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp')
      const data = await res.json()
      if (data.servers) {
        setServers(data.servers)
      }
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/mcp/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      if (res.ok) {
        setServers(prev => prev.map(s => s.name === name ? { ...s, enabled } : s))
      } else {
        const data = await res.json()
        showMessage('error', data.error || '操作失败')
      }
    } catch (error) {
      showMessage('error', '操作失败')
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除服务器 "${name}" 吗？`)) return
    
    try {
      const res = await fetch(`/api/mcp/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setServers(prev => prev.filter(s => s.name !== name))
        showMessage('success', '删除成功')
      } else {
        const data = await res.json()
        showMessage('error', data.error || '删除失败')
      }
    } catch (error) {
      showMessage('error', '删除失败')
    }
  }

  const handleSave = async (data: Omit<MCPServer, 'enabled'> & { enabled?: boolean }) => {
    try {
      const isEdit = !!editingServer
      const url = isEdit 
        ? `/api/mcp/${encodeURIComponent(editingServer.name)}`
        : '/api/mcp'
      
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        await fetchServers()
        setShowForm(false)
        setEditingServer(undefined)
        showMessage('success', isEdit ? '更新成功' : '添加成功')
      } else {
        const result = await res.json()
        showMessage('error', result.error || '操作失败')
      }
    } catch (error) {
      showMessage('error', '操作失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={cn(
          "p-3 text-sm rounded-md",
          message.type === 'success' 
            ? "bg-green-500/10 text-green-500" 
            : "bg-destructive/10 text-destructive"
        )}>
          {message.text}
        </div>
      )}

      {showForm || editingServer ? (
        <MCPForm
          server={editingServer}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingServer(undefined)
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">MCP 服务器</h3>
              <p className="text-sm text-muted-foreground">
                管理 Model Context Protocol 服务器连接
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              添加服务器
            </Button>
          </div>

          {servers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无 MCP 服务器</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击"添加服务器"开始配置
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (
                <MCPServerCard
                  key={server.name}
                  server={server}
                  onToggle={(enabled) => handleToggle(server.name, enabled)}
                  onEdit={() => setEditingServer(server)}
                  onDelete={() => handleDelete(server.name)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// AI Skill Generator Dialog Component
function AISkillGeneratorDialog({
  open,
  onOpenChange,
  onSkillGenerated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSkillGenerated: (skill: Omit<Skill, 'enabled' | 'source'> & { enabled?: boolean; source?: 'user' | 'project' }) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedSkill, setGeneratedSkill] = useState<Skill | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'preview'>('input')

  const resetState = () => {
    setPrompt('')
    setGenerating(false)
    setGeneratedSkill(null)
    setError('')
    setStep('input')
  }

  const handleClose = (value: boolean) => {
    if (!value) {
      resetState()
    }
    onOpenChange(value)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入技能需求描述')
      return
    }

    setError('')
    setGenerating(true)

    try {
      const res = await fetch('/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '生成失败，请重试')
        return
      }

      if (data.skill) {
        setGeneratedSkill(data.skill)
        setStep('preview')
      } else {
        setError('未收到有效的技能配置，请重试')
      }
    } catch {
      setError('网络错误，请检查连接后重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerate = () => {
    setGeneratedSkill(null)
    setError('')
    setStep('input')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(step === 'preview' ? "max-w-2xl" : "max-w-lg")}>
        {step === 'input' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI 创建技能
              </DialogTitle>
              <DialogDescription>
                描述你想要的技能功能，AI 将自动生成完整的技能配置
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">需求描述</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={"描述你想要的技能功能，例如：\n\n- 创建一个能自动生成 React 组件的技能\n- 创建一个代码审查技能，检查安全漏洞\n- 创建一个数据库迁移脚本生成器"}
                  rows={6}
                  disabled={generating}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={generating}
              >
                取消
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    生成技能
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                预览生成的技能
              </DialogTitle>
              <DialogDescription>
                请检查 AI 生成的技能配置，可以修改后保存
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 max-h-[60vh] overflow-y-auto">
              <SkillForm
                skill={generatedSkill ? { ...generatedSkill, enabled: true, source: 'user' } : undefined}
                onSave={(data) => {
                  onSkillGenerated(data)
                  handleClose(false)
                }}
                onCancel={handleRegenerate}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Skills Settings Tab
function SkillsSettingsTab() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | undefined>()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false)

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch('/api/skills')
      const data = await res.json()
      if (data.skills) {
        setSkills(data.skills)
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      if (res.ok) {
        setSkills(prev => prev.map(s => s.name === name ? { ...s, enabled } : s))
      } else {
        const data = await res.json()
        showMessage('error', data.error || '操作失败')
      }
    } catch (error) {
      showMessage('error', '操作失败')
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除技能 "${name}" 吗？`)) return
    
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSkills(prev => prev.filter(s => s.name !== name))
        showMessage('success', '删除成功')
      } else {
        const data = await res.json()
        showMessage('error', data.error || '删除失败')
      }
    } catch (error) {
      showMessage('error', '删除失败')
    }
  }

  const handleSave = async (data: Omit<Skill, 'enabled' | 'source'> & { enabled?: boolean; source?: 'user' | 'project' }) => {
    try {
      const isEdit = !!editingSkill
      const url = isEdit 
        ? `/api/skills/${encodeURIComponent(editingSkill.name)}`
        : '/api/skills'
      
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        await fetchSkills()
        setShowForm(false)
        setEditingSkill(undefined)
        showMessage('success', isEdit ? '更新成功' : '添加成功')
      } else {
        const result = await res.json()
        showMessage('error', result.error || '操作失败')
      }
    } catch (error) {
      showMessage('error', '操作失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={cn(
          "p-3 text-sm rounded-md",
          message.type === 'success' 
            ? "bg-green-500/10 text-green-500" 
            : "bg-destructive/10 text-destructive"
        )}>
          {message.text}
        </div>
      )}

      {showForm || editingSkill ? (
        <SkillForm
          skill={editingSkill}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingSkill(undefined)
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">技能管理</h3>
              <p className="text-sm text-muted-foreground">
                管理 AI Agent 的技能和指令
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAiGeneratorOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI 创建
              </Button>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                添加技能
              </Button>
            </div>
          </div>

          {skills.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wand2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无技能</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击"添加技能"开始配置
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onToggle={(enabled) => handleToggle(skill.name, enabled)}
                  onEdit={() => setEditingSkill(skill)}
                  onDelete={() => handleDelete(skill.name)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AISkillGeneratorDialog
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        onSkillGenerated={handleSave}
      />
    </div>
  )
}

// Main Settings Page
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('general')

  useEffect(() => {
    setSettings(loadSettings())
    setIsLoaded(true)
  }, [])

  const handleSave = () => {
    saveSettings(settings)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">设置</h1>
        </div>
      </header>

      {/* Tab 导航 */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            <TabButton
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={Settings2}
              label="基础设置"
            />
            <TabButton
              active={activeTab === 'mcp'}
              onClick={() => setActiveTab('mcp')}
              icon={Server}
              label="MCP 服务器"
            />
            <TabButton
              active={activeTab === 'skills'}
              onClick={() => setActiveTab('skills')}
              icon={Wand2}
              label="技能管理"
            />
          </div>
        </div>
      </div>

      {/* 设置内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'general' && (
          <GeneralSettingsTab
            settings={settings}
            onSettingsChange={updateSetting}
            onSave={handleSave}
            isSaved={isSaved}
          />
        )}
        {activeTab === 'mcp' && <MCPSettingsTab />}
        {activeTab === 'skills' && <SkillsSettingsTab />}
      </main>
    </div>
  )
}
