/**
 * Session Manager - 会话管理
 * 
 * 负责：
 * - 创建、获取、删除会话
 * - 管理会话消息历史
 * - 会话标题自动更新
 */

import type { UniversalMessage } from '../ai-provider/types'

/**
 * 会话接口
 */
export interface Session {
  /** 会话唯一标识 */
  id: string
  /** 会话标题 */
  title: string
  /** 消息历史 */
  messages: UniversalMessage[]
  /** 当前使用的模型 */
  model: string
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

/**
 * 会话管理器
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map()

  /**
   * 创建新会话
   * @param model 使用的模型 ID
   * @returns 新创建的会话
   */
  createSession(model: string): Session {
    const id = generateId()
    const session: Session = {
      id,
      title: '新对话',
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.sessions.set(id, session)
    return session
  }

  /**
   * 获取会话
   * @param id 会话 ID
   * @returns 会话对象，不存在则返回 undefined
   */
  getSession(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  /**
   * 获取所有会话（按更新时间降序）
   * @returns 会话数组
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * 向会话添加消息
   * @param sessionId 会话 ID
   * @param message 要添加的消息
   */
  addMessage(sessionId: string, message: UniversalMessage): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.messages.push(message)
      session.updatedAt = Date.now()
      // 如果是第一条用户消息，自动更新标题
      if (session.messages.length === 1 && message.role === 'user') {
        const content = typeof message.content === 'string' ? message.content : ''
        session.title = content.slice(0, 50) || '新对话'
      }
    }
  }

  /**
   * 批量添加消息
   * @param sessionId 会话 ID
   * @param messages 要添加的消息数组
   */
  addMessages(sessionId: string, messages: UniversalMessage[]): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      for (const message of messages) {
        session.messages.push(message)
      }
      session.updatedAt = Date.now()
    }
  }

  /**
   * 删除会话
   * @param id 会话 ID
   * @returns 是否成功删除
   */
  deleteSession(id: string): boolean {
    return this.sessions.delete(id)
  }

  /**
   * 更新会话模型
   * @param sessionId 会话 ID
   * @param model 新模型 ID
   */
  updateModel(sessionId: string, model: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.model = model
      session.updatedAt = Date.now()
    }
  }

  /**
   * 更新会话标题
   * @param sessionId 会话 ID
   * @param title 新标题
   */
  updateTitle(sessionId: string, title: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.title = title
      session.updatedAt = Date.now()
    }
  }

  /**
   * 清空会话消息
   * @param sessionId 会话 ID
   */
  clearMessages(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.messages = []
      session.updatedAt = Date.now()
    }
  }

  /**
   * 获取会话消息数量
   * @param sessionId 会话 ID
   * @returns 消息数量，会话不存在返回 0
   */
  getMessageCount(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    return session ? session.messages.length : 0
  }

  /**
   * 检查会话是否存在
   * @param id 会话 ID
   * @returns 是否存在
   */
  hasSession(id: string): boolean {
    return this.sessions.has(id)
  }

  /**
   * 获取会话总数
   * @returns 会话总数
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * 清空所有会话
   */
  clear(): void {
    this.sessions.clear()
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

// 全局单例
export const sessionManager = new SessionManager()
