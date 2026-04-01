"use client"

import { useState, useCallback, useEffect } from "react"

export interface Session {
  id: string
  title: string
  model?: string
  messageCount?: number
  createdAt: Date
  updatedAt: Date
}

const CURRENT_SESSION_KEY = "ai-agent-current-session"

function loadCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY)
  } catch {
    return null
  }
}

function saveCurrentSessionId(id: string | null) {
  if (typeof window === "undefined") return
  try {
    if (id) {
      localStorage.setItem(CURRENT_SESSION_KEY, id)
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY)
    }
  } catch (e) {
    console.error("Failed to save current session:", e)
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // 从 API 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        const loadedSessions: Session[] = (data.sessions || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          model: s.model,
          messageCount: s.messageCount,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }))
        setSessions(loadedSessions)
        return loadedSessions
      }
    } catch (e) {
      console.error("Failed to load sessions from API:", e)
    }
    return []
  }, [])

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      const loadedSessions = await loadSessions()
      const savedCurrentId = loadCurrentSessionId()
      
      if (loadedSessions.length === 0) {
        // 创建默认会话
        const newId = await createSessionInternal()
        if (newId) {
          setCurrentSessionId(newId)
          saveCurrentSessionId(newId)
        }
      } else {
        // 验证 currentId 是否有效
        const validId = loadedSessions.find(s => s.id === savedCurrentId)?.id || loadedSessions[0]?.id
        setCurrentSessionId(validId)
        if (validId !== savedCurrentId) {
          saveCurrentSessionId(validId)
        }
      }
      setIsLoaded(true)
    }
    init()
  }, [])

  // 内部创建会话函数
  const createSessionInternal = async (model?: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      })
      if (response.ok) {
        const data = await response.json()
        const newSession: Session = {
          id: data.session.id,
          title: data.session.title,
          model: data.session.model,
          messageCount: 0,
          createdAt: new Date(data.session.createdAt),
          updatedAt: new Date(data.session.updatedAt),
        }
        setSessions(prev => [newSession, ...prev])
        return newSession.id
      }
    } catch (e) {
      console.error("Failed to create session:", e)
    }
    return null
  }

  const createSession = useCallback(async (model?: string) => {
    const newId = await createSessionInternal(model)
    if (newId) {
      setCurrentSessionId(newId)
      saveCurrentSessionId(newId)
    }
    return newId
  }, [])

  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    saveCurrentSessionId(sessionId)
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSessions(prev => {
          const updated = prev.filter(s => s.id !== sessionId)
          
          // 如果删除的是当前会话，切换到第一个
          if (currentSessionId === sessionId) {
            const newCurrentId = updated[0]?.id || null
            setCurrentSessionId(newCurrentId)
            saveCurrentSessionId(newCurrentId)
          }
          
          return updated
        })
      }
    } catch (e) {
      console.error("Failed to delete session:", e)
    }
  }, [currentSessionId])

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (response.ok) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { ...s, title, updatedAt: new Date() }
            : s
        ))
      }
    } catch (e) {
      console.error("Failed to update session title:", e)
    }
  }, [])

  const getCurrentSession = useCallback(() => {
    return sessions.find(s => s.id === currentSessionId) || null
  }, [sessions, currentSessionId])

  const refreshSessions = useCallback(async () => {
    await loadSessions()
  }, [loadSessions])

  return {
    sessions,
    currentSessionId,
    isLoaded,
    createSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    getCurrentSession,
    refreshSessions,
  }
}
