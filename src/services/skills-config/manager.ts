/**
 * Skills 配置管理器
 */
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { SkillsConfig, SkillConfig, SkillInput, SkillFrontmatter, SkillSource } from './types'

const CONFIG_DIR = path.join(os.homedir(), '.ai-agent')
const SKILLS_CONFIG_FILE = path.join(CONFIG_DIR, 'skills.json')
const SKILLS_DIR = path.join(CONFIG_DIR, 'skills')

/** 获取默认配置 */
function getDefaultConfig(): SkillsConfig {
  return {
    skills: {},
    skillPaths: [SKILLS_DIR]
  }
}

/** 确保配置目录存在 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

/** 确保技能目录存在 */
function ensureSkillsDir(): void {
  ensureConfigDir()
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true })
  }
}

/** 解析 SKILL.md 的 frontmatter */
function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content }
  }
  
  const frontmatterStr = frontmatterMatch[1]
  const body = frontmatterMatch[2]
  const frontmatter: SkillFrontmatter = {}
  
  // 简单的 YAML 解析
  const lines = frontmatterStr.split('\n')
  let currentKey: string | null = null
  let currentArray: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // 数组项
    if (trimmed.startsWith('- ') && currentKey) {
      currentArray.push(trimmed.slice(2).trim())
      continue
    }
    
    // 保存之前的数组
    if (currentKey && currentArray.length > 0) {
      (frontmatter as any)[currentKey] = currentArray
      currentArray = []
    }
    
    // 键值对
    const match = trimmed.match(/^(\w+):\s*(.*)$/)
    if (match) {
      const key = match[1]
      const value = match[2].trim()
      
      if (value === '' || value === '|') {
        // 可能是数组或多行字符串
        currentKey = key
      } else if (value === 'true' || value === 'false') {
        (frontmatter as any)[key] = value === 'true'
        currentKey = null
      } else {
        (frontmatter as any)[key] = value.replace(/^["']|["']$/g, '')
        currentKey = null
      }
    }
  }
  
  // 处理最后一个数组
  if (currentKey && currentArray.length > 0) {
    (frontmatter as any)[currentKey] = currentArray
  }
  
  return { frontmatter, body }
}

export class SkillsConfigManager {
  /**
   * 加载所有技能配置
   */
  loadConfig(): SkillsConfig {
    try {
      if (fs.existsSync(SKILLS_CONFIG_FILE)) {
        const content = fs.readFileSync(SKILLS_CONFIG_FILE, 'utf-8')
        const config = JSON.parse(content) as SkillsConfig
        return {
          skills: config.skills || {},
          skillPaths: config.skillPaths || [SKILLS_DIR]
        }
      }
    } catch (error) {
      console.warn('Failed to load Skills config:', error)
    }
    return getDefaultConfig()
  }

  /**
   * 保存配置
   */
  saveConfig(config: SkillsConfig): void {
    try {
      ensureConfigDir()
      fs.writeFileSync(SKILLS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save Skills config:', error)
      throw error
    }
  }

  /**
   * 添加技能
   */
  addSkill(skill: SkillConfig): void {
    if (!skill.name || !skill.name.trim()) {
      throw new Error('Skill name is required')
    }
    
    const config = this.loadConfig()
    
    if (config.skills[skill.name]) {
      throw new Error(`Skill "${skill.name}" already exists`)
    }
    
    config.skills[skill.name] = skill
    this.saveConfig(config)
  }

  /**
   * 删除技能
   */
  removeSkill(name: string): boolean {
    const config = this.loadConfig()
    
    if (!config.skills[name]) {
      return false
    }
    
    delete config.skills[name]
    this.saveConfig(config)
    return true
  }

  /**
   * 更新技能
   */
  updateSkill(name: string, updates: Partial<SkillConfig>): void {
    const config = this.loadConfig()
    
    if (!config.skills[name]) {
      throw new Error(`Skill "${name}" not found`)
    }
    
    // 如果更新了 name，需要移动配置
    if (updates.name && updates.name !== name) {
      const newName = updates.name
      if (config.skills[newName]) {
        throw new Error(`Skill "${newName}" already exists`)
      }
      
      config.skills[newName] = {
        ...config.skills[name],
        ...updates
      }
      delete config.skills[name]
    } else {
      config.skills[name] = {
        ...config.skills[name],
        ...updates,
        name // 确保 name 保持一致
      }
    }
    
    this.saveConfig(config)
  }

  /**
   * 启用/禁用技能
   */
  setSkillEnabled(name: string, enabled: boolean): void {
    this.updateSkill(name, { enabled })
  }

  /**
   * 获取所有技能列表
   */
  getSkills(): SkillConfig[] {
    const config = this.loadConfig()
    return Object.values(config.skills)
  }

  /**
   * 获取单个技能
   */
  getSkill(name: string): SkillConfig | undefined {
    const config = this.loadConfig()
    return config.skills[name]
  }

  /**
   * 扫描技能目录（从文件系统加载 SKILL.md）
   */
  scanSkillsDirectory(dir: string, source: SkillSource = 'user'): SkillConfig[] {
    const skills: SkillConfig[] = []
    
    if (!fs.existsSync(dir)) {
      return skills
    }
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillDir = path.join(dir, entry.name)
          const skillFile = path.join(skillDir, 'SKILL.md')
          
          if (fs.existsSync(skillFile)) {
            try {
              const content = fs.readFileSync(skillFile, 'utf-8')
              const { frontmatter, body } = parseFrontmatter(content)
              
              skills.push({
                name: entry.name,
                displayName: frontmatter.displayName,
                description: frontmatter.description || '',
                whenToUse: frontmatter.whenToUse,
                allowedTools: frontmatter.allowedTools,
                arguments: frontmatter.arguments,
                argumentHint: frontmatter.argumentHint,
                userInvocable: frontmatter.userInvocable ?? true,
                version: frontmatter.version,
                paths: frontmatter.paths,
                context: frontmatter.context,
                content: body.trim(),
                enabled: true,
                source
              })
            } catch (err) {
              console.warn(`Failed to parse skill ${entry.name}:`, err)
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan skills directory ${dir}:`, error)
    }
    
    return skills
  }

  /**
   * 扫描所有配置的技能路径
   */
  scanAllSkillsPaths(): SkillConfig[] {
    const config = this.loadConfig()
    const allSkills: SkillConfig[] = []
    
    for (const skillPath of config.skillPaths) {
      const skills = this.scanSkillsDirectory(skillPath)
      allSkills.push(...skills)
    }
    
    return allSkills
  }

  /**
   * 添加技能搜索路径
   */
  addSkillPath(skillPath: string): void {
    const config = this.loadConfig()
    
    if (!config.skillPaths.includes(skillPath)) {
      config.skillPaths.push(skillPath)
      this.saveConfig(config)
    }
  }

  /**
   * 移除技能搜索路径
   */
  removeSkillPath(skillPath: string): boolean {
    const config = this.loadConfig()
    const index = config.skillPaths.indexOf(skillPath)
    
    if (index > -1) {
      config.skillPaths.splice(index, 1)
      this.saveConfig(config)
      return true
    }
    
    return false
  }

  /**
   * 获取技能目录路径
   */
  getSkillsDir(): string {
    return SKILLS_DIR
  }
}

// 导出单例
export const skillsConfigManager = new SkillsConfigManager()
