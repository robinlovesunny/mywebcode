/**
 * Skills 配置类型定义
 */

// 技能执行模式
export type SkillContext = 'inline' | 'fork'

// 技能来源
export type SkillSource = 'user' | 'project'

// 技能定义
export interface SkillConfig {
  name: string              // 技能唯一标识（目录名）
  displayName?: string      // 显示名称
  description: string       // 功能描述
  whenToUse?: string        // 自动触发条件
  allowedTools?: string[]   // 权限列表
  arguments?: string[]      // 参数名列表
  argumentHint?: string     // 参数使用提示
  userInvocable?: boolean   // 用户可手动调用（默认 true）
  version?: string          // 版本号
  paths?: string[]          // 条件激活路径
  context?: SkillContext    // 执行模式
  content: string           // Markdown 内容
  enabled: boolean          // 是否启用
  source: SkillSource       // 来源
}

// 技能配置文件格式
export interface SkillsConfig {
  skills: Record<string, SkillConfig>
  skillPaths: string[]      // 技能搜索路径
}

// 技能创建/更新时的输入类型（不含 name）
export type SkillInput = Omit<SkillConfig, 'name'>

// SKILL.md 文件的 frontmatter 结构
export interface SkillFrontmatter {
  displayName?: string
  description?: string
  whenToUse?: string
  allowedTools?: string[]
  arguments?: string[]
  argumentHint?: string
  userInvocable?: boolean
  version?: string
  paths?: string[]
  context?: SkillContext
}
