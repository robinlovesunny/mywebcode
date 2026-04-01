"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MessageSquarePlus,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Session } from "@/hooks/useSessions"

interface SidebarProps {
  sessions: Session[]
  currentSessionId: string | null
  onCreateSession: () => void
  onSwitchSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

export function Sidebar({
  sessions,
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return "今天"
    } else if (days === 1) {
      return "昨天"
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      })
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-muted/30 border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* 顶部 Logo 和折叠按钮 */}
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            AI Agent
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-3 py-2">
        <Button
          onClick={() => onCreateSession()}
          className={cn(
            "w-full gap-2 transition-all",
            isCollapsed && "px-0 justify-center"
          )}
          variant="outline"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {!isCollapsed && <span>新建对话</span>}
        </Button>
      </div>

      <Separator className="my-2" />

      {/* 会话列表 */}
      <ScrollArea className="flex-1 px-3 scrollbar-thin">
        <div className="space-y-1 py-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                currentSessionId === session.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
                isCollapsed && "justify-center px-0"
              )}
              onClick={() => onSwitchSession(session.id)}
              onMouseEnter={() => setHoveredSession(session.id)}
              onMouseLeave={() => setHoveredSession(null)}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {session.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.updatedAt)}
                    </p>
                  </div>
                  {hoveredSession === session.id && sessions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="my-2" />

      {/* 底部设置按钮 */}
      <div className="p-3">
        <Link href="/settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full gap-2 justify-start",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4" />
            {!isCollapsed && <span>设置</span>}
          </Button>
        </Link>
      </div>
    </aside>
  )
}
