/**
 * WebFetch Tool - 网页抓取工具
 * 
 * 抓取 URL 的内容并返回文本
 */

import type { SimpleTool, ToolContext } from './types'

// 默认超时时间（30秒）
const DEFAULT_TIMEOUT_MS = 30000

// 默认最大内容长度
const DEFAULT_MAX_LENGTH = 50000

// 默认 User-Agent
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 将 HTML 转换为纯文本
 * 简单的正则实现：去除标签，保留文本内容
 */
function htmlToText(html: string): string {
  let text = html

  // 移除 script 和 style 标签及其内容
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // 移除 HTML 注释
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  
  // 将 br、p、div、li、h1-h6 等转换为换行
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/?(p|div|li|tr|h[1-6])\b[^>]*>/gi, '\n')
  
  // 移除所有其他 HTML 标签
  text = text.replace(/<[^>]+>/g, '')
  
  // 解码 HTML 实体
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  // 清理多余空白
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
  
  // 合并多个连续空行
  text = text.replace(/\n{3,}/g, '\n\n')
  
  return text.trim()
}

/**
 * 截断文本到指定长度
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  
  const truncated = text.slice(0, maxLength)
  const remainingChars = text.length - maxLength
  
  return `${truncated}\n\n... [Content truncated. ${remainingChars} more characters not shown]`
}

export const WebFetchTool: SimpleTool = {
  name: 'web_fetch',
  description: `Fetch the contents of a URL and return as text.

Parameters:
- url (required): The URL to fetch
- max_length (optional): Maximum characters to return (default: 50000)
- headers (optional): Custom request headers as key-value pairs

The tool will:
- Fetch the URL content with a 30 second timeout
- Convert HTML to plain text (removing tags while preserving content)
- Truncate to max_length if content exceeds the limit
- Return error messages for network errors, non-200 status codes, etc.`,

  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch',
      },
      max_length: {
        type: 'integer',
        description: 'Maximum characters to return (default: 50000)',
      },
      headers: {
        type: 'object',
        description: 'Custom request headers as key-value pairs',
      },
    },
    required: ['url'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const url = input.url as string
    const maxLength = (input.max_length as number) || DEFAULT_MAX_LENGTH
    const customHeaders = (input.headers as Record<string, string>) || {}

    if (!url) {
      return 'Error: url is required'
    }

    // 验证 URL 格式
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return 'Error: Only HTTP and HTTPS URLs are supported'
      }
    } catch {
      return `Error: Invalid URL format: ${url}`
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...customHeaders,
        },
        signal: controller.signal,
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      // 检查响应状态
      if (!response.ok) {
        return `Error: HTTP ${response.status} ${response.statusText}`
      }

      // 获取响应内容
      const contentType = response.headers.get('content-type') || ''
      const text = await response.text()

      // 根据内容类型处理
      let processedText: string
      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        processedText = htmlToText(text)
      } else {
        // 对于其他文本类型，直接使用
        processedText = text
      }

      // 截断内容
      const truncatedText = truncateText(processedText, maxLength)

      // 构建输出
      let result = `URL: ${url}\n`
      result += `Content-Type: ${contentType}\n`
      result += `Length: ${processedText.length} characters\n`
      result += '---\n'
      result += truncatedText

      return result
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return `Error: Request timed out after ${DEFAULT_TIMEOUT_MS / 1000} seconds`
        }
        return `Error fetching URL: ${error.message}`
      }
      
      return `Error fetching URL: ${String(error)}`
    }
  },
}
