"use client"

import { useEffect, useRef } from "react"
import { Bot, Sparkles } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./ChatMessage"
import { ToolCallDisplay } from "./ToolCallDisplay"
import { cn } from "@/lib/utils"
import type { Message } from "@/hooks/useChat"

interface MessageListProps {
  messages: Message[]
  streamingContent: string
  isLoading: boolean
}

export function MessageList({
  messages,
  streamingContent,
  isLoading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // 空状态 - 欢迎界面
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-yellow-800" />
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-2">欢迎使用 AI Agent</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          我是你的智能助手，可以帮你回答问题、编写代码、分析数据等。开始对话吧！
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
          {[
            { title: "编写代码", desc: "帮我用 Python 写一个快速排序算法" },
            { title: "解释概念", desc: "什么是机器学习中的过拟合？" },
            { title: "分析问题", desc: "如何优化网站的加载速度？" },
            { title: "创意写作", desc: "帮我写一首关于春天的诗" },
          ].map((item, index) => (
            <button
              key={index}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 text-left transition-colors"
            >
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ScrollArea ref={containerRef} className="flex-1 scrollbar-thin">
      <div className="max-w-4xl mx-auto">
        {messages.map((message) => (
          <div key={message.id}>
            <ChatMessage message={message} />
            {message.toolCalls?.map((toolCall) => (
              <div key={toolCall.id} className="px-4 pl-16">
                <ToolCallDisplay toolCall={toolCall} />
              </div>
            ))}
          </div>
        ))}

        {/* 流式输出中的消息 */}
        {isLoading && streamingContent && (
          <ChatMessage
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              createdAt: new Date(),
            }}
            isStreaming
          />
        )}

        {/* 加载指示器 (无内容时) */}
        {isLoading && !streamingContent && (
          <div className="flex gap-4 px-4 py-6 animate-message-in">
            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-muted-foreground">AI 正在思考...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
