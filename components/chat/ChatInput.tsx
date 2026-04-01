"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import { Send, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (content: string) => void
  onStopGeneration: () => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  isLoading,
  disabled,
}: ChatInputProps) {
  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [content])

  const handleSubmit = () => {
    if (!content.trim() || isLoading || disabled) return
    onSendMessage(content)
    setContent("")
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto p-4">
        <div className="relative flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              className={cn(
                "min-h-[44px] max-h-[200px] resize-none pr-12 py-3",
                "focus-visible:ring-1 focus-visible:ring-ring"
              )}
              disabled={disabled}
              rows={1}
            />
          </div>

          {isLoading ? (
            <Button
              onClick={onStopGeneration}
              variant="destructive"
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || disabled}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          AI 可能会犯错，请核实重要信息
        </p>
      </div>
    </div>
  )
}
