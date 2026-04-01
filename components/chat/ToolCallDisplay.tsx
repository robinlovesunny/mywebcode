"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ToolCall } from "@/hooks/useChat"

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusIcon = {
    pending: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
  }

  const statusText = {
    pending: "等待中",
    running: "执行中",
    success: "已完成",
    error: "失败",
  }

  const statusVariant = {
    pending: "secondary" as const,
    running: "default" as const,
    success: "success" as const,
    error: "destructive" as const,
  }

  return (
    <div className="border rounded-lg overflow-hidden my-2 bg-muted/30">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between px-4 py-3 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{toolCall.name}</span>
          <Badge variant={statusVariant[toolCall.status]}>
            <span className="flex items-center gap-1">
              {statusIcon[toolCall.status]}
              <span>{statusText[toolCall.status]}</span>
            </span>
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* 参数 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">参数</p>
            <pre className="text-xs bg-background rounded p-3 overflow-x-auto">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* 结果 */}
          {toolCall.result && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">结果</p>
              <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">
                {toolCall.result}
              </pre>
            </div>
          )}

          {/* 错误 */}
          {toolCall.error && (
            <div>
              <p className="text-xs font-medium text-red-500 mb-1">错误</p>
              <pre className="text-xs bg-red-500/10 text-red-500 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
