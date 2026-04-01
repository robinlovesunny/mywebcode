/**
 * WebSearch Tool - 网页搜索工具
 * 
 * 使用 DuckDuckGo 搜索网页
 */

import type { SimpleTool, ToolContext } from './types'

// 默认超时时间（30秒）
const DEFAULT_TIMEOUT_MS = 30000

// 默认最大结果数
const DEFAULT_MAX_RESULTS = 5

// DuckDuckGo HTML 搜索 URL
const DUCKDUCKGO_SEARCH_URL = 'https://html.duckduckgo.com/html/'

// User-Agent
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * 搜索结果项
 */
interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * 解码 HTML 实体
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * 清理文本（去除多余空白）
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 从 DuckDuckGo HTML 搜索结果页面解析搜索结果
 */
function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  
  // DuckDuckGo HTML 页面的结果格式：
  // <a class="result__a" href="...">Title</a>
  // <a class="result__snippet">Snippet text</a>
  // 或者
  // <div class="result__body">
  //   <a class="result__a" href="...">Title</a>
  //   ...
  //   <a class="result__snippet">...</a>
  // </div>

  // 匹配结果区块
  const resultBlockRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*class="[^"]*result[^"]*"|<\/div>\s*<\/div>\s*$)/gi
  
  // 简化方案：直接匹配链接和摘要
  // 匹配标题链接
  const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  // 匹配摘要
  const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
  
  // 收集所有标题
  const titles: { url: string; title: string }[] = []
  let titleMatch
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    let url = titleMatch[1]
    const title = cleanText(decodeHtmlEntities(titleMatch[2].replace(/<[^>]+>/g, '')))
    
    // DuckDuckGo 使用重定向 URL，尝试提取真实 URL
    const uddgMatch = url.match(/uddg=([^&]+)/)
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1])
      } catch {
        // 保持原 URL
      }
    }
    
    if (title && url && !url.includes('duckduckgo.com')) {
      titles.push({ url, title })
    }
  }
  
  // 收集所有摘要
  const snippets: string[] = []
  let snippetMatch
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const snippet = cleanText(decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '')))
    if (snippet) {
      snippets.push(snippet)
    }
  }
  
  // 组合结果
  const count = Math.min(titles.length, snippets.length, maxResults)
  for (let i = 0; i < count; i++) {
    results.push({
      title: titles[i].title,
      url: titles[i].url,
      snippet: snippets[i],
    })
  }
  
  return results
}

/**
 * 格式化搜索结果
 */
function formatResults(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`
  }
  
  let output = `Search results for: "${query}"\n`
  output += `Found ${results.length} result(s)\n`
  output += '---\n\n'
  
  results.forEach((result, index) => {
    output += `${index + 1}. ${result.title}\n`
    output += `   URL: ${result.url}\n`
    output += `   ${result.snippet}\n\n`
  })
  
  return output.trim()
}

export const WebSearchTool: SimpleTool = {
  name: 'web_search',
  description: `Search the web using DuckDuckGo.

Parameters:
- query (required): The search query
- max_results (optional): Maximum number of results to return (default: 5)

Returns a list of search results with title, URL, and snippet for each result.
No API key required - uses DuckDuckGo's HTML search interface.`,

  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      max_results: {
        type: 'integer',
        description: 'Maximum number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },

  async call(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
    const query = input.query as string
    const maxResults = (input.max_results as number) || DEFAULT_MAX_RESULTS

    if (!query) {
      return 'Error: query is required'
    }

    if (query.length > 500) {
      return 'Error: Query is too long (maximum 500 characters)'
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      // 构建搜索 URL
      const searchParams = new URLSearchParams({
        q: query,
        kl: 'wt-wt', // 全球区域
      })

      const response = await fetch(`${DUCKDUCKGO_SEARCH_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return `Error: Search request failed with status ${response.status}`
      }

      const html = await response.text()
      
      // 解析搜索结果
      const results = parseSearchResults(html, maxResults)
      
      // 格式化输出
      return formatResults(results, query)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return `Error: Search request timed out after ${DEFAULT_TIMEOUT_MS / 1000} seconds`
        }
        return `Error performing search: ${error.message}`
      }
      
      return `Error performing search: ${String(error)}`
    }
  },
}
