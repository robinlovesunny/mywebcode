"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check, Bot, User } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Message } from "@/hooks/useChat"

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-6 animate-message-in",
        isUser ? "bg-muted/30" : "bg-background"
      )}
    >
      <Avatar className={cn("h-8 w-8 shrink-0", isUser ? "bg-blue-600" : "bg-purple-600")}>
        <AvatarFallback className={isUser ? "bg-blue-600 text-white" : "bg-purple-600 text-white"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "你" : "AI 助手"}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.createdAt.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className={cn("prose prose-sm dark:prose-invert max-w-none", isStreaming && "streaming")}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children, ...props }) => {
                  // 提取代码内容
                  const codeElement = (children as any)?.props?.children
                  const codeContent = typeof codeElement === "string" ? codeElement : ""
                  
                  return (
                    <div className="relative group">
                      <pre {...props} className="rounded-lg overflow-x-auto">
                        {children}
                      </pre>
                      {codeContent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                          onClick={() => copyToClipboard(codeContent)}
                        >
                          {copiedCode === codeContent ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  )
                },
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "")
                  const isInline = !match
                  
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" {...props}>
                        {children}
                      </code>
                    )
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-foreground animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}
