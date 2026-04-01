"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { ModelSelector } from "@/components/layout/ModelSelector"
import { MessageList } from "@/components/chat/MessageList"
import { ChatInput } from "@/components/chat/ChatInput"
import { useSessions } from "@/hooks/useSessions"
import { useModels } from "@/hooks/useModels"
import { useChat } from "@/hooks/useChat"

export default function HomePage() {
  const {
    sessions,
    currentSessionId,
    isLoaded,
    createSession,
    switchSession,
    deleteSession,
  } = useSessions()

  const { models, currentModel, setCurrentModel } = useModels()

  const {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopGeneration,
  } = useChat(currentSessionId, currentModel)

  // 等待客户端加载完成
  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      {/* 侧边栏 */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateSession={createSession}
        onSwitchSession={switchSession}
        onDeleteSession={deleteSession}
      />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <header className="border-b px-4 py-3 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ModelSelector
            models={models}
            currentModel={currentModel}
            onModelChange={setCurrentModel}
          />
        </header>

        {/* 消息列表 */}
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />

        {/* 输入区域 */}
        <ChatInput
          onSendMessage={sendMessage}
          onStopGeneration={stopGeneration}
          isLoading={isLoading}
          disabled={!currentSessionId}
        />
      </main>
    </div>
  )
}
