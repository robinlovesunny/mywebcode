/**
 * AI 技能生成 - 提示词模板和解析工具
 */
import type { SkillConfig } from './types'

/**
 * 系统提示词：指导 AI 生成符合 SkillConfig 结构的 JSON
 */
export const SKILL_GENERATE_SYSTEM_PROMPT = `你是一个 AI Agent 技能生成器。你的任务是根据用户的需求描述，生成一个完整的技能配置。

技能配置是一个 JSON 对象，包含以下字段：

{
  "name": "kebab-case-name",        // 必填，技能唯一标识，必须使用 kebab-case（如 "react-component-generator"）
  "displayName": "显示名称",         // 必填，人类可读的名称（如 "React 组件生成器"）
  "description": "功能描述",         // 必填，简要说明技能的功能（1-2句话）
  "whenToUse": "触发条件",           // 选填，描述何时应该使用这个技能
  "allowedTools": ["tool1", "tool2"], // 选填，该技能允许使用的工具列表
  "arguments": [],                    // 选填，技能接受的参数名列表
  "argumentHint": "",                 // 选填，参数使用提示
  "userInvocable": true,             // 选填，用户是否可手动调用，默认 true
  "version": "1.0.0",               // 选填，版本号
  "paths": [],                       // 选填，条件激活的文件路径 glob 模式
  "context": "inline",              // 选填，执行模式："inline"（内联）或 "fork"（子进程）
  "content": "# 技能指令\\n\\n..."   // 必填，技能的 Markdown 格式指令内容
}

## 可用工具名称

以下是该系统中可用的工具，请根据技能需求合理选择 allowedTools：

- FileReadTool: 读取文件内容
- FileWriteTool: 创建或覆盖写入文件
- FileEditTool: 基于字符串替换编辑文件
- BashTool: 执行 Shell 命令
- GlobTool: 基于 glob 模式搜索文件
- GrepTool: 基于正则搜索文件内容
- WebFetchTool: 获取网页内容
- WebSearchTool: 网络搜索
- ListDirectoryTool: 列出目录内容
- AskUserTool: 向用户提问
- FileDiffTool: 计算文件差异
- CodeStatsTool: 代码分析和统计

## 技能内容编写指南

content 字段是技能的核心，应该用 Markdown 格式编写，包含：

1. 一级标题说明技能名称
2. 清晰的步骤说明，指导 AI 如何执行该技能
3. 必要的约束和规范
4. 输出格式要求（如有）
5. 示例（如有帮助）

## 输出要求

- 请直接输出一个有效的 JSON 对象，不要添加任何额外解释
- 用 \`\`\`json 代码块包裹
- 确保 JSON 格式正确，可以被直接解析
- name 字段必须是 kebab-case 格式
- content 字段的换行使用 \\n

## 示例输出

\`\`\`json
{
  "name": "git-commit-helper",
  "displayName": "Git 提交助手",
  "description": "根据代码变更自动生成规范的 Git commit message",
  "whenToUse": "当用户请求生成 commit message 或需要提交代码时使用",
  "allowedTools": ["BashTool", "FileReadTool", "GrepTool"],
  "userInvocable": true,
  "version": "1.0.0",
  "context": "inline",
  "content": "# Git 提交助手\\n\\n## 执行步骤\\n\\n1. 运行 \`git status\` 和 \`git diff --staged\` 查看当前变更\\n2. 分析变更的文件和内容，理解修改意图\\n3. 根据 Conventional Commits 规范生成 commit message\\n4. 格式：\`<type>(<scope>): <subject>\`\\n\\n## 类型说明\\n- feat: 新功能\\n- fix: 修复 bug\\n- docs: 文档更新\\n- style: 代码格式\\n- refactor: 重构\\n- test: 测试\\n- chore: 构建/工具"
}
\`\`\``

/**
 * 防御性 JSON 解析：从 AI 回复文本中提取并解析 SkillConfig
 */
export function parseSkillFromAIResponse(text: string): SkillConfig {
  let parsed: any = null

  // 策略1：直接尝试 JSON.parse
  try {
    parsed = JSON.parse(text.trim())
  } catch {
    // 策略2：尝试提取 ```json ... ``` 代码块
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim())
      } catch {
        // 继续尝试
      }
    }

    // 策略3：找到第一个 { 和最后一个 } 之间的内容
    if (!parsed) {
      const firstBrace = text.indexOf('{')
      const lastBrace = text.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(text.substring(firstBrace, lastBrace + 1))
        } catch {
          // 所有策略都失败了
        }
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('无法从 AI 回复中解析出有效的 JSON 对象')
  }

  // 验证必填字段
  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('生成的技能缺少 name 字段')
  }
  if (!parsed.description || typeof parsed.description !== 'string') {
    throw new Error('生成的技能缺少 description 字段')
  }
  if (!parsed.content || typeof parsed.content !== 'string') {
    throw new Error('生成的技能缺少 content 字段')
  }

  // 构建规范化的 SkillConfig
  const skill: SkillConfig = {
    name: parsed.name.trim(),
    displayName: parsed.displayName || parsed.name,
    description: parsed.description.trim(),
    whenToUse: parsed.whenToUse || '',
    allowedTools: Array.isArray(parsed.allowedTools) ? parsed.allowedTools : [],
    arguments: Array.isArray(parsed.arguments) ? parsed.arguments : [],
    argumentHint: parsed.argumentHint || '',
    userInvocable: parsed.userInvocable ?? true,
    version: parsed.version || '1.0.0',
    paths: Array.isArray(parsed.paths) ? parsed.paths : [],
    context: parsed.context === 'fork' ? 'fork' : 'inline',
    content: parsed.content.trim(),
    enabled: true,
    source: 'user',
  }

  return skill
}
